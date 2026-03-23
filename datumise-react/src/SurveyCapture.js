import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Modal } from "react-bootstrap";
import heic2any from "heic2any";
import { detailMobileUrl, lightboxUrl } from "./imageUtils";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";
import { SurveyCardGrid } from "./SurveyCard";

// Session-lifecycle PATCH values (legacy compat).
const PATCH_START_SESSION = "live";
const PATCH_PAUSE_SESSION = "paused";
const PATCH_END_SESSION = "submitted";

// Rule 000019: inactivity timeout (10 minutes)
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
// Rule 000020: max session duration (2 hours)
const MAX_SESSION_MS = 2 * 60 * 60 * 1000;

function SurveyCapture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
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
  const autoSaveDraftRef = useRef(null); // set by ObservationCreateForm (async, legacy)
  const observationsRef = useRef([]); // always-current copy for use in event handlers
  const [pauseCountdown, setPauseCountdown] = useState(null);
  const [draftIncomplete, setDraftIncomplete] = useState(false);
  const pauseTimerRef = useRef(null);
  const [showPreviewImageModal, setShowPreviewImageModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  // Rule 000018-000020: session timers
  const inactivityTimerRef = useRef(null);
  const maxSessionTimerRef = useRef(null);
  const sessionStartingRef = useRef(false); // prevent duplicate start calls
  const surveyRef = useRef(null); // always-current survey for timers
  const previewFileInputRef = useRef(null);
  const modalClosedAtRef = useRef(0);
  const [showObsListModal, setShowObsListModal] = useState(false);
  const [listSelectMode, setListSelectMode] = useState(false);
  const [listSelectedObs, setListSelectedObs] = useState(new Set());
  const [copiedToDraft, setCopiedToDraft] = useState(false);
  const [capPushModal, setCapPushModal] = useState(false);
  const [capPushType, setCapPushType] = useState("");
  const [capPushSurveys, setCapPushSurveys] = useState([]);
  const [capPushSelected, setCapPushSelected] = useState(new Set());
  const [capPushSearch, setCapPushSearch] = useState("");
  const [capPushNextPage, setCapPushNextPage] = useState(null);
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
      surveyRef.current = response.data;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user ID for filtering push surveys
  useEffect(() => {
    api.get("/api/auth/user/").then(res => {
      setCurrentUserId(res.data.pk || res.data.id || null);
    }).catch(() => {});
  }, []);

  // Rule 000019: reset inactivity timer on photo
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(async () => {
      const s = surveyRef.current;
      if (s?.current_session_status === "active") {
        try { await api.patch(`/api/surveys/${id}/`, { status: PATCH_PAUSE_SESSION }); } catch (e) { /* silent */ }
        fetchSurvey();
      }
    }, INACTIVITY_TIMEOUT_MS);
  };

  // Rule 000020: start max session timer (2 hours from session start)
  const startMaxSessionTimer = () => {
    if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);
    maxSessionTimerRef.current = setTimeout(async () => {
      const s = surveyRef.current;
      if (s?.current_session_status === "active" || s?.current_session_status === "paused") {
        try { await api.patch(`/api/surveys/${id}/`, { status: PATCH_END_SESSION }); } catch (e) { /* silent */ }
        fetchSurvey();
      }
    }, MAX_SESSION_MS);
  };

  // Rule 000018 + 000021: start/resume session + auto-fill date on photo capture
  const handlePhotoTaken = async () => {
    const s = surveyRef.current;
    if (!s) return;
    const ss = s.survey_status || s.status;
    if (ss !== "active" && !["open", "assigned"].includes(s.status)) return;

    resetInactivityTimer();

    // Rule 000021.2 + 000021.3: auto-fill date and scheduled_status on first real obs
    const hasRealObs = (s.observations || []).some(o => !o.is_draft && o.image);
    if (!hasRealObs) {
      const patch = {};
      if (!s.scheduled_for) {
        const now = new Date();
        patch.scheduled_for = now.toISOString();
      }
      const sched = s.scheduled_status || s.schedule_status;
      if (sched === "provisional") {
        patch.schedule_status = "booked"; // "confirmed" in new domain, "booked" in legacy write
      } else if (!sched) {
        patch.schedule_status = "self_scheduled";
      }
      if (Object.keys(patch).length > 0) {
        try { await api.patch(`/api/surveys/${id}/`, patch); } catch (e) { /* silent */ }
      }
    }

    // Session start/resume
    if (s.current_session_status === "active") return; // already active
    if (sessionStartingRef.current) return; // prevent duplicate
    sessionStartingRef.current = true;
    try {
      await api.patch(`/api/surveys/${id}/`, { status: PATCH_START_SESSION });
      await fetchSurvey();
      startMaxSessionTimer();
    } catch (e) {
      console.error("Failed to start/resume session:", e);
    } finally {
      sessionStartingRef.current = false;
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);
    };
  }, []);

  // If session is already active on load, start timers
  useEffect(() => {
    if (survey?.current_session_status === "active") {
      resetInactivityTimer();
      startMaxSessionTimer();
    }
  }, [survey?.current_session_status]);

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

  // Navigate to specific obs if explicitly requested, otherwise blank — only on initial load
  useEffect(() => {
    if (!survey?.observations || initialNavDoneRef.current) return;
    initialNavDoneRef.current = true;
    const targetId = location.state?.viewObservationId;
    if (targetId) {
      const idx = survey.observations.findIndex((obs) => obs.id === Number(targetId) || obs.id === targetId);
      if (idx !== -1) setViewingIndex(idx);
      localStorage.removeItem(`datumise-capture-pos-${id}`);
    }
    // Do NOT auto-navigate to draft — always start with a blank capture form
  }, [survey?.observations, location.state?.viewObservationId, id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDurationTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-pause session when user backgrounds or closes the app
  // Drafts are saved proactively to the API, so no emergency save needed here
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (surveyRef.current?.current_session_status === "active") {
          api.patch(`/api/surveys/${id}/`, { status: PATCH_PAUSE_SESSION }).catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id]);

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
    // Drafts are already saved proactively to the API
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
    // Drafts are already saved proactively to the API — no manual save needed
    if (survey?.current_session_status === "active") {
      executePause();
    } else {
      goBack();
    }
  };

  const handleSuccess = (newObservation) => {
    // Draft was promoted to real obs via PATCH, no need to delete separately
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
  // Forward = toward newer (lower index), then to NEW observation
  // Back = toward older (higher index)
  const canStepForward = viewingIndex !== null && (viewingIndex > 0 || !!survey?.is_surveyor);
  const canStepBack = viewingIndex === null
    ? observations.length > 0
    : viewingIndex < observations.length - 1;

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

  const handleStepForward = () => {
    if (Date.now() - modalClosedAtRef.current < 400) return;
    resetEditState();
    if (viewingIndex === null) {
      // From NEW → go to first (newest) observation
      if (observations.length > 0) setViewingIndex(0);
    } else if (viewingIndex > 0) {
      // Move toward newer observations (lower index)
      setViewingIndex(viewingIndex - 1);
    } else if (survey?.is_surveyor) {
      // At the newest observation → go to NEW (only for assigned surveyor)
      navStackRef.current = [];
      setViewingIndex(null);
    }
  };

  const handleStepBack = () => {
    if (Date.now() - modalClosedAtRef.current < 400) return;
    resetEditState();
    if (viewingIndex === null) {
      // From NEW → go to first (newest) observation
      if (observations.length > 0) setViewingIndex(0);
    } else if (viewingIndex < observations.length - 1) {
      // Move toward older observations (higher index)
      setViewingIndex(viewingIndex + 1);
    }
  };

  const saveField = async () => {
    const field = editingField;
    const value = editValue.trim();
    if (!viewedObservation || !field) return;
    setIsSavingEdit(true);
    try {
      const updatedObs = { ...viewedObservation, [field]: value };
      // Auto-promote draft to real if both image and text are now present
      const shouldPromote = updatedObs.is_draft && updatedObs.image && updatedObs.title?.trim();
      const patchData = shouldPromote
        ? { [field]: value, is_draft: false }
        : { [field]: value };
      await api.patch(`/api/observations/${viewedObservation.id}/`, patchData);
      setSurvey((prev) => ({
        ...prev,
        observations: prev.observations.map((obs) =>
          obs.id === viewedObservation.id ? { ...obs, ...patchData } : obs
        ),
      }));
      resetEditState();
      if (shouldPromote) {
        setViewingIndex(null);
        setSuccessMessage(false);
        setTimeout(() => setSuccessMessage(true), 100);
        setTimeout(() => setSuccessMessage(false), 3000);
        fetchSurvey();
      }
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
            Pausing session in
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
            <span className="obs-counter" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontWeight: 700, fontSize: "1.35rem", lineHeight: 1.2, pointerEvents: "none", whiteSpace: "nowrap", top: "50%", marginTop: "-0.68rem" }}>
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
                <span className="capture-subtitle-prior">
                  {survey.site_name || survey.site || ""}{" \u00B7 "}
                  {!viewedObservation?.is_draft && <>{viewedObservation && new Date(viewedObservation.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{" \u00B7 "}</>}
                  {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
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
          onClick={() => closeSurvey()}
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
              onPhotoTaken={handlePhotoTaken}
              captureMode
              actionBarTarget={actionBarEl}
              isSurveyor={!!survey.is_surveyor}
              anyIncomplete={anyIncomplete}
              onDraftIncomplete={setDraftIncomplete}
              onStepBack={canStepBack && !(viewingIndex !== null && viewedObsIncomplete && !viewedObservation?.is_draft) ? handleStepBack : null}
              onStepForward={canStepForward && !(viewingIndex !== null && viewedObsIncomplete && !viewedObservation?.is_draft) ? handleStepForward : null}
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
              onDraftDeleted={() => fetchSurvey()}
              isDraftObs={viewedObservation?.is_draft || false}
              onUseDraft={async () => {
                if (!viewedObservation) return;
                const confirmed = window.confirm("Create draft observation from this observation?");
                if (!confirmed) return;
                try {
                  const data = new FormData();
                  data.append("title", viewedObservation.title || "");
                  data.append("description", viewedObservation.description || "");
                  data.append("is_draft", "true");
                  data.append("survey", id);
                  if (viewedObservation.image) {
                    const res = await fetch(viewedObservation.image);
                    const blob = await res.blob();
                    data.append("image", new File([blob], "observation.jpg", { type: blob.type || "image/jpeg" }));
                  }
                  await api.post("/api/observations/", data, { headers: { "Content-Type": "multipart/form-data" } });
                  fetchSurvey();
                  resetEditState();
                  setViewingIndex(null);
                } catch (err) {
                  console.error("Failed to create draft from observation:", err);
                }
              }}
              onCaptureDraftPhoto={() => previewFileInputRef.current?.click()}
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
          // Save the original image URL so toggle can switch between them
          if (viewedObservation.image) {
            originalPreviewUrlRef.current = lightboxUrl(viewedObservation);
          }
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
            {/* Button 1: toggle between images (if pending) or list */}
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
                <img src="/datumise_end_right.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
              </button>
            ) : (
              <button
                type="button"
                className="capture-footer-btn"
                aria-label="Use draft"
                onClick={async () => {
                  if (!viewedObservation) return;
                  const confirmed = window.confirm("Create draft observation from this observation?");
                  if (!confirmed) return;
                  try {
                    const data = new FormData();
                    data.append("title", viewedObservation.title || "");
                    data.append("description", viewedObservation.description || "");
                    data.append("is_draft", "true");
                    data.append("survey", id);
                    if (viewedObservation.image) {
                      const res = await fetch(viewedObservation.image);
                      const blob = await res.blob();
                      data.append("image", new File([blob], "observation.jpg", { type: blob.type || "image/jpeg" }));
                    }
                    await api.post("/api/observations/", data, { headers: { "Content-Type": "multipart/form-data" } });
                    setShowPreviewImageModal(false);
                    fetchSurvey();
                    resetEditState();
                    setViewingIndex(null);
                  } catch (err) {
                    console.error("Failed to create draft from observation:", err);
                  }
                }}
                style={{ background: !survey.is_surveyor ? "#2c3e50" : "#0006b1" }}
                disabled={!survey.is_surveyor}
              >
                <img src="/draft.svg" alt="" width="47" height="47" style={{ filter: !survey.is_surveyor ? "none" : "brightness(0) invert(1)" }} />
              </button>
            )}
            {/* Button 2: retake photo */}
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Retake photo"
              disabled={!survey.is_surveyor}
              onClick={() => survey.is_surveyor && previewFileInputRef.current?.click()}
              style={{ background: !survey.is_surveyor ? "#2c3e50" : "#db440a" }}
            >
              <img src="/camera.svg" alt="" width="47" height="47" style={{ filter: !survey.is_surveyor ? "none" : "brightness(0) invert(1)" }} />
            </button>
            {/* Button 3: confirm — save currently displayed photo, discard the other */}
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Confirm photo"
              disabled={!hasPendingPreview}
              onClick={async () => {
                if (!viewedObservation) return;
                try {
                  if (previewImageChanged) {
                    // Currently showing the NEW photo — save it
                    if (!pendingPreviewFileRef.current) return;
                    const data = new FormData();
                    data.append("image", pendingPreviewFileRef.current);
                    // Auto-promote draft if text already present
                    if (viewedObservation.is_draft && viewedObservation.title?.trim()) {
                      data.append("is_draft", "false");
                    }
                    await api.patch(`/api/observations/${viewedObservation.id}/`, data, { headers: { "Content-Type": "multipart/form-data" } });
                  }
                  const promoted = previewImageChanged && viewedObservation.is_draft && viewedObservation.title?.trim();
                  // If showing original, keep it (no PATCH needed — discard new)
                  pendingPreviewFileRef.current = null;
                  pendingPreviewUrlRef.current = null;
                  setHasPendingPreview(false);
                  setPreviewImageChanged(false);
                  if (promoted) {
                    setShowPreviewImageModal(false);
                    setViewingIndex(null);
                    setSuccessMessage(false);
                    setTimeout(() => setSuccessMessage(true), 100);
                    setTimeout(() => setSuccessMessage(false), 3000);
                  }
                  fetchSurvey();
                } catch (err) {
                  console.error("Failed to save photo:", err);
                }
              }}
              style={{ background: !hasPendingPreview ? "#2c3e50" : "#006400" }}
            >
              <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: !hasPendingPreview ? "none" : "brightness(0) invert(1)" }} />
            </button>
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
            autoFocus={!!survey.is_surveyor}
            readOnly={!survey.is_surveyor}
            style={{ resize: "none", lineHeight: "24px", fontSize: "1rem", fontWeight: 500, border: "none", borderRadius: 0, color: "#1A1D21", padding: "0 10px 8px 19px", boxSizing: "border-box", width: "100%", backgroundColor: "#fefdf8", cursor: !survey.is_surveyor ? "default" : undefined, backgroundImage: "linear-gradient(transparent calc(100% - 1px), #5a9fc0 calc(100% - 1px)), linear-gradient(90deg, transparent 14px, #ff6666 14px, #ff6666 15px, transparent 15px)", backgroundSize: "100% 24px, 100% 100%", backgroundPosition: "0 -2px, 0 0" }}
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
              aria-label="Use draft"
              onClick={async () => {
                if (!viewedObservation) return;
                const confirmed = window.confirm("Create draft observation from this observation?");
                if (!confirmed) return;
                try {
                  const data = new FormData();
                  data.append("title", viewedObservation.title || "");
                  data.append("description", viewedObservation.description || "");
                  data.append("is_draft", "true");
                  data.append("survey", id);
                  if (viewedObservation.image) {
                    const res = await fetch(viewedObservation.image);
                    const blob = await res.blob();
                    data.append("image", new File([blob], "observation.jpg", { type: blob.type || "image/jpeg" }));
                  }
                  await api.post("/api/observations/", data, { headers: { "Content-Type": "multipart/form-data" } });
                  resetEditState();
                  fetchSurvey();
                  setViewingIndex(null);
                } catch (err) {
                  console.error("Failed to create draft from observation:", err);
                }
              }}
              style={{ background: !survey.is_surveyor ? "#2c3e50" : "#0006b1" }}
              disabled={!survey.is_surveyor}
            >
              <img src="/draft.svg" alt="" width="47" height="47" style={{ filter: !survey.is_surveyor ? "none" : "brightness(0) invert(1)" }} />
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Clear"
              onClick={() => setEditValue("")}
              disabled={!editValue.length || !survey.is_surveyor}
              style={{ background: !survey.is_surveyor ? "#2c3e50" : "#95a5a6" }}
            >
              <div className="d-flex flex-column align-items-center">
                <img src="/clear.svg" alt="" width="40" height="40" style={{ filter: !survey.is_surveyor ? "none" : "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
                <span style={{ fontSize: "0.78rem", color: !survey.is_surveyor ? "#888" : "#faf6ef", marginTop: "2px", fontWeight: 700 }}>Clear</span>
              </div>
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Save"
              disabled={isSavingEdit || (editingField === "title" && !editValue.trim()) || !survey.is_surveyor}
              onClick={saveField}
              style={{ background: !survey.is_surveyor ? "#2c3e50" : "#006400" }}
            >
              <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: !survey.is_surveyor ? "none" : "brightness(0) invert(1)" }} />
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
        <Modal.Header closeButton style={{ display: "flex" }}>
          <Modal.Title style={{ fontSize: "1rem", flex: 1 }}>
            <div className="section-header-row">
              <span>Observations ({observations.length})</span>
              <div className="section-header-actions">
                {listSelectMode && listSelectedObs.size > 0 && (
                  <>
                    <button type="button" className="btn btn-sm d-flex align-items-center"
                      style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
                      onClick={async () => {
                        setCapPushType("text"); setCapPushSearch(""); setCapPushSelected(new Set([String(survey.id)]));
                        try { const url = currentUserId && !survey.is_surveyor ? `/api/surveys/?page_size=25&assigned_to=${currentUserId}` : "/api/surveys/?page_size=25"; const res = await api.get(url); setCapPushSurveys(res.data.results || res.data); setCapPushNextPage(res.data.next || null); } catch (e) { setCapPushSurveys([]); }
                        setCapPushModal(true);
                      }}>
                      Text
                    </button>
                    <button type="button" className="btn btn-sm d-flex align-items-center"
                      style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#db440a", color: "#fefdfc", border: "1px solid #fefdfc", borderRadius: 2, height: 24 }}
                      onClick={async () => {
                        setCapPushType("photo"); setCapPushSearch(""); setCapPushSelected(new Set([String(survey.id)]));
                        try { const url = currentUserId && !survey.is_surveyor ? `/api/surveys/?page_size=25&assigned_to=${currentUserId}` : "/api/surveys/?page_size=25"; const res = await api.get(url); setCapPushSurveys(res.data.results || res.data); setCapPushNextPage(res.data.next || null); } catch (e) { setCapPushSurveys([]); }
                        setCapPushModal(true);
                      }}>
                      Photo
                    </button>
                    <button type="button" className="btn btn-sm d-flex align-items-center"
                      style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#0006b1", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
                      onClick={async () => {
                        setCapPushType("textphoto"); setCapPushSearch(""); setCapPushSelected(new Set([String(survey.id)]));
                        try { const url = currentUserId && !survey.is_surveyor ? `/api/surveys/?page_size=25&assigned_to=${currentUserId}` : "/api/surveys/?page_size=25"; const res = await api.get(url); setCapPushSurveys(res.data.results || res.data); setCapPushNextPage(res.data.next || null); } catch (e) { setCapPushSurveys([]); }
                        setCapPushModal(true);
                      }}>
                      Text+Photo
                    </button>
                    <button type="button" className="btn btn-sm d-flex align-items-center justify-content-center"
                      style={{ width: 24, height: 24, padding: 0, backgroundColor: "#c0392b", border: "none", borderRadius: 2 }}
                      onClick={async () => {
                        if (!window.confirm(`Delete ${listSelectedObs.size} observation${listSelectedObs.size !== 1 ? "s" : ""}?`)) return;
                        try {
                          await Promise.all([...listSelectedObs].map(id => api.delete(`/api/observations/${id}/`)));
                          setListSelectMode(false); setListSelectedObs(new Set());
                          const res = await api.get(`/api/surveys/${survey.id}/`); setSurvey(res.data);
                        } catch (err) { console.error(err); alert("Failed."); }
                      }}>
                      <img src="/datumise_delete.svg" alt="Delete" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} />
                    </button>
                  </>
                )}
                <button type="button" className="btn btn-sm d-flex align-items-center"
                  style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: listSelectMode ? "#fefdfc" : "#0006b1", color: listSelectMode ? "#0006b1" : "#fefdfc", border: listSelectMode ? "1px solid #0006b1" : "none", borderRadius: 2, height: 24 }}
                  onClick={() => { setListSelectMode(!listSelectMode); if (listSelectMode) setListSelectedObs(new Set()); }}>
                  {listSelectMode && listSelectedObs.size > 0 ? `${listSelectedObs.size}/10` : "Select"}
                </button>
              </div>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "60vh", overflowY: "auto", padding: "0.5rem", backgroundColor: "#687374" }}>
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
                style={{ cursor: "pointer", padding: 0, alignItems: "stretch", overflow: "hidden", gap: 0, height: "80px", marginBottom: "2px", border: "none", borderRadius: "2px", position: "relative" }}
                onClick={(e) => {
                  if (listSelectMode) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (e.clientX - rect.left > rect.width * 0.8) {
                      setListSelectedObs(prev => { const next = new Set(prev); if (next.has(obs.id)) next.delete(obs.id); else if (next.size < 10) next.add(obs.id); return next; });
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
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#db440a", color: "#fff", fontSize: "0.55rem", fontWeight: 700, textAlign: "center", borderRadius: 0, padding: "1px 0", letterSpacing: "0.05em" }}>DRAFT</div>
                  )}
                </div>
                <div className="observation-row-content d-flex flex-column" style={{ padding: "0 0.4rem 0 13px", overflow: "hidden", backgroundColor: "#f9f9f9", backgroundImage: "linear-gradient(90deg, transparent 8px, #ffd6d6 8px, #ffd6d6 9px, transparent 9px)", backgroundSize: "100% calc(100% - 16px)", backgroundPosition: "0 8px" }}>
                  <div className="observation-row-title" style={{ height: "60px", lineHeight: "20px", paddingTop: "1px", marginLeft: "-13px", paddingLeft: "13px", flexShrink: 0, backgroundImage: "linear-gradient(transparent 19px, #cce8f5 19px, #cce8f5 20px, transparent 20px, transparent 39px, #cce8f5 39px, #cce8f5 40px, transparent 40px, transparent 59px, #cce8f5 59px, #cce8f5 60px, transparent 60px)", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}>
                    {(() => {
                      const t = obs.title || "Untitled";
                      const words = t.split(" ");
                      const lines = [];
                      let wordIdx = 0;
                      for (let row = 0; row < 3 && wordIdx < words.length; row++) {
                        const maxLen = row === 2 ? 77 : 80;
                        let line = "";
                        while (wordIdx < words.length) {
                          const next = line + (line ? " " : "") + words[wordIdx];
                          if (next.length <= maxLen) { line = next; wordIdx++; }
                          else break;
                        }
                        if (row === 2 && wordIdx < words.length) line += "...";
                        lines.push(line);
                      }
                      return lines.map((l, i) => <span key={i}>{l}{i < lines.length - 1 && <br />}</span>);
                    })()}
                  </div>
                  <div className="observation-row-meta d-flex align-items-center justify-content-start gap-2" style={{ lineHeight: 1, flex: 1, display: "flex", alignItems: "center" }}>
                    <button className="btn btn-link btn-sm p-0 border-0 bg-transparent d-inline-flex align-items-center gap-1"
                      style={{ fontSize: "0.6rem", textDecoration: "none", color: "#95a5a6" }}
                      onClick={(e) => e.stopPropagation()}>
                      <img src="/datumise-like.svg" alt="" width="11" height="11" style={{ opacity: obs.is_liked ? 1 : 0.4, filter: obs.is_liked ? "invert(20%) sepia(90%) saturate(3000%) hue-rotate(120deg) brightness(0.5)" : "none" }} />
                      {obs.likes_count || 0}
                    </button>
                    <span>
                      {new Date(obs.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {" \u00B7 "}{obs.owner_name || obs.owner || "Unassigned"}
                    </span>
                  </div>
                </div>
                {listSelectMode && (
                  <div onClick={(e) => { e.stopPropagation(); setListSelectedObs(prev => { const next = new Set(prev); if (next.has(obs.id)) next.delete(obs.id); else if (next.size < 10) next.add(obs.id); return next; }); }}
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

      {/* Push to survey modal */}
      {capPushModal && createPortal(
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 2, maxWidth: 520, width: "90%", maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="d-flex justify-content-between align-items-center" style={{ backgroundColor: "#db440a", padding: "0.5rem 1rem" }}>
              <span style={{ color: "#faf6ef", fontWeight: 700, fontSize: "1rem" }}>
                {capPushType === "text" ? "Create draft observations in selected surveys from observation text?" : capPushType === "photo" ? "Create draft observations in selected surveys from observation photos?" : "Create draft observations in selected surveys from observation photos and text?"}
              </span>
              <button type="button" style={{ border: "none", background: "none", fontSize: "1.3rem", cursor: "pointer", color: "#faf6ef", lineHeight: 1, padding: 0 }} onClick={() => setCapPushModal(false)}>&times;</button>
            </div>
            <div style={{ padding: "0.75rem 1rem 0.5rem" }}>
              <input type="text" className="filter-search" placeholder="Search surveys..." value={capPushSearch} onChange={(e) => setCapPushSearch(e.target.value)}
                style={{ fontSize: "0.75rem", padding: "3px 8px", border: "1px solid #c8c2b8", borderRadius: 4, outline: "none", width: "100%", maxWidth: 200 }} />
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "0 1rem" }}>
              {(() => {
                const filtered = capPushSurveys.filter(s => {
                  if (!capPushSearch) return true;
                  const q = capPushSearch.toLowerCase();
                  return (s.site_name || "").toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q);
                });
                const sorted = [...filtered].sort((a, b) => (String(b.id) === String(survey.id) ? 1 : 0) - (String(a.id) === String(survey.id) ? 1 : 0));
                return sorted.length === 0 ? <p className="text-muted">No surveys found.</p> : (<>
                  {sorted.map(s => (
                    <div key={s.id} className="survey-queue-card" style={{ cursor: "pointer", position: "relative", outline: String(s.id) === String(survey.id) ? "2px solid #0d6efd" : "none" }}
                      onClick={() => { setCapPushSelected(prev => { const n = new Set(prev); n.has(String(s.id)) ? n.delete(String(s.id)) : n.add(String(s.id)); return n; }); }}>
                      <SurveyCardGrid survey={s} />
                      <div style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "2px solid #fff", backgroundColor: capPushSelected.has(String(s.id)) ? "#0d6efd" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {capPushSelected.has(String(s.id)) && <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                      </div>
                    </div>
                  ))}
                  {capPushNextPage ? (
                    <div className="text-center my-2">
                      <button className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
                        style={{ width: 36, height: 36, background: "#db440a", border: "none" }}
                        onClick={async () => { try { const res = await api.get(capPushNextPage); setCapPushSurveys(prev => [...prev, ...(res.data.results || res.data)]); setCapPushNextPage(res.data.next || null); } catch (e) {} }}>
                        <img src="/datumise-load.svg" alt="" width="18" height="18" style={{ filter: "brightness(0) invert(1)" }} />
                      </button>
                    </div>
                  ) : <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#999", fontStyle: "italic", margin: "8px 0" }}>All surveys downloaded</p>}
                </>);
              })()}
            </div>
            <div className="d-flex justify-content-end gap-2" style={{ padding: "0.5rem 1rem 1rem" }}>
              {capPushSelected.size > 0 && <button type="button" className="btn btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#6c757d", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }} onClick={() => setCapPushSelected(new Set())}>Clear</button>}
              <button type="button" className="btn btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px", border: "1px solid #c8c2b8", borderRadius: 2, height: 24 }} onClick={() => setCapPushModal(false)}>Cancel</button>
              {capPushSelected.size > 0 && (
                <button type="button" className="btn btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#0006b1", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
                  onClick={async () => {
                    try {
                      const selected = observations.filter(o => listSelectedObs.has(o.id));
                      let count = 0;
                      for (const surveyId of capPushSelected) {
                        for (const obs of selected) {
                          if (capPushType === "photo" && !obs.image) continue;
                          const needsImage = (capPushType === "photo" || capPushType === "textphoto") && obs.image;
                          if (needsImage) {
                            try {
                              const imgRes = await fetch(obs.image);
                              const blob = await imgRes.blob();
                              const fd = new FormData();
                              fd.append("survey", surveyId);
                              fd.append("is_draft", "true");
                              if (capPushType === "textphoto" || capPushType === "text") fd.append("title", obs.title || "");
                              fd.append("image", blob, "photo.jpg");
                              await api.post("/api/observations/", fd, { headers: { "Content-Type": "multipart/form-data" } });
                              count++;
                            } catch (e) { console.error("Image copy failed:", e); }
                          } else {
                            await api.post("/api/observations/", { survey: parseInt(surveyId), title: obs.title || "", is_draft: true });
                            count++;
                          }
                        }
                      }
                      setCapPushModal(false); setListSelectMode(false); setListSelectedObs(new Set());
                      const res = await api.get(`/api/surveys/${survey.id}/`); setSurvey(res.data);
                      alert(`${count} draft${count !== 1 ? "s" : ""} created.`);
                    } catch (err) { alert("Failed."); }
                  }}>Add ({capPushSelected.size} {capPushSelected.size === 1 ? "survey" : "surveys"})</button>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

export default SurveyCapture;
