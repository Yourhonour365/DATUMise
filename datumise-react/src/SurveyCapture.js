import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Modal } from "react-bootstrap";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";

function SurveyCapture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [observationCount, setObservationCount] = useState(0);
  const [durationTick, setDurationTick] = useState(0);
  const [successMessage, setSuccessMessage] = useState(false);
  const [actionBarEl, setActionBarEl] = useState(null);
  const [viewingIndex, setViewingIndex] = useState(null);
  const [editingField, setEditingField] = useState(null); // "title" | "description" | null
  const [editValue, setEditValue] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pauseCountdown, setPauseCountdown] = useState(null);
  const [draftIncomplete, setDraftIncomplete] = useState(false);
  const pauseTimerRef = useRef(null);
  const [showPreviewImageModal, setShowPreviewImageModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const previewFileInputRef = useRef(null);
  const modalClosedAtRef = useRef(0);
  const [captureComments, setCaptureComments] = useState([]);
  const [captureCommentText, setCaptureCommentText] = useState("");
  const [showObsListModal, setShowObsListModal] = useState(false);
  const [copiedToDraft, setCopiedToDraft] = useState(false);
  const [draftHasTitle, setDraftHasTitle] = useState(false);
  const [draftHasImage, setDraftHasImage] = useState(false);

  const fetchSurvey = async () => {
    try {
      const response = await api.get(`/api/surveys/${id}/`);
      setSurvey(response.data);
      setObservationCount(response.data.observations?.length || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setLoading(false);
      return;
    }
    fetchSurvey();
  }, [id]);

  // If navigated with a specific observation to view, or resuming from a saved position
  useEffect(() => {
    const targetId = location.state?.viewObservationId || localStorage.getItem(`datumise-capture-pos-${id}`);
    if (targetId && survey?.observations) {
      const idx = survey.observations.findIndex((obs) => obs.id === Number(targetId) || obs.id === targetId);
      if (idx !== -1) {
        setViewingIndex(idx);
      }
      localStorage.removeItem(`datumise-capture-pos-${id}`);
    }
  }, [survey?.observations, location.state?.viewObservationId, id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDurationTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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
    if (viewingIndex !== null && observations[viewingIndex]) {
      localStorage.setItem(`datumise-capture-pos-${id}`, observations[viewingIndex].id);
    } else {
      localStorage.removeItem(`datumise-capture-pos-${id}`);
    }
    try {
      await api.patch(`/api/surveys/${id}/`, { status: "paused" });
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
    if (survey?.status === "live") {
      executePause();
    } else {
      goBack();
    }
  };

  const handleSuccess = (newObservation) => {
    setObservationCount((prev) => prev + 1);
    setSurvey((prev) => ({
      ...prev,
      observations: [newObservation, ...(prev.observations || [])],
    }));
    setDraftIncomplete(false);
    setViewingIndex(null);
    setSuccessMessage(false);
    setTimeout(() => setSuccessMessage(true), 100);
    setTimeout(() => setSuccessMessage(false), 3000);
    // Re-fetch to get full image URLs
    fetchSurvey();
  };

  const observations = survey?.observations || [];
  const viewedObservation = viewingIndex !== null ? observations[viewingIndex] : null;

  // Fetch comments for the currently viewed observation
  useEffect(() => {
    if (!viewedObservation?.id) { setCaptureComments([]); return; }
    api.get(`/api/comments/?observation=${viewedObservation.id}`)
      .then((res) => setCaptureComments(res.data.results || res.data))
      .catch(() => setCaptureComments([]));
  }, [viewedObservation?.id]);

  const handleAddCaptureComment = async () => {
    if (!captureCommentText.trim() || !viewedObservation?.id) return;
    try {
      await api.post("/api/comments/", { observation: viewedObservation.id, content: captureCommentText.trim() });
      setCaptureCommentText("");
      const res = await api.get(`/api/comments/?observation=${viewedObservation.id}`);
      setCaptureComments(res.data.results || res.data);
      setSurvey((prev) => ({
        ...prev,
        observations: prev.observations.map((obs) =>
          obs.id === viewedObservation.id ? { ...obs, comment_count: (obs.comment_count || 0) + 1 } : obs
        ),
      }));
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const viewedObsIncomplete = viewedObservation && (!viewedObservation.image || !viewedObservation.title?.trim());
  const anyIncomplete = viewingIndex !== null ? viewedObsIncomplete : draftIncomplete;

  // observations array is newest-first (API ordering = -created_at)
  // Back = toward older (higher index), Forward = toward newer (lower index)
  const canStepBack = viewingIndex === null
    ? observations.length > 0
    : viewingIndex < observations.length - 1;

  const resetEditState = () => {
    if (editingField !== null) modalClosedAtRef.current = Date.now();
    setEditingField(null);
    setEditValue("");
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
          <div className="fw-semibold" style={{ fontSize: "0.95rem", lineHeight: 1.2 }}>
            {viewingIndex !== null
              ? `Obs ${observations.length - viewingIndex} of ${observations.length}`
              : `Add Obs #${observationCount + 1}`}
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
              }}
            >
              {viewingIndex !== null ? (
                <>
                  {survey.site_name || survey.site || ""}{" \u00B7 "}
                  {viewedObservation && new Date(viewedObservation.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{" \u00B7 "}
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
          onClick={anyIncomplete ? undefined : closeSurvey}
          disabled={anyIncomplete}
          style={{ transform: "scale(0.85)", marginLeft: "auto", opacity: anyIncomplete ? 0.3 : 1 }}
        />
      </div>

      <div className="survey-capture-body">
        {viewedObservation && (
          <div className="pt-2 px-3">
            <div className="d-flex flex-column" style={{ gap: "1.25rem" }}>
              {/* Image block */}
              <div
                onClick={() => {
                  if (viewedObservation.image) {
                    setPreviewImageUrl(viewedObservation.image);
                    setShowPreviewImageModal(true);
                  } else {
                    previewFileInputRef.current?.click();
                  }
                }}
                style={{
                  width: "336px",
                  maxWidth: "100%",
                  height: "168px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  overflow: "hidden",
                  backgroundColor: "#687374",
                  margin: "0 auto",
                }}
              >
                {viewedObservation.image ? (
                  <img src={viewedObservation.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="d-flex flex-column align-items-center gap-2">
                    <span className="text-center" style={{ color: "#faf6ef", fontSize: "1.1rem", fontWeight: 600 }}>Awaiting image</span>
                    <img src="/datumise-add.svg" alt="" width="28" height="28" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)", opacity: 0.8 }} />
                  </div>
                )}
              </div>

              {/* Observation block */}
              {viewedObservation.title?.trim() ? (
                <div style={{ width: "336px", maxWidth: "100%", margin: "0 auto" }}>
                  <fieldset className="rounded-top pt-0 pb-1 px-2 d-flex flex-column" style={{ backgroundColor: "#f0ece4", border: "none", overflow: "hidden" }}>
                    <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">Observation</legend>
                    <div
                      className="p-1 flex-grow-1"
                      style={{ lineHeight: "1.2", overflowWrap: "break-word", wordBreak: "normal", cursor: "pointer", minHeight: "100px" }}
                      onClick={() => { setEditingField("title"); setEditValue(viewedObservation.title || ""); }}
                    >
                      {viewedObservation.title}
                    </div>
                  </fieldset>
                  {copiedToDraft ? (
                    <button
                      type="button"
                      className="w-100 text-center"
                      style={{ background: "#006400", color: "#faf6ef", padding: "0.85rem", fontSize: "0.98rem", fontWeight: 600, fontStyle: "italic", border: "none", borderRadius: 0, cursor: "pointer" }}
                      onClick={() => {
                        resetEditState();
                        setCopiedToDraft(false);
                        setViewingIndex(null);
                      }}
                    >
                      Copied to draft - tap tick to confirm
                    </button>
                  ) : viewedObservation.image ? (
                    <button
                      type="button"
                      className="w-100"
                      style={{ background: "#1a5bc4", color: "#faf6ef", border: "none", padding: "0.85rem", fontSize: "0.98rem", fontWeight: 600, cursor: "pointer", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                      onClick={() => {
                        const draft = JSON.parse(localStorage.getItem("datumise-observation-draft") || "{}");
                        draft.title = viewedObservation.title;
                        localStorage.setItem("datumise-observation-draft", JSON.stringify(draft));
                        setCopiedToDraft(true);
                      }}
                    >
                      <img src="/copy.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
                      Copy to draft
                    </button>
                  ) : null}
                </div>
              ) : (
                <div
                  onClick={() => { setEditingField("title"); setEditValue(""); }}
                  style={{
                    width: "336px",
                    maxWidth: "100%",
                    height: "168px",
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
                    <span className="text-center" style={{ color: "#faf6ef", fontSize: "1.1rem", fontWeight: 600 }}>Awaiting observation</span>
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
              onPauseSurvey={anyIncomplete ? null : startPauseCountdown}
              onClose={anyIncomplete ? null : startPauseCountdown}
              onSuccess={handleSuccess}
              captureMode
              actionBarTarget={actionBarEl}
              anyIncomplete={anyIncomplete}
              onDraftIncomplete={setDraftIncomplete}
              onStepBack={canStepBack && !(viewingIndex !== null ? viewedObsIncomplete : draftIncomplete) ? handleStepBack : null}
              onStepForward={viewingIndex !== null && !viewedObsIncomplete ? handleStepForward : null}
              isViewingPrevious={viewingIndex !== null}
              onReturnToCurrent={() => {
                resetEditState();
                setCopiedToDraft(false);
                setViewingIndex(null);
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
              onShowObsList={() => setShowObsListModal(true)}
              onBecomeVisible={viewingIndex === null}
              copiedToDraft={copiedToDraft}
              onCancelCopy={() => setCopiedToDraft(false)}
              onDraftStatus={(hasTitle, hasImage) => { setDraftHasTitle(hasTitle); setDraftHasImage(hasImage); }}
            />
          </div>
        <div className="text-center" style={{
          fontSize: "0.82rem",
          color: "#db440a",
          padding: "0.4rem 0",
          fontWeight: 700,
          fontStyle: "italic",
          visibility: (viewingIndex === null && ((draftHasTitle && !draftHasImage) || (!draftHasTitle && draftHasImage))) || (viewingIndex !== null && viewedObsIncomplete) ? "visible" : "hidden",
        }}>
          {viewingIndex !== null
            ? (!viewedObservation?.image ? "Add image to proceed" : "Add observation to proceed")
            : (draftHasTitle && !draftHasImage ? "Add image to proceed" : "Add observation to proceed")}
        </div>
      </div>
      <div className="survey-capture-actions" ref={setActionBarEl}>
      </div>

      {/* Hidden file input for changing previous observation image */}
      <input
        ref={previewFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (event) => {
          const selectedFile = event.target.files[0];
          if (!selectedFile || !viewedObservation) return;
          const formData = new FormData();
          formData.append("title", viewedObservation.title);
          formData.append("description", viewedObservation.description || "");
          formData.append("image", selectedFile);
          try {
            await api.put(`/api/observations/${viewedObservation.id}/`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            fetchSurvey();
          } catch (err) {
            console.error("Error replacing image:", err);
          }
          event.target.value = null;
        }}
      />

      {/* Image preview modal for previous observations */}
      <Modal
        show={showPreviewImageModal}
        onHide={() => setShowPreviewImageModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1rem" }}>Image preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-0" style={{ background: "#2c3e50", overflow: "hidden" }}>
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Observation"
              className="img-fluid"
              style={{ maxHeight: "calc(100vh - 160px)", objectFit: "contain", width: "100%" }}
            />
          )}
        </Modal.Body>
        <div className="survey-capture-actions">
          <div className="capture-footer-grid">
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Close"
              onClick={() => setShowPreviewImageModal(false)}
              style={{ background: "#2c3e50" }}
            >
              <img src="/datumise-return.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Change Image"
              onClick={() => { setShowPreviewImageModal(false); previewFileInputRef.current?.click(); }}
              style={{ background: "#db440a" }}
            >
              <img src="/camera.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Confirm"
              onClick={() => setShowPreviewImageModal(false)}
              style={{ background: "#006400" }}
            >
              <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Delete image"
              onClick={async () => {
                if (viewedObservation) {
                  try {
                    const formData = new FormData();
                    formData.append("title", viewedObservation.title || "");
                    formData.append("image", "");
                    await api.patch(`/api/observations/${viewedObservation.id}/`, { image: null });
                    fetchSurvey();
                  } catch (err) {
                    console.error("Failed to delete image:", err);
                  }
                }
                setShowPreviewImageModal(false);
              }}
              style={{ background: "#95a5a6" }}
            >
              <div className="d-flex flex-column align-items-center">
                <img src="/clear.svg" alt="" width="40" height="40" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
                <span style={{ fontSize: "0.78rem", color: "#faf6ef", marginTop: "2px", fontWeight: 700 }}>Clear</span>
              </div>
            </button>
          </div>
        </div>
      </Modal>

      {/* Field edit modal */}
      <Modal
        show={editingField !== null}
        onHide={() => resetEditState()}
        dialogClassName="modal-bottom"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1rem" }}>{editingField === "title" ? "Edit Observation" : "Edit Notes"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-2" style={{ backgroundColor: "#faf6ef" }}>
          <textarea
            className="form-control"
            rows={editingField === "title" ? 4 : 8}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            maxLength={editingField === "title" ? 120 : 280}
            autoFocus
            style={{ resize: "none", lineHeight: "1.25", fontSize: "0.9rem", backgroundColor: editValue.trim() ? "#f0ece4" : "#ecf0f1", border: "none" }}
          />
          <div className="d-flex justify-content-between" style={{ marginTop: "0.65rem", marginBottom: "0.5rem" }}>
            <small style={{ fontSize: "0.72rem", color: editingField === "title" ? (editValue.length >= 120 ? "#2c3e50" : editValue.length >= 100 ? "#e67e22" : "#2c3e50") : (editValue.length >= 280 ? "#2c3e50" : editValue.length >= 240 ? "#e67e22" : "#2c3e50") }}>
              {editValue.length} / {editingField === "title" ? 120 : 280}
            </small>
          </div>
        </Modal.Body>
        {editingField === "title" && !editValue.trim() && (
          <div className="text-center" style={{ fontSize: "0.82rem", color: "#db440a", padding: "0.4rem 0", fontWeight: 700, fontStyle: "italic", background: "#faf6ef" }}>
            Add observation to proceed
          </div>
        )}
        <div className="survey-capture-actions">
          <div className="capture-footer-grid">
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Cancel"
              onClick={() => resetEditState()}
              style={{ background: "#2c3e50" }}
            >
              <img src="/datumise-return.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Copy to draft"
              onClick={() => {
                const draft = JSON.parse(localStorage.getItem("datumise-observation-draft") || "{}");
                draft.title = editValue;
                localStorage.setItem("datumise-observation-draft", JSON.stringify(draft));
                setCopiedToDraft(true);
                resetEditState();
              }}
              style={{ background: "#1a5bc4" }}
            >
              <img src="/datumise-edit.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
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
          </div>
        </div>
      </Modal>

      {/* Observations list modal */}
      <Modal
        show={showObsListModal}
        onHide={() => setShowObsListModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1rem" }}>Observations ({observations.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "60vh", overflowY: "auto", padding: "0.5rem" }}>
          {observations.length === 0 ? (
            <p className="text-muted text-center py-3">No observations yet.</p>
          ) : (
            observations.map((obs, idx) => {
              const imgSrc = obs.image && obs.image.startsWith("/")
                ? `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}${obs.image}`
                : obs.image;
              return (
              <div
                key={obs.id}
                className="d-flex align-items-center gap-2 py-2 px-2"
                style={{ borderBottom: idx < observations.length - 1 ? "1px solid #eee" : "none", cursor: "pointer" }}
                onClick={() => {
                  setViewingIndex(idx);
                  setShowObsListModal(false);
                  setCopiedToDraft(false);
                }}
              >
                <div style={{ width: "60px", height: "60px", flexShrink: 0, borderRadius: "6px", overflow: "hidden", backgroundColor: "#ecf0f1" }}>
                  {imgSrc ? (
                    <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      <span className="text-muted" style={{ fontSize: "0.65rem" }}>No image</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    #{observations.length - idx} {obs.title || "Untitled"}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                    {new Date(obs.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
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
