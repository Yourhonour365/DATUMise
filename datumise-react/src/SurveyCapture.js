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
    setSuccessMessage(false);
    setTimeout(() => setSuccessMessage(true), 100);
    setTimeout(() => setSuccessMessage(false), 3000);
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
          <div className="fw-semibold" style={{ fontSize: "1.1rem" }}>
            Add Observation #{observationCount + 1}
          </div>
          <div style={{ fontSize: "0.72rem", position: "relative", minHeight: "1rem" }}>
            <span
              className="text-muted"
              style={{
                opacity: successMessage ? 0 : 1,
                transition: "opacity 0.9s ease",
                position: "absolute",
                left: 0,
                top: 0,
              }}
            >
              {survey.name} &middot; Duration{" "}
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
        <Link
          to={`/surveys/${id}`}
          className="btn btn-outline-secondary btn-sm"
        >
          Back
        </Link>
      </div>

      <div className="survey-capture-body">
        <ObservationCreateForm
          surveyId={survey.id}
          onPauseSurvey={pauseSurvey}
          onClose={() => navigate(`/surveys/${id}`)}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}

export default SurveyCapture;
