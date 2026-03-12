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
  const [showPreviewImageModal, setShowPreviewImageModal] = useState(false);
  const previewFileInputRef = useRef(null);

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

  // If navigated with a specific observation to view, set the viewing index once data loads
  useEffect(() => {
    const targetId = location.state?.viewObservationId;
    if (targetId && survey?.observations) {
      const idx = survey.observations.findIndex((obs) => obs.id === targetId);
      if (idx !== -1) setViewingIndex(idx);
    }
  }, [survey?.observations, location.state?.viewObservationId]);

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

  const pauseSurvey = async () => {
    try {
      await api.patch(`/api/surveys/${id}/`, { status: "paused" });
    } catch (err) {
      console.log(err);
    }
    navigate(`/surveys/${id}`);
  };

  const resumeSurvey = async () => {
    try {
      const response = await api.patch(`/api/surveys/${id}/`, { status: "live" });
      setSurvey(response.data);
    } catch (err) {
      console.log(err);
    }
  };

  const returnPath = location.state?.returnPath || `/surveys/${id}`;
  const returnObsId = location.state?.viewObservationId;

  const goBack = () => {
    navigate(returnPath, { state: { scrollToObservation: returnObsId } });
  };

  const closeSurvey = () => {
    if (survey?.status === "live") {
      pauseSurvey();
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
    setViewingIndex(null);
    setSuccessMessage(false);
    setTimeout(() => setSuccessMessage(true), 100);
    setTimeout(() => setSuccessMessage(false), 3000);
  };

  const observations = survey?.observations || [];
  const viewedObservation = viewingIndex !== null ? observations[viewingIndex] : null;

  // observations array is newest-first (API ordering = -created_at)
  // Back = toward older (higher index), Forward = toward newer (lower index)
  const canStepBack = viewingIndex === null
    ? observations.length > 0
    : viewingIndex < observations.length - 1;

  const resetEditState = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleStepBack = () => {
    resetEditState();
    if (viewingIndex === null) {
      if (observations.length > 0) setViewingIndex(0);
    } else if (viewingIndex < observations.length - 1) {
      setViewingIndex(viewingIndex + 1);
    }
  };

  const handleStepForward = () => {
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

  const handleReplaceImage = async (file) => {
    if (!viewedObservation || !file) return;
    setIsSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append("title", viewedObservation.title);
      formData.append("description", viewedObservation.description || "");
      formData.append("image", file);
      const response = await api.put(`/api/observations/${viewedObservation.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSurvey((prev) => ({
        ...prev,
        observations: prev.observations.map((obs) =>
          obs.id === viewedObservation.id ? { ...obs, image: response.data.image } : obs
        ),
      }));
      setShowPreviewImageModal(true);
    } catch (err) {
      console.error("Failed to replace image:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!viewedObservation) return;
    setIsSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append("title", viewedObservation.title);
      formData.append("description", viewedObservation.description || "");
      formData.append("image", "");
      await api.put(`/api/observations/${viewedObservation.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSurvey((prev) => ({
        ...prev,
        observations: prev.observations.map((obs) =>
          obs.id === viewedObservation.id ? { ...obs, image: null } : obs
        ),
      }));
      setShowPreviewImageModal(false);
    } catch (err) {
      console.error("Failed to delete image:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (loading) return <p className="container mt-4">Loading survey...</p>;

  if (!survey) return <p className="container mt-4">Survey not found.</p>;

  const isLive = survey.status === "live";
  const isViewOnly = !isLive;

  return (
    <div className="survey-capture">
      <div className="survey-capture-header">
        <div>
          <div className="fw-semibold" style={{ fontSize: "0.95rem", lineHeight: 1.2 }}>
            {viewingIndex !== null
              ? `Observation #${observations.length - viewingIndex}`
              : isViewOnly
              ? `${survey.name}`
              : `Add Observation #${observationCount + 1}`}
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
              {survey.name}{" "}
              {new Date(survey.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
              <img src="/datumise_timer.svg" alt="" width="11" height="11" style={{ opacity: 0.55 }} />
              {formatSurveyDuration(survey.created_at, durationTick)}
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
          <div className="observation-preview">
            <small className="text-muted d-block" style={{ fontSize: "0.7rem", paddingTop: "0.15rem", paddingBottom: "0.15rem" }}>
              {new Date(viewedObservation.created_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {viewedObservation.owner && ` • ${viewedObservation.owner}`}
            </small>

            {viewedObservation.image ? (
              <img
                src={viewedObservation.image}
                alt={viewedObservation.title}
                className="rounded mb-3"
                onClick={() => setShowPreviewImageModal(true)}
                style={{ width: "100%", height: "220px", objectFit: "cover", cursor: "pointer" }}
              />
            ) : isLive ? (
              <div
                onClick={() => previewFileInputRef.current?.click()}
                className="mb-3"
                style={{
                  width: "100%",
                  height: "220px",
                  border: "1px dashed #bbb",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backgroundColor: "#f8f9fa",
                }}
              >
                <span className="text-muted text-center">
                  Add image<br /><strong>+</strong>
                </span>
              </div>
            ) : (
              <div
                className="mb-3"
                style={{
                  width: "100%",
                  height: "220px",
                  border: "1px dashed #bbb",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f8f9fa",
                }}
              >
                <span className="text-muted">No image</span>
              </div>
            )}

            {/* Observation field */}
            <fieldset className="border rounded pt-0 pb-1 px-2 mb-2">
              <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
                Observation
              </legend>
              <div className="d-flex justify-content-between align-items-start p-1">
                <span style={{
                  lineHeight: "1.2",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  height: "calc(1.2em * 4)",
                }}>{viewedObservation.title}</span>
                {isLive && (
                  <button
                    type="button"
                    className="field-clear-btn ms-2"
                    style={{ flexShrink: 0 }}
                    onClick={() => {
                      setEditValue(viewedObservation.title);
                      setEditingField("title");
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </fieldset>

            {/* Notes field */}
            <fieldset className="border rounded pt-0 pb-1 px-2">
              <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0">
                Notes
              </legend>
              <div className="d-flex justify-content-between align-items-start p-1">
                <span className="text-muted" style={{
                  lineHeight: "1.2",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  height: "calc(1.2em * 4)",
                }}>
                  {viewedObservation.description || <em className="text-muted">No notes</em>}
                </span>
                {isLive && (
                  <button
                    type="button"
                    className="field-clear-btn ms-2"
                    style={{ flexShrink: 0 }}
                    onClick={() => {
                      setEditValue(viewedObservation.description || "");
                      setEditingField("description");
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </fieldset>
          </div>
        )}
        {isViewOnly && viewingIndex === null && (
          <div className="text-center text-muted mt-4">
            <p>Tap an observation to review.</p>
            {observations.length > 0 && (
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setViewingIndex(0)}>
                View latest observation
              </button>
            )}
          </div>
        )}
        {isLive && (
          <div style={viewingIndex !== null ? { display: "none" } : undefined}>
            <ObservationCreateForm
              surveyId={survey.id}
              onPauseSurvey={pauseSurvey}
              onClose={pauseSurvey}
              onSuccess={handleSuccess}
              captureMode
              actionBarTarget={actionBarEl}
              onStepBack={canStepBack ? handleStepBack : null}
              onStepForward={viewingIndex !== null ? handleStepForward : null}
              isViewingPrevious={viewingIndex !== null}
              onReturnToCurrent={(() => {
                const draft = localStorage.getItem("datumise-observation-draft");
                const draftImage = localStorage.getItem("datumise-observation-image");
                const hasDraft = draftImage || (draft && JSON.parse(draft).title?.trim());
                // Hide if on latest observation and draft is empty
                if (viewingIndex === 0 && !hasDraft) return null;
                return () => {
                  resetEditState();
                  if (hasDraft) {
                    setViewingIndex(null);
                  } else {
                    setViewingIndex(0);
                  }
                };
              })()}
              onCaptureForPrevious={() => previewFileInputRef.current?.click()}
            />
          </div>
        )}
      </div>
      <div className="survey-capture-actions" ref={setActionBarEl}>
        {isViewOnly && viewedObservation && (
          <div className="d-flex align-items-center justify-content-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleStepBack}
              disabled={!canStepBack}
              className="capture-action-btn"
              aria-label="Previous observation"
              style={{ background: "#ddf0e3", border: "none" }}
            >
              <img src="/datumise_back.svg" alt="" width="20" height="20" />
            </button>
            <button
              type="button"
              onClick={handleStepForward}
              disabled={viewingIndex === null || viewingIndex <= 0}
              className="capture-action-btn"
              aria-label="Next observation"
              style={{ background: "#ddf0e3", border: "none" }}
            >
              <img
                src="/datumise_next_.svg"
                alt=""
                width="20"
                height="20"
              />
            </button>
            {survey.status === "paused" && survey.is_surveyor && (
              <button
                type="button"
                onClick={resumeSurvey}
                className="capture-action-btn capture-action-confirm"
                aria-label="Resume survey"
                style={{ borderRadius: "50%", fontSize: "0.6rem", fontWeight: 600, color: "#fff", lineHeight: 1.2, textAlign: "center" }}
              >
                Resume<br />Survey
              </button>
            )}
            <button
              type="button"
              onClick={goBack}
              className="capture-action-btn"
              aria-label="Back to survey"
              style={{ background: "#dce7fa", border: "none" }}
            >
              <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
            </button>
          </div>
        )}
      </div>

      {/* Image preview modal for previous observations */}
      <input
        ref={previewFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="d-none"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) handleReplaceImage(file);
          e.target.value = "";
        }}
      />
      <Modal
        show={showPreviewImageModal}
        onHide={() => setShowPreviewImageModal(false)}
        centered
      >
        <Modal.Header closeButton className="py-1 px-3" style={{ minHeight: "auto" }}>
          <small className="text-muted">Image preview</small>
        </Modal.Header>
        <Modal.Body className="text-center p-1" style={{ background: "#2c3e50" }}>
          {viewedObservation?.image && (
            <img
              src={viewedObservation.image}
              alt="Observation"
              className="img-fluid"
              style={{ maxHeight: "80vh", objectFit: "contain" }}
            />
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center gap-4">
          <button
            type="button"
            onClick={handleDeleteImage}
            disabled={isSavingEdit}
            className="capture-action-btn capture-action-danger"
            aria-label="Delete image"
          >
            <img src="/datumise_delete.svg" alt="" width="26" height="26" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPreviewImageModal(false);
              previewFileInputRef.current?.click();
            }}
            className="capture-action-btn"
            aria-label="Replace image"
            style={{ background: "#FF7518", border: "none" }}
          >
            <img src="/camera.svg" alt="" width="26" height="26" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
          <button
            type="button"
            onClick={() => setShowPreviewImageModal(false)}
            className="capture-action-btn"
            aria-label="Save"
            style={{ background: "#008000", border: "none" }}
          >
            <img src="/datumise-confirm.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
          <button
            type="button"
            onClick={() => setShowPreviewImageModal(false)}
            className="capture-action-btn"
            aria-label="Go back"
            style={{ background: "#dce7fa", border: "none" }}
          >
            <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
          </button>
        </Modal.Footer>
      </Modal>

      {/* Field edit modal */}
      <Modal
        show={editingField !== null}
        onHide={() => resetEditState()}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{editingField === "title" ? "Edit Observation" : "Edit Notes"}</Modal.Title>
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
            {editValue.length > 0 && (
              <button
                type="button"
                className="field-clear-btn"
                onClick={() => setEditValue("")}
              >
                Clear
              </button>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center gap-4 flex-column">
          {editingField === "title" && !editValue.trim() && (
            <div style={{
              fontSize: "0.68rem",
              color: "#fef0e0",
              textAlign: "center",
              marginBottom: "-0.25rem",
            }}>
              Add observation to proceed
            </div>
          )}
          <div className="d-flex justify-content-center gap-4">
            <button
              type="button"
              disabled={isSavingEdit || (editingField === "title" && !editValue.trim())}
              onClick={saveField}
              className={`capture-action-btn ${editingField === "title" && !editValue.trim() ? "capture-action-warning" : ""}`}
              aria-label="Save"
              style={{ background: editingField === "title" && !editValue.trim() ? undefined : "#008000", border: "none" }}
            >
              <img src="/datumise-confirm.svg" alt="" width="22" height="22" style={{ filter: editingField === "title" && !editValue.trim() ? "invert(68%) sepia(5%) saturate(581%) hue-rotate(155deg) brightness(89%) contrast(88%)" : "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
            </button>
            <button
              type="button"
              onClick={() => resetEditState()}
              className="capture-action-btn"
              aria-label="Cancel"
              style={{ background: "#dce7fa", border: "none" }}
            >
              <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
            </button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default SurveyCapture;
