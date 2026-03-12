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

  const closeSurvey = () => {
    if (survey?.status === "live") {
      pauseSurvey();
    } else {
      navigate(`/surveys/${id}`);
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
      setShowPreviewImageModal(false);
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
            <small className="text-muted d-block mb-2">
              {new Date(viewedObservation.created_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>

            {viewedObservation.image ? (
              <img
                src={viewedObservation.image}
                alt={viewedObservation.title}
                className="rounded mb-3"
                onClick={() => isLive && setShowPreviewImageModal(true)}
                style={{ width: "100%", height: "220px", objectFit: "cover", cursor: isLive ? "pointer" : "default" }}
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
              onReturnToCurrent={() => { resetEditState(); setViewingIndex(null); }}
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
              className="capture-action-btn capture-action-secondary"
              aria-label="Previous observation"
            >
              <img src="/datumise_back.svg" alt="" width="20" height="20" />
            </button>
            <button
              type="button"
              onClick={handleStepForward}
              disabled={viewingIndex === null || viewingIndex <= 0}
              className="capture-action-btn capture-action-secondary"
              aria-label="Next observation"
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
              onClick={() => navigate(`/surveys/${id}`)}
              className="capture-action-btn capture-action-primary"
              aria-label="Back to survey"
            >
              <img src="/datumise_ok.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1)" }} />
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
        <Modal.Header closeButton>
          <Modal.Title>Image preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {viewedObservation?.image && (
            <img
              src={viewedObservation.image}
              alt="Observation"
              className="img-fluid"
              style={{ maxHeight: "70vh", objectFit: "contain" }}
            />
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center gap-4 border-0 pt-0">
          <button
            type="button"
            onClick={handleDeleteImage}
            disabled={isSavingEdit}
            className="capture-action-btn capture-action-danger"
            aria-label="Delete image"
          >
            <img src="/datumise_delete.svg" alt="" width="20" height="20" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPreviewImageModal(false);
              previewFileInputRef.current?.click();
            }}
            className="capture-action-btn capture-action-secondary"
            aria-label="Replace image"
          >
            <img src="/camera.svg" alt="" width="26" height="26" />
          </button>
          <button
            type="button"
            onClick={() => setShowPreviewImageModal(false)}
            className="capture-action-btn capture-action-confirm"
            aria-label="Keep image"
          >
            <img src="/datumise_ok.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1)" }} />
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
        <Modal.Body>
          <textarea
            className="form-control"
            rows={editingField === "title" ? 4 : 3}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            maxLength={editingField === "title" ? 120 : undefined}
            autoFocus
            style={{ resize: "none", lineHeight: "1.3" }}
          />
          {editingField === "title" && (
            <small className="text-muted" style={{ fontSize: "0.72rem" }}>
              {editValue.length} / 120
            </small>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center gap-4 border-0 pt-0">
          <button
            type="button"
            onClick={() => resetEditState()}
            className="capture-action-btn capture-action-secondary"
            aria-label="Cancel"
          >
            <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>&times;</span>
          </button>
          <button
            type="button"
            onClick={() => setEditValue("")}
            disabled={!editValue}
            className="capture-action-btn capture-action-danger"
            aria-label="Clear text"
          >
            <img src="/datumise_delete.svg" alt="" width="20" height="20" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
          <button
            type="button"
            disabled={isSavingEdit || (editingField === "title" && !editValue.trim())}
            onClick={saveField}
            className="capture-action-btn capture-action-confirm"
            aria-label="Save"
          >
            <img src="/datumise_ok.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default SurveyCapture;
