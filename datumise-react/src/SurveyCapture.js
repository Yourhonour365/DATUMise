import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";

function SurveyCapture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [observationCount, setObservationCount] = useState(0);
  const [durationTick, setDurationTick] = useState(0);
  const [successMessage, setSuccessMessage] = useState(false);
  const [actionBarEl, setActionBarEl] = useState(null);
  const [showPrevious, setShowPrevious] = useState(false);

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
      navigate(`/surveys/${id}`);
    } catch (err) {
      console.log(err);
    }
  };

  const handleSuccess = (newObservation) => {
    setObservationCount((prev) => prev + 1);
    setSurvey((prev) => ({
      ...prev,
      observations: [...(prev.observations || []), newObservation],
    }));
    setSuccessMessage(false);
    setTimeout(() => setSuccessMessage(true), 100);
    setTimeout(() => setSuccessMessage(false), 3000);
  };

  const previousObservation = survey?.observations?.length
    ? survey.observations[survey.observations.length - 1]
    : null;

  if (loading) return <p className="container mt-4">Loading survey...</p>;

  if (!survey) return <p className="container mt-4">Survey not found.</p>;

  if (survey.status !== "live") {
    return (
      <div className="container mt-4">
        <p>This survey is not currently live.</p>
        <Link to={`/surveys/${id}`} className="btn btn-outline-primary">
          Back to Survey
        </Link>
      </div>
    );
  }

  return (
    <div className="survey-capture">
      <div className="survey-capture-header">
        <div>
          <div className="fw-semibold" style={{ fontSize: "0.95rem", lineHeight: 1.2 }}>
            Add Observation #{observationCount + 1}
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
          onClick={() => navigate(`/surveys/${id}`)}
        />
      </div>

      <div className="survey-capture-body">
        <ObservationCreateForm
          surveyId={survey.id}
          onPauseSurvey={pauseSurvey}
          onClose={() => navigate(`/surveys/${id}`)}
          onSuccess={handleSuccess}
          captureMode
          actionBarTarget={actionBarEl}
          onShowPrevious={previousObservation ? () => setShowPrevious(true) : null}
        />
      </div>
      <div className="survey-capture-actions" ref={setActionBarEl} />

      <Modal
        show={showPrevious}
        onHide={() => setShowPrevious(false)}
        centered
      >
        <Modal.Header closeButton className="py-2">
          <Modal.Title style={{ fontSize: "1rem" }}>
            Previous Observation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 pb-3">
          {previousObservation && (
            <>
              {previousObservation.image && (
                <img
                  src={previousObservation.image}
                  alt={previousObservation.title}
                  className="img-fluid rounded mb-3"
                  style={{ maxHeight: "40vh", objectFit: "contain", width: "100%" }}
                />
              )}
              <p className="fw-semibold mb-1">{previousObservation.title}</p>
              {previousObservation.description && (
                <p className="text-muted mb-1" style={{ fontSize: "0.9rem" }}>
                  {previousObservation.description}
                </p>
              )}
              <small className="text-muted">
                {new Date(previousObservation.created_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default SurveyCapture;
