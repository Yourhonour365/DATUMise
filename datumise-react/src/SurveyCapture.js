import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Modal } from "react-bootstrap";
import heic2any from "heic2any";
import { detailMobileUrl, lightboxUrl } from "./imageUtils";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";

// Statuses in which a survey session is actively in progress.
// "live" is the legacy/compat value; "assigned" is the stored DB value
// returned once the backend compatibility layer is removed.
const ACTIVE_SESSION_STATUSES = ["live", "assigned"];

// Session-lifecycle PATCH value for pausing.
// "paused" is a legacy string required because views.py perform_update
// triggers session pause only for requested_status == "paused".
// PHASE 6B: Replace with PATCH /api/sessions/:id/ { status: "paused" }.
const PATCH_PAUSE_SESSION = "paused";

function SurveyCapture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [durationTick, setDurationTick] = useState(0);
  const [successMessage, setSuccessMessage] = useState(false);
  const [actionBarEl, setActionBarEl] = useState(null);
  const [viewingIndex, setViewingIndex] = useState(null);
  const [editingField, setEditingField] = useState(null); // "title" | "description" | null
  const [editValue, setEditValue] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const navStackRef = useRef([]); // navigation stack: each entry is {viewingIndex, editingField, editValue, notesOpen}
  const initialNavDoneRef = useRef(false); // prevent fetchSurvey refreshes from resetting viewingIndex
  const listOpenFromStateRef = useRef({});
  const [openNotesTrigger, setOpenNotesTrigger] = useState(0);
  const autoSaveDraftRef = useRef(null); // set by ObservationCreateForm
  const observationsRef = useRef([]); // always-current copy for use in event handlers
  const [pauseCountdown, setPauseCountdown] = useState(null);
  const [draftIncomplete, setDraftIncomplete] = useState(false);
  const pauseTimerRef = useRef(null);
  const [showPreviewImageModal, setShowPreviewImageModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const previewFileInputRef = useRef(null);
  const modalClosedAtRef = useRef(0);
  const [showObsListModal, setShowObsListModal] = useState(false);
  const [listSelectMode, setListSelectMode] = useState(false);
  const [listSelectedObs, setListSelectedObs] = useState(new Set());
  const [copiedToDraft, setCopiedToDraft] = useState(false);
  const [draftHasTitle, setDraftHasTitle] = useState(false);
  const [draftHasImage, setDraftHasImage] = useState(false);
  const [previewImageChanged, setPreviewImageChanged] = useState(false);
  const [hasPendingPreview, setHasPendingPreview] = useState(false);
  const pendingPreviewFileRef = useRef(null);
  const pendingPreviewUrlRef = useRef(null);
  const originalPreviewUrlRef = useRef(null);

  const fetchSurvey = async () => {
    try {
      const response = await api.get(`/api/surveys/${id}/`);
      setSurvey(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.backgroundColor = "#E2DDD3";
    return () => { document.body.style.backgroundColor = ""; };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setLoading(false);
      return;
    }
    fetchSurvey();
  }, [id]);

  // Navigate to specific obs, resume position, or auto-open any draft obs
  useEffect(() => {
    if (!survey?.observations) return;
    const targetId = location.state?.viewObservationId || localStorage.getItem(`datumise-capture-pos-${id}`);
    if (targetId) {
      const idx = survey.observations.findIndex((obs) => obs.id === Number(targetId) || obs.id === targetId);
      if (idx !== -1) setViewingIndex(idx);
      localStorage.removeItem(`datumise-capture-pos-${id}`);
      initialNavDoneRef.current = true;
      return;
    }
    // Only auto-navigate to draft on initial load — not on fetchSurvey refreshes after edits
    if (initialNavDoneRef.current) return;
    initialNavDoneRef.current = true;
    // Auto-navigate to any existing draft observation
    const draftIdx = survey.observations.findIndex((obs) => obs.is_draft);
    if (draftIdx !== -1) setViewingIndex(draftIdx);
  }, [survey?.observations, location.state?.viewObservationId, id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDurationTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save draft and auto-pause when user backgrounds or closes the app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && ACTIVE_SESSION_STATUSES.includes(survey?.status)) {
        if (!observationsRef.current.some((o) => o.is_draft)) {
          autoSaveDraftRef.current?.(); // fire and forget
        }
        api.patch(`/api/surveys/${id}/`, { status: PATCH_PAUSE_SESSION }).catch(() => {});
      }
    };
    const handleBeforeUnload = () => {
      if (!observationsRef.current.some((o) => o.is_draft)) {
        autoSaveDraftRef.current?.(); // fire and forget
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [survey?.status, id]);

  const formatSurveyDuration = (startTime, _tick) => {
    if (!startTime) return "";
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const startPauseCountdown = () => {
    if (pauseCountdown !== null || pauseTimerRef.current) return;
    setPauseCountdown(15);
    let count = 15;
    pauseTimerRef.current = setInterval(() => {
      count -= 1;
      setPauseCountdown(count);
      if (count <= 0) {
        clearInterval(pauseTimerRef.current);
        pauseTimerRef.current = null;
        executePause();
      }
    }, 1000);
  };

  const cancelPauseCountdown = () => {
    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    setPauseCountdown(null);
  };

  const executePause = async () => {
    setPauseCountdown(null);
    // Auto-save only if no draft obs already exists in the survey
    if (!observations.some((o) => o.is_draft) && autoSaveDraftRef.current) {
      await autoSaveDraftRef.current();
    }
    if (viewingIndex !== null && observations[viewingIndex]) {
      localStorage.setItem(`datumise-capture-pos-${id}`, observations[viewingIndex].id);
    } else {
      localStorage.removeItem(`datumise-capture-pos-${id}`);
    }
    try {
      await api.patch(`/api/surveys/${id}/`, { status: PATCH_PAUSE_SESSION });
    } catch (err) {
      console.log(err);
    }
    navigate(`/surveys/${id}`, { replace: true });
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    };
  }, []);

  const returnPath = location.state?.returnPath || `/surveys/${id}`;
  const returnObsId = location.state?.viewObservationId;

  const goBack = () => {
    navigate(returnPath, { state: { scrollToObservation: returnObsId } });
  };

  const closeSurvey = () => {
    if (ACTIVE_SESSION_STATUSES.includes(survey?.status)) {
      executePause();
    } else {
      goBack();
    }
  };

  const handleSuccess = (newObservation) => {
    // Delete any existing draft obs now that a confirmed obs has been submitted
    const draftObs = (survey?.observations || []).find((o) => o.is_draft);
    if (draftObs) {
      api.delete(`/api/observations/${draftObs.id}/`).catch(console.error);
    }
    setDraftIncomplete(false);
    setViewingIndex(null);
    setSuccessMessage(false);
    setTimeout(() => setSuccessMessage(true), 100);
    setTimeout(() => setSuccessMessage(false), 3000);
    fetchSurvey();
  };

  const observations = survey?.observations || [];
  observationsRef.current = observations;
  const viewedObservation = viewingIndex !== null ? observations[viewingIndex] : null;


  const viewedObsIncomplete = viewedObservation && (!viewedObservation.image || !viewedObservation.title?.trim());
  const anyIncomplete = viewingIndex !== null ? viewedObsIncomplete : draftIncomplete;

  // observations array is newest-first (API ordering = -created_at)
  // Back = toward older (higher index), Forward = toward newer (lower index)
  const canStepBack = viewingIndex === null
    ? observations.length > 0
    : viewingIndex < observations.length - 1;

  const canStepForward = viewingIndex !== null && (
    viewingIndex === 0 || !observations[viewingIndex - 1]?.is_draft
  );

  const resetEditState = () => {
    if (editingField !== null) modalClosedAtRef.current = Date.now();
    setEditingField(null);
    setEditValue("");
  };

  // List navigation model:
  // - openObsList saves full current state to listOpenFromStateRef
  // - clicking an obs from the list pushes {fromList:true} onto navStackRef, closes list
  // - onReturnToCurrent: if fromList, reopens list (restoring listOpenFromStateRef for close)
  // - closeObsList restores the full pre-list state from listOpenFromStateRef
  const openObsList = (fromState = {}) => {
    listOpenFromStateRef.current = {
      viewingIndex,
      editingField,
      editValue,
      notesOpen: fromState.notesOpen || false,
      previewImageOpen: showPreviewImageModal,
    };
    setShowObsListModal(true);
  };
  const closeObsList = () => {
    const saved = listOpenFromStateRef.current;
    listOpenFromStateRef.current = {};
    setShowObsListModal(false);
    if (saved.viewingIndex !== undefined) setViewingIndex(saved.viewingIndex);
    if (saved.editingField) {
      setEditingField(saved.editingField);
      setEditValue(saved.editValue || "");
    }
    if (saved.notesOpen) setOpenNotesTrigger(t => t + 1);
    if (saved.previewImageOpen && saved.viewingIndex !== undefined) {
      const obs = observations[saved.viewingIndex];
      if (obs?.image) {
        setPreviewImageUrl(lightboxUrl(obs));
        setPreviewImageChanged(false);
        setHasPendingPreview(false);
        setShowPreviewImageModal(true);
      }
    }
  };

  const handleStepBack = () => {
    if (Date.now() - modalClosedAtRef.current < 400) return;
    resetEditState();
    if (viewingIndex === null) {
      if (observations.length > 0) setViewingIndex(0);
    } else if (viewingIndex < observations.length - 1) {
      setViewingIndex(viewingIndex + 1);
    }
  };

  const handleStepForward = () => {
    if (Date.now() - modalClosedAtRef.current < 400) return;
    resetEditState();
    if (viewingIndex !== null) {
      if (viewingIndex > 0) {
        setViewingIndex(viewingIndex - 1);
      } else {
        navStackRef.current = [];
        setViewingIndex(null);
      }
    }
  };

  const saveField = async () => {
    const field = editingField;
    const value = editValue.trim();
    if (!viewedObservation || !field) return;
    setIsSavingEdit(true);
    try {
      await api.patch(`/api/observations/${viewedObservation.id}/`, {
        [field]: value,
      });
      setSurvey((prev) => ({
        ...prev,
        observations: prev.observations.map((obs) =>
          obs.id === viewedObservation.id ? { ...obs, [field]: value } : obs
        ),
      }));
      resetEditState();
    } catch (err) {
      console.error("Failed to update observation:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteObservation = async () => {
    if (!viewedObservation) return;
    const parts = ["Delete this observation?"];
    const counts = [];
    if (viewedObservation.comment_count) counts.push(`${viewedObservation.comment_count} comment${viewedObservation.comment_count > 1 ? "s" : ""}`);
    if (viewedObservation.likes_count) counts.push(`${viewedObservation.likes_count} like${viewedObservation.likes_count > 1 ? "s" : ""}`);
    if (counts.length) parts.push(`It has ${counts.join(" and ")} that will also be removed.`);
    const confirmed = window.confirm(parts.join(" "));
    if (!confirmed) return;
    try {
      await api.delete(`/api/observations/${viewedObservation.id}/`);
      setSurvey((prev) => ({
        ...prev,
        observations: prev.observations.filter((obs) => obs.id !== viewedObservation.id),
      }));
      setViewingIndex(null);
      setCopiedToDraft(false);
      resetEditState();
    } catch (err) {
      console.error("Failed to delete observation:", err);
    }
  };


  if (loading) return <p className="container mt-4">Loading survey...</p>;
  if (!survey) return <p className="container mt-4">Survey not found.</p>;

  return (
    <div className="survey-capture">
      {pauseCountdown !== null && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(44, 62, 80, 0.92)", zIndex: 9999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "1.5rem",
        }}>
          <div style={{ color: "#faf6ef", fontSize: "1.1rem", fontWeight: 500 }}>
            Pausing survey in
          </div>
          <div style={{ color: "#fef0e0", fontSize: "3.5rem", fontWeight: 700, lineHeight: 1 }}>
            {pauseCountdown}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); cancelPauseCountdown(); }}
            className="capture-action-btn"
            style={{ background: "#d3212f", border: "none", width: "56px", height: "56px", marginTop: "1rem", position: "relative", zIndex: 1 }}
          >
            <img src="/datumise-cancel.svg" alt="Cancel" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
          <div
            onClick={(e) => { e.stopPropagation(); cancelPauseCountdown(); }}
            style={{ color: "#faf6ef", fontSize: "0.95rem", marginTop: "0.5rem", cursor: "pointer" }}
          >
            Tap to cancel
          </div>
        </div>
      )}
      <div className="survey-capture-header">
        <div>
          {viewingIndex !== null && !viewedObservation?.is_draft && (
            <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontWeight: 700, fontSize: "1.35rem", lineHeight: 1.2, pointerEvents: "none", whiteSpace: "nowrap" }}>
              {observations.length - viewingIndex} of {observations.length}
            </span>
          )}
          <div className="fw-semibold" style={{ fontSize: "1.1rem", lineHeight: 1.2 }}>
            {viewingIndex !== null
              ? viewedObservation?.is_draft
                ? (() => {
                    const dd = new Date(viewedObservation.created_at);
                    const dh = dd.getHours();
                    const dm = String(dd.getMinutes()).padStart(2, "0");
                    return <span style={{ color: "#db440a", fontWeight: 700, letterSpacing: "0.03em" }}>DRAFT {`${dh % 12 || 12}:${dm}${dh < 12 ? "am" : "pm"}`}</span>;
                  })()
                : null
              : (draftHasImage || draftHasTitle)
                ? (() => {
                    const savedDraft = observations.find(o => o.is_draft);
                    if (savedDraft) {
                      const dd = new Date(savedDraft.created_at);
                      const dh = dd.getHours();
                      const dm = String(dd.getMinutes()).padStart(2, "0");
                      return <span style={{ color: "#db440a", fontWeight: 700, letterSpacing: "0.03em" }}>DRAFT {`${dh % 12 || 12}:${dm}${dh < 12 ? "am" : "pm"}`}</span>;
                    }
                    return <span style={{ color: "#db440a", fontWeight: 700, letterSpacing: "0.03em" }}>DRAFT Observation</span>;
                  })()
                : `NEW Observation`}
          </div>
          <div style={{ fontSize: "0.72rem", position: "relative", minHeight: "0.9rem" }}>
            <span
              className="text-muted d-inline-flex align-items-center"
              style={{
                opacity: successMessage ? 0 : 1,
                transition: "opacity 0.9s ease",
                position: "absolute",
                left: 0,
                top: 0,
                gap: "0.35em",
                whiteSpace: "nowrap",
                fontStyle: viewingIndex !== null ? "italic" : "normal",
              }}
            >
              {viewingIndex !== null ? (
                <>
                  {survey.site_name || survey.site || ""}{" \u00B7 "}
                  {!viewedObservation?.is_draft && <>{viewedObservation && new Date(viewedObservation.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{" \u00B7 "}</>}
                  {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </>
              ) : (
                <>
                  {survey.site_name || survey.site || ""}{" \u00B7 "}
                  {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{" \u00B7 "}
                  {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  <img src="/datumise_timer.svg" alt="" width="11" height="11" style={{ opacity: 0.55 }} />
                  {formatSurveyDuration(survey.created_at, durationTick)}
                </>
              )}
            </span>
            <span
              className="text-success fw-light"
              style={{
                opacity: successMessage ? 1 : 0,
                transition: "opacity 0.9s ease",
                position: "absolute",
                left: 0,
                top: 0,
              }}
            >
              Observation Added
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          onClick={closeSurvey}
          style={{ transform: "scale(0.85)", marginLeft: "auto" }}
        />
      </div>

      <div className="survey-capture-body">
        {viewedObservation && (
          <div>
            <div className="prior-obs-container d-flex flex-column" style={{ gap: "0.75rem" }}>
              {/* Image block */}
              <div
                className="prior-obs-image"
                onClick={() => {
                  if (viewedObservation.image) {
                    originalPreviewUrlRef.current = lightboxUrl(viewedObservation);
                    pendingPreviewFileRef.current = null;
                    pendingPreviewUrlRef.current = null;
                    setHasPendingPreview(false);
                    setPreviewImageUrl(lightboxUrl(viewedObservation));
                    setPreviewImageChanged(false);
                    setShowPreviewImageModal(true);
                  } else {
                    previewFileInputRef.current?.click();
                  }
                }}
                style={{
                  borderRadius: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  overflow: "hidden",
                  backgroundColor: "#687374",
                }}
              >
                {viewedObservation.image ? (
                  <img src={detailMobileUrl(viewedObservation)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="d-flex flex-column align-items-center gap-2">
                    <span className="text-center" style={{ color: "#faf6ef", fontSize: "1.1rem", fontWeight: 600 }}>Awaiting image</span>
                    <img src="/datumise-add.svg" alt="" width="28" height="28" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)", opacity: 0.8 }} />
                  </div>
                )}
              </div>

              {/* Observation block */}
              {viewedObservation.title?.trim() ? (
                <div style={{ width: "100%" }}>
                  <div style={{ backgroundColor: "#FAF8F3", backgroundImage: "linear-gradient(transparent calc(100% - 1px), #cce8f5 calc(100% - 1px)), linear-gradient(90deg, transparent 14px, #ffd6d6 14px, #ffd6d6 15px, transparent 15px)", backgroundSize: "100% 24px, 100% 100%", backgroundPosition: "0 -2px, 0 0", padding: "0 0.4rem 0.4rem 19px", borderRadius: "2px", cursor: "pointer" }}
                    onClick={() => { setEditingField("title"); setEditValue(viewedObservation.title || ""); }}
                  >
                    <div style={{ lineHeight: "1.5", fontSize: "16px", fontWeight: 500, color: "#1A1D21", overflowWrap: "break-word", wordBreak: "normal", whiteSpace: "pre-line", height: "calc(6 * 1.5 * 16px)", overflow: "hidden" }}>
                      {viewedObservation.title}
                    </div>
                  </div>
                  {copiedToDraft ? (
                    <button
                      type="button"
                      className="w-100 text-center"
                      style={{ background: "#006400", color: "#faf6ef", padding: "0.85rem", fontSize: "0.98rem", fontWeight: 600, fontStyle: "italic", border: "none", borderRadius: 0, cursor: "pointer" }}
                      onClick={() => {
                        resetEditState();
                        setCopiedToDraft(false);
                        const draftIdx = observations.findIndex((o) => o.is_draft);
                        setViewingIndex(draftIdx !== -1 ? draftIdx : null);
                      }}
                    >
                      Copied to draft - tap tick to confirm
                    </button>
                  ) : viewedObservation.image && !viewedObservation.is_draft ? (
                    <div style={{ display: "flex", borderRadius: 0 }}>
                      <button
                        type="button"
                        onClick={handleDeleteObservation}
                        style={{ background: "#95a5a6", color: "#faf6ef", border: "none", padding: "0.85rem 0.7rem", cursor: "pointer", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#d3212f"><path d="m20.015 6.506h-16v14.423c0 .591.448 1.071 1 1.071h14c.552 0 1-.48 1-1.071 0-3.905 0-14.423 0-14.423zm-5.75 2.494c.414 0 .75.336.75.75v8.5c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-8.5c0-.414.336-.75.75-.75zm-4.5 0c.414 0 .75.336.75.75v8.5c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-8.5c0-.414.336-.75.75-.75zm-.75-5v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-16.507c-.413 0-.747-.335-.747-.747s.334-.747.747-.747zm4.5 0v-.5h-3v.5z" fillRule="nonzero"/></svg>
                      </button>
                      <button
                        type="button"
                        className="flex-grow-1"
                        style={{ background: "#1a5bc4", color: "#faf6ef", border: "none", padding: "0.85rem", fontSize: "0.98rem", fontWeight: 600, cursor: "pointer", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                        onClick={async () => {
                          const draftObs = observations.find((o) => o.is_draft);
                          if (draftObs) {
                            try {
                              await api.patch(`/api/observations/${draftObs.id}/`, { title: viewedObservation.title });
                              fetchSurvey();
                            } catch (err) {
                              console.error("Failed to copy to draft obs:", err);
                            }
                          } else {
                            const draft = JSON.parse(localStorage.getItem("datumise-observation-draft") || "{}");
                            draft.title = viewedObservation.title;
                            localStorage.setItem("datumise-observation-draft", JSON.stringify(draft));
                          }
                          setCopiedToDraft(true);
                        }}
                      >
                        <img src="/copy.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
                        Copy to draft
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  className="obs-capture-block"
                  onClick={() => { setEditingField("title"); setEditValue(""); }}
                  style={{
                    width: "336px",
                    maxWidth: "100%",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backgroundColor: "#687374",
                    margin: "0 auto",
                  }}
                >
                  <div className="d-flex flex-column align-items-center gap-2">
                    <span className="text-center" style={{ color: "#faf6ef", fontSize: "1.1rem", fontWeight: 600 }}>Awaiting description</span>
                    <img src="/datumise-edit.svg" alt="" width="28" height="28" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)", opacity: 0.8 }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div style={viewingIndex !== null ? { display: "none" } : {}}>
            <ObservationCreateForm
              surveyId={survey.id}
              onPauseSurvey={startPauseCountdown}
              onClose={startPauseCountdown}
              onSuccess={handleSuccess}
              captureMode
              actionBarTarget={actionBarEl}
              anyIncomplete={anyIncomplete}
              onDraftIncomplete={setDraftIncomplete}
              onStepBack={canStepBack && !(viewingIndex !== null ? viewedObsIncomplete : draftIncomplete) ? handleStepBack : null}
              onStepForward={canStepForward && !viewedObsIncomplete ? handleStepForward : null}
              isViewingPrevious={viewingIndex !== null}
              onReturnToCurrent={() => {
                const prev = navStackRef.current.pop();
                resetEditState();
                setCopiedToDraft(false);
                if (prev !== undefined) {
                  if (prev.fromList) {
                    // Came from list — reopen it without changing background state.
                    // closeObsList will restore viewingIndex/editingField when list is dismissed.
                    listOpenFromStateRef.current = {
                      viewingIndex: prev.viewingIndex,
                      editingField: prev.editingField || null,
                      editValue: prev.editValue || "",
                      notesOpen: prev.notesOpen || false,
                      previewImageOpen: prev.previewImageOpen || false,
                    };
                    setShowObsListModal(true);
                  } else {
                    setViewingIndex(prev.viewingIndex);
                    if (prev.editingField) {
                      setEditingField(prev.editingField);
                      setEditValue(prev.editValue);
                    }
                    if (prev.notesOpen) setOpenNotesTrigger(t => t + 1);
                  }
                } else {
                  setViewingIndex(null);
                }
              }}
              onEditPrevious={() => {
                if (viewedObservation) {
                  setEditingField("title");
                  setEditValue(viewedObservation.title || "");
                }
              }}
              previousObsIncomplete={viewingIndex !== null ? viewedObsIncomplete : draftIncomplete}
              previousObsMissingImage={viewingIndex !== null ? (viewedObservation && !viewedObservation.image) : (draftIncomplete && !localStorage.getItem("datumise-observation-image"))}
              previousObsMissingTitle={viewingIndex !== null ? (viewedObservation && !viewedObservation.title?.trim()) : (draftIncomplete && !!localStorage.getItem("datumise-observation-image"))}
              onReturn={goBack}
              onCaptureForPrevious={() => previewFileInputRef.current?.click()}
              observations={observations}
              onShowObsList={(fromState) => openObsList(fromState)}
              openNotesTrigger={openNotesTrigger}
              onCloseObsList={() => closeObsList()}
              obsListOpen={showObsListModal}
              onBecomeVisible={viewingIndex === null}
              copiedToDraft={copiedToDraft}
              onCancelCopy={() => setCopiedToDraft(false)}
              onConfirmCopy={() => {
                navStackRef.current = [];
                resetEditState();
                setCopiedToDraft(false);
                const draftIdx = observations.findIndex((o) => o.is_draft);
                setViewingIndex(draftIdx !== -1 ? draftIdx : null);
              }}
              onDraftStatus={(hasTitle, hasImage) => { setDraftHasTitle(hasTitle); setDraftHasImage(hasImage); }}
              onRegisterAutoSave={(fn) => { autoSaveDraftRef.current = fn; }}
              onDraftSaved={(obs) => {
                setSurvey((prev) => ({
                  ...prev,
                  observations: [obs, ...(prev.observations || [])],
                }));
              }}
              isDraftObs={viewedObservation?.is_draft || false}
              onCompleteDraft={async () => {
                if (!viewedObservation) return;
                try {
                  await api.patch(`/api/observations/${viewedObservation.id}/`, { is_draft: false });
                  fetchSurvey();
                } catch (err) {
                  console.error("Failed to complete draft:", err);
                }
              }}
            />
          </div>
      </div>
      <div className="text-center" style={{
        fontSize: "1rem",
        color: "#db440a",
        padding: "0.4rem 0",
        fontWeight: 700,
        fontStyle: "italic",
        flexShrink: 0,
        background: "#E2DDD3",
        visibility: (viewingIndex === null && ((draftHasTitle && !draftHasImage) || (!draftHasTitle && draftHasImage))) || (viewingIndex !== null && viewedObsIncomplete) ? "visible" : "hidden",
      }}>
        {viewingIndex !== null
          ? (!viewedObservation?.image ? "Add photo to proceed" : "Add description to proceed")
          : (draftHasTitle && !draftHasImage ? "Add photo to proceed" : "Add description to proceed")}
      </div>
      <div className="survey-capture-actions" ref={setActionBarEl} style={showObsListModal ? { position: "relative", zIndex: 1060 } : undefined}>
      </div>

      {/* Hidden file input for changing previous observation image */}
      <input
        ref={previewFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (event) => {
          let file = event.target.files[0];
          if (!file || !viewedObservation) return;
          if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
            try {
              const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
              file = new File([converted], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
            } catch (err) {
              console.error("HEIC conversion failed:", err);
            }
          }
          const previewUrl = URL.createObjectURL(file);
          pendingPreviewFileRef.current = file;
          pendingPreviewUrlRef.current = previewUrl;
          setHasPendingPreview(true);
          setPreviewImageUrl(previewUrl);
          setPreviewImageChanged(true);
          setShowPreviewImageModal(true);
          event.target.value = null;
        }}
      />

      {/* Image preview modal for previous observations */}
      <Modal
        show={showPreviewImageModal}
        onHide={() => setShowPreviewImageModal(false)}
        fullscreen={true}
      >
        <Modal.Body className="p-0 d-flex align-items-center justify-content-center" style={{ background: "#2c3e50", overflow: "hidden", flex: 1 }}>
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Observation"
              style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
            />
          )}
        </Modal.Body>
        <div className="survey-capture-actions">
          <div className="capture-footer-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {/* Button 1: list (plain view) or shift/toggle (comparing) */}
            {hasPendingPreview ? (
              <button
                type="button"
                className="capture-footer-btn"
                aria-label="Toggle image"
                onClick={() => {
                  if (previewImageChanged) {
                    setPreviewImageUrl(originalPreviewUrlRef.current);
                    setPreviewImageChanged(false);
                  } else {
                    setPreviewImageUrl(pendingPreviewUrlRef.current);
                    setPreviewImageChanged(true);
                  }
                }}
                style={{ background: "#1a5bc4" }}
              >
                <img src="/shift.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
              </button>
            ) : (
              <button
                type="button"
                className="capture-footer-btn"
                aria-label="Observations list"
                onClick={() => { setShowPreviewImageModal(false); openObsList(); }}
                style={{ background: "#008080" }}
              >
                <img src="/datumise-observations.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
              </button>
            )}
            {/* Button 2: navigate to newer observation */}
            {(() => {
              const canGoNewer = viewingIndex !== null && viewingIndex > 0 && !observations[viewingIndex - 1]?.is_draft;
              return (
                <button
                  type="button"
                  className="capture-footer-btn"
                  aria-label="Newer observation"
                  disabled={!canGoNewer}
                  onClick={() => {
                    if (!canGoNewer) return;
                    const newIdx = viewingIndex - 1;
                    setViewingIndex(newIdx);
                    const newObs = observations[newIdx];
                    if (newObs?.image) {
                      setPreviewImageUrl(lightboxUrl(newObs));
                      setPreviewImageChanged(false);
                    } else {
                      setShowPreviewImageModal(false);
                    }
                  }}
                  style={{ background: canGoNewer ? "#1a5bc4" : "#2c3e50" }}
                >
                  <img src="/datumise_back.svg" alt="" width="47" height="47" style={{ filter: canGoNewer ? "brightness(0) invert(1)" : "none" }} />
                </button>
              );
            })()}
            {/* Button 3: navigate to older observation */}
            {(() => {
              const canGoOlder = viewingIndex !== null && viewingIndex < observations.length - 1;
              return (
                <button
                  type="button"
                  className="capture-footer-btn"
                  aria-label="Older observation"
                  disabled={!canGoOlder}
                  onClick={() => {
                    if (!canGoOlder) return;
                    const newIdx = viewingIndex + 1;
                    setViewingIndex(newIdx);
                    const newObs = observations[newIdx];
                    if (newObs?.image) {
                      setPreviewImageUrl(lightboxUrl(newObs));
                      setPreviewImageChanged(false);
                    } else {
                      setShowPreviewImageModal(false);
                    }
                  }}
                  style={{ background: canGoOlder ? "#1a5bc4" : "#2c3e50" }}
                >
                  <img src="/right.svg" alt="" width="47" height="47" style={{ filter: canGoOlder ? "brightness(0) invert(1)" : "none" }} />
                </button>
              );
            })()}
            {/* Button 4: close — dismisses without saving */}
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Close"
              onClick={() => {
                pendingPreviewFileRef.current = null;
                pendingPreviewUrlRef.current = null;
                setHasPendingPreview(false);
                setPreviewImageChanged(false);
                setShowPreviewImageModal(false);
              }}
              style={{ background: "#95a5a6" }}
            >
              <img src="/x.svg" alt="" width="75" height="75" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
            </button>
          </div>
        </div>
      </Modal>

      {/* Field edit modal */}
      <Modal
        show={editingField !== null && !showObsListModal}
        onHide={() => resetEditState()}
        dialogClassName="modal-bottom"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1rem" }}>{editingField === "title" ? "Edit Description" : "Edit Notes"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-2" style={{ backgroundColor: "#fefdf8" }}>
          <textarea
            className="form-control"
            rows={editingField === "title" ? 6 : 10}
            value={editValue}
            onChange={(e) => {
              if (editingField !== "title") { setEditValue(e.target.value); return; }
              const ta = e.target;
              const maxScrollHeight = 24 * 6 + 8; // 6 lines × 24px + paddingBottom
              if (ta.scrollHeight <= maxScrollHeight || e.target.value.length < editValue.length) {
                setEditValue(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (editingField === "title" && e.key === "Enter") {
                if ((editValue.match(/\n/g) || []).length >= 5) e.preventDefault();
              }
            }}
            maxLength={editingField === "title" ? 500 : 280}
            autoFocus
            style={{ resize: "none", lineHeight: "24px", fontSize: "1rem", fontWeight: 500, border: "none", borderRadius: 0, color: "#1A1D21", padding: "0 10px 8px 19px", boxSizing: "border-box", width: "100%", backgroundColor: "#fefdf8", backgroundImage: "linear-gradient(transparent calc(100% - 1px), #5a9fc0 calc(100% - 1px)), linear-gradient(90deg, transparent 14px, #ff6666 14px, #ff6666 15px, transparent 15px)", backgroundSize: "100% 24px, 100% 100%", backgroundPosition: "0 -2px, 0 0" }}
          />
        </Modal.Body>
        {editingField === "title" && !editValue.trim() && (
          <div className="text-center" style={{ fontSize: "0.82rem", color: "#db440a", padding: "0.4rem 0", fontWeight: 700, fontStyle: "italic", background: "#faf6ef" }}>
            Add description to proceed
          </div>
        )}
        <div className="survey-capture-actions">
          <div className="capture-footer-grid">
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Observations list"
              onClick={() => openObsList()}
              style={{ background: "#008080" }}
            >
              <img src="/datumise-observations.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Clear"
              onClick={() => setEditValue("")}
              disabled={!editValue.length}
              style={{ background: "#95a5a6" }}
            >
              <div className="d-flex flex-column align-items-center">
                <img src="/clear.svg" alt="" width="40" height="40" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
                <span style={{ fontSize: "0.78rem", color: "#faf6ef", marginTop: "2px", fontWeight: 700 }}>Clear</span>
              </div>
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Save"
              disabled={isSavingEdit || (editingField === "title" && !editValue.trim())}
              onClick={saveField}
              style={{ background: "#006400" }}
            >
              <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Close"
              onClick={() => resetEditState()}
              style={{ background: "#95a5a6" }}
            >
              <img src="/x.svg" alt="" width="75" height="75" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
            </button>
          </div>
        </div>
      </Modal>

      {showObsListModal && createPortal(
        <button
          type="button"
          onClick={() => closeObsList()}
          style={{ position: "fixed", bottom: 0, right: 0, width: "25%", height: "80px", background: "#95a5a6", border: "none", zIndex: 1070, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <img src="/x.svg" alt="Close" width="75" height="75" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
        </button>,
        document.body
      )}

      {/* Observations list modal */}
      <Modal
        show={showObsListModal}
        onHide={() => closeObsList()}
        backdrop="static"
        onEntered={() => {
          if (viewingIndex !== null) {
            const el = document.getElementById(`capture-obs-${viewingIndex}`);
            if (el) {
              el.scrollIntoView({ block: "center", behavior: "instant" });
              el.style.background = "#9a8255";
              el.style.transition = "none";
              setTimeout(() => {
                el.style.transition = "background 2s ease";
                el.style.background = "";
              }, 600);
            }
          }
        }}
        centered
        size="lg"
        contentClassName="rounded-1"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1rem" }}>
            <div className="d-flex align-items-center gap-2">
              <span>Observations ({observations.length})</span>
              <div className="d-flex align-items-center gap-2" style={{ marginLeft: 8 }}>
                {listSelectMode && listSelectedObs.size > 0 && (
                  <>
                    <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                      style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 4 }}
                      onClick={async () => {
                        const obsTexts = observations.filter(o => listSelectedObs.has(o.id)).map(o => o.title);
                        try {
                          await Promise.all(obsTexts.map(title => api.post("/api/observations/", { survey: survey.id, title, is_draft: true })));
                          setListSelectMode(false); setListSelectedObs(new Set());
                          const res = await api.get(`/api/surveys/${survey.id}/`); setSurvey(res.data);
                          alert(`${obsTexts.length} draft${obsTexts.length !== 1 ? "s" : ""} created.`);
                        } catch (err) { console.error(err); alert("Failed."); }
                      }}>
                      <img src="/draft.svg" alt="" width="12" height="12" style={{ filter: "brightness(0) invert(1)" }} />
                      Drafts ({listSelectedObs.size})
                    </button>
                    <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                      style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#0006b1", color: "#fefdfc", border: "none", borderRadius: 4 }}
                      onClick={async () => {
                        const withImages = observations.filter(o => listSelectedObs.has(o.id) && o.image);
                        if (!withImages.length) { alert("No images."); return; }
                        try {
                          await Promise.all(withImages.map(o => api.post("/api/observations/", { survey: survey.id, title: "", image: o.image, is_draft: true })));
                          setListSelectMode(false); setListSelectedObs(new Set());
                          const res = await api.get(`/api/surveys/${survey.id}/`); setSurvey(res.data);
                          alert(`${withImages.length} photo draft${withImages.length !== 1 ? "s" : ""} created.`);
                        } catch (err) { console.error(err); alert("Failed."); }
                      }}>
                      <img src="/clipboard.svg" alt="" width="12" height="12" style={{ filter: "brightness(0) invert(1)" }} />
                      Photo ({observations.filter(o => listSelectedObs.has(o.id) && o.image).length})
                    </button>
                    <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                      style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#c0392b", color: "#fefdfc", border: "none", borderRadius: 4 }}
                      onClick={async () => {
                        if (!window.confirm(`Delete ${listSelectedObs.size} observation${listSelectedObs.size !== 1 ? "s" : ""}?`)) return;
                        try {
                          await Promise.all([...listSelectedObs].map(id => api.delete(`/api/observations/${id}/`)));
                          setListSelectMode(false); setListSelectedObs(new Set());
                          const res = await api.get(`/api/surveys/${survey.id}/`); setSurvey(res.data);
                        } catch (err) { console.error(err); alert("Failed."); }
                      }}>
                      Delete ({listSelectedObs.size})
                    </button>
                  </>
                )}
                <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                  style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: listSelectMode ? "#0006b1" : "#db440a", color: "#fefdfc", border: "none", borderRadius: 4 }}
                  onClick={() => { setListSelectMode(!listSelectMode); if (listSelectMode) setListSelectedObs(new Set()); }}>
                  <img src="/use.svg" alt="" width="12" height="12" style={{ filter: "brightness(0) invert(1)" }} />
                  {listSelectMode ? `Select (${listSelectedObs.size})` : "Select"}
                </button>
              </div>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "60vh", overflowY: "auto", padding: "0.5rem", backgroundColor: "#E2DDD3" }}>
          {observations.length === 0 ? (
            <p className="text-muted text-center py-3">No observations yet.</p>
          ) : (
            observations.map((obs, idx) => {
              const imgSrc = obs.thumbnail_url
                || (obs.image && obs.image.startsWith("/")
                  ? `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}${obs.image}`
                  : obs.image);
              return (
              <div
                key={obs.id}
                id={`capture-obs-${idx}`}
                className="observation-row"
                style={{ cursor: "pointer", padding: 0, alignItems: "stretch", overflow: "hidden", gap: 0, height: "80px", marginBottom: "0.35rem", border: "none", borderRadius: "2px", position: "relative" }}
                onClick={(e) => {
                  if (listSelectMode) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (e.clientX - rect.left > rect.width * 0.8) {
                      setListSelectedObs(prev => { const next = new Set(prev); if (next.has(obs.id)) next.delete(obs.id); else next.add(obs.id); return next; });
                      return;
                    }
                  }
                  navStackRef.current.push({ viewingIndex, editingField, editValue, notesOpen: listOpenFromStateRef.current.notesOpen || false, previewImageOpen: listOpenFromStateRef.current.previewImageOpen || false, fromList: true });
                  resetEditState();
                  setViewingIndex(idx);
                  setShowObsListModal(false);
                  setCopiedToDraft(false);
                }}
              >
                <div style={{ position: "relative", width: "80px", flexShrink: 0 }}>
                  {imgSrc ? (
                    <img src={imgSrc} alt="" loading="lazy" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "2px 0 0 2px" }} />
                  ) : (
                    <div style={{ width: "80px", height: "80px", borderRadius: "2px 0 0 2px", display: "flex", alignItems: "center", justifyContent: "center", background: "#e9ecef" }}>
                      <span style={{ fontSize: "0.65rem", color: "#2c3e50" }}>No img</span>
                    </div>
                  )}
                  {obs.is_draft && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#db440a", color: "#fff", fontSize: "0.55rem", fontWeight: 700, textAlign: "center", borderRadius: "0 0 0 8px", padding: "1px 0", letterSpacing: "0.05em" }}>DRAFT</div>
                  )}
                </div>
                <div className="observation-row-content d-flex flex-column justify-content-between" style={{ padding: "0.1rem 0.4rem 0.3rem 13px", overflow: "hidden", backgroundColor: "#FAF8F3", backgroundImage: "linear-gradient(90deg, transparent 8px, #ffd6d6 8px, #ffd6d6 9px, transparent 9px)", backgroundSize: "100% calc(100% - 16px)", backgroundPosition: "0 8px" }}>
                  <div className="observation-row-title" style={{ height: "60px", lineHeight: "20px", marginLeft: "-13px", paddingLeft: "13px", backgroundImage: "linear-gradient(transparent 19px, #cce8f5 19px, #cce8f5 20px, transparent 20px, transparent 39px, #cce8f5 39px, #cce8f5 40px, transparent 40px, transparent 59px, #cce8f5 59px, #cce8f5 60px, transparent 60px)", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}>
                    {obs.title || "Untitled"}
                  </div>
                  <div className="observation-row-meta d-flex align-items-center justify-content-end gap-2" style={{ lineHeight: 1, marginTop: "0.1rem", flexShrink: 0, color: "#1A1D21" }}>
                    <span style={{ marginRight: "auto", fontStyle: "normal" }}>{observations.length - idx} of {observations.length}</span>
                    <span>
                      {new Date(obs.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                {listSelectMode && (
                  <div onClick={(e) => { e.stopPropagation(); setListSelectedObs(prev => { const next = new Set(prev); if (next.has(obs.id)) next.delete(obs.id); else next.add(obs.id); return next; }); }}
                    style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "2px solid #0006b1", backgroundColor: listSelectedObs.has(obs.id) ? "#0006b1" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    {listSelectedObs.has(obs.id) && <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                  </div>
                )}
              </div>
              );
            }))
          }
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default SurveyCapture;
