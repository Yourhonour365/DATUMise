import React, { useEffect, useState } from "react";
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
  const [viewingIndex, setViewingIndex] = useState(null);

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
    setViewingIndex(null);
    setSuccessMessage(false);
    setTimeout(() => setSuccessMessage(true), 100);
    setTimeout(() => setSuccessMessage(false), 3000);
  };

  const observations = survey?.observations || [];
  const viewedObservation = viewingIndex !== null ? observations[viewingIndex] : null;

  const canStepBack = viewingIndex === null
    ? observations.length > 0
    : viewingIndex > 0;

  const handleStepBack = () => {
    if (viewingIndex === null) {
      if (observations.length > 0) setViewingIndex(observations.length - 1);
    } else if (viewingIndex > 0) {
      setViewingIndex(viewingIndex - 1);
    }
  };

  const handleStepForward = () => {
    if (viewingIndex !== null) {
      if (viewingIndex < observations.length - 1) {
        setViewingIndex(viewingIndex + 1);
      } else {
        setViewingIndex(null);
      }
    }
  };

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
            {viewingIndex !== null
              ? `Observation #${viewingIndex + 1}`
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
          onClick={() => navigate(`/surveys/${id}`)}
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
            {viewedObservation.image && (
              <img
                src={viewedObservation.image}
                alt={viewedObservation.title}
                className="img-fluid rounded mb-3"
                style={{ maxHeight: "50vh", objectFit: "contain", width: "100%" }}
              />
            )}
            <p className="fw-semibold mb-1">{viewedObservation.title}</p>
            {viewedObservation.description && (
              <p className="text-muted mb-1" style={{ fontSize: "0.9rem" }}>
                {viewedObservation.description}
              </p>
            )}
          </div>
        )}
        <div style={viewingIndex !== null ? { display: "none" } : undefined}>
          <ObservationCreateForm
            surveyId={survey.id}
            onPauseSurvey={pauseSurvey}
            onClose={() => navigate(`/surveys/${id}`)}
            onSuccess={handleSuccess}
            captureMode
            actionBarTarget={actionBarEl}
            onStepBack={canStepBack ? handleStepBack : null}
            onStepForward={viewingIndex !== null ? handleStepForward : null}
            isViewingPrevious={viewingIndex !== null}
            onReturnToCurrent={() => setViewingIndex(null)}
          />
        </div>
      </div>
      <div className="survey-capture-actions" ref={setActionBarEl} />
    </div>
  );
}

export default SurveyCapture;
