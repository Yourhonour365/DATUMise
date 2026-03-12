import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";


function SurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observationSuccess, setObservationSuccess] = useState(false);
  const [observationFading, setObservationFading] = useState(false);
  const [observationCount, setObservationCount] = useState(0);
  const [durationTick, setDurationTick] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const observationsListRef = useRef(null);

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


    const startSurvey = async () => {
        try {
            const response = await api.patch(`/api/surveys/${id}/`, {
            status: "live",
            });
            setSurvey(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    const pauseSurvey = async () => {
        try {
            const response = await api.patch(`/api/surveys/${id}/`, {
            status: "paused",
            });
            setSurvey(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    const resumeSurvey = async () => {
  try {
    const response = await api.patch(`/api/surveys/${id}/`, {
      status: "live",
    });
    setSurvey(response.data);
    navigate(`/surveys/${id}/capture`);
  } catch (err) {
    console.log(err);
  }
};

    const submitSurvey = async () => {
        const confirmed = window.confirm(
            "Submit survey?\n\n" +
            "The survey will be finalised and no further observations can be added."
        );

        if (!confirmed) return;

        try {
            await api.patch(`/api/surveys/${id}/`, {
                status: "submitted",
            });
            window.location.reload();
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
    if (survey) {
      setObservationCount(survey.observations?.length || 0);
    }
    }, [survey]);

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

  return (
    <div className="container mt-3">

      {!localStorage.getItem("token") && (
        <p className="text-muted">Please log in to view survey details.</p>
      )}

      {loading && <p>Loading survey...</p>}

      {!loading && survey && (
        <>
          {/* ---- Header: title + status + actions ---- */}
          <div className="d-flex align-items-start justify-content-between mb-2 gap-2 flex-wrap">
            <div style={{ minWidth: 0 }}>
              <h4 className="mb-1" style={{ lineHeight: 1.2 }}>
                {survey.urgent && (
                  <span className="badge bg-danger me-2" style={{ fontSize: "0.65rem", verticalAlign: "middle" }}>URGENT</span>
                )}
                {survey.name}
              </h4>
              <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: "0.82rem" }}>
                <span
                  className={`badge ${
                    survey.status === "created" ? "bg-secondary" :
                    survey.status === "live" ? "bg-success" :
                    survey.status === "paused" ? "bg-warning text-dark" :
                    survey.status === "completed" ? "bg-primary" :
                    survey.status === "submitted" ? "bg-dark" : ""
                  }`}
                  style={{ fontSize: "0.7rem" }}
                >
                  {survey.status_display}
                </span>
                <span>
                  {new Date(survey.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </span>
                {survey.status === "live" && (
                  <span className="d-inline-flex align-items-center gap-1">
                    <img src="/datumise_timer.svg" alt="" width="11" height="11" style={{ opacity: 0.55 }} />
                    {formatSurveyDuration(survey.created_at, durationTick)}
                  </span>
                )}
              </div>
            </div>
            <div className="d-flex gap-2 flex-shrink-0 flex-wrap">
              {survey.status === "created" && (
                <button className="btn btn-success btn-sm" onClick={startSurvey}>Start</button>
              )}
              {survey.status === "live" && (
                <>
                  <button className="btn btn-warning btn-sm" onClick={pauseSurvey}>Pause</button>
                  <button className="btn btn-dark btn-sm" onClick={submitSurvey}>Submit</button>
                  <button
                    className="btn btn-outline-success btn-sm d-none d-lg-inline-block"
                    onClick={() => setShowObservationModal(true)}
                  >
                    + Observation
                  </button>
                  <Link
                    to={`/surveys/${id}/capture`}
                    className="btn btn-outline-success btn-sm d-lg-none"
                  >
                    + Observation
                  </Link>
                </>
              )}
              {survey.status === "paused" && (
                <button className="btn btn-success btn-sm" onClick={resumeSurvey}>Resume</button>
              )}
            </div>
          </div>

          {/* ---- Collapsible survey details ---- */}
          <div className="mb-3">
            <button
              type="button"
              className="btn btn-link btn-sm text-muted p-0 text-decoration-none"
              onClick={() => setShowDetails((prev) => !prev)}
              style={{ fontSize: "0.78rem" }}
            >
              {showDetails ? "Hide details" : "Survey details"}
              <span className="ms-1" style={{ fontSize: "0.6rem" }}>{showDetails ? "\u25B2" : "\u25BC"}</span>
            </button>
            {showDetails && (
              <div className="survey-details-grid mt-2">
                <div className="survey-detail-item">
                  <span className="survey-detail-label">Client</span>
                  <span>{survey.client || "Not set"}</span>
                </div>
                <div className="survey-detail-item">
                  <span className="survey-detail-label">Site</span>
                  <span>{survey.site || "Not set"}</span>
                </div>
                <div className="survey-detail-item">
                  <span className="survey-detail-label">Surveyor</span>
                  <span>{survey.assigned_to || "Unassigned"}</span>
                </div>
                <div className="survey-detail-item">
                  <span className="survey-detail-label">Created by</span>
                  <span>{survey.created_by || "Unknown"}</span>
                </div>
                <div className="survey-detail-item">
                  <span className="survey-detail-label">Client ID</span>
                  <span>{survey.client_id || "Not set"}</span>
                </div>
                <div className="survey-detail-item">
                  <span className="survey-detail-label">Site ID</span>
                  <span>{survey.site_id || "Not set"}</span>
                </div>
                <div className="survey-detail-item">
                  <span className="survey-detail-label">Client present</span>
                  <span>{survey.client_present ? "Yes" : "No"}</span>
                </div>
              </div>
            )}
          </div>

          {/* ---- Observations toolbar ---- */}
          <h6 className="mb-2">
            Observations
            <span className="text-muted fw-normal ms-1" style={{ fontSize: "0.85rem" }}>
              ({survey.observations?.length || 0})
            </span>
          </h6>

          {/* ---- Observation list ---- */}
          {survey.observations?.length === 0 && (
            <p className="text-muted" style={{ fontSize: "0.85rem" }}>
              No observations have been added to this survey yet.
            </p>
          )}

          <div id="observations-list">
            {survey?.observations?.map((observation, index) => (
              <Link
                key={observation.id}
                to={
                  `/surveys/${id}/capture`
                }
                state={
                  { viewObservationId: observation.id }
                }
                className="text-decoration-none text-dark"
              >
                <div className="observation-row">
                  {observation.image ? (
                    <img
                      src={observation.image}
                      alt=""
                      className="observation-row-thumb"
                    />
                  ) : (
                    <div className="observation-row-thumb observation-row-thumb-empty">
                      <span style={{ fontSize: "0.65rem" }}>No img</span>
                    </div>
                  )}
                  <div className="observation-row-content">
                    <div className="observation-row-title">{observation.title}</div>
                    {observation.description && (
                      <div className="observation-row-desc">{observation.description}</div>
                    )}
                    <div className="observation-row-meta">
                      <span>#{survey.observations.length - index}</span>
                      <span>
                        {new Date(observation.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
        <Modal
          show={showObservationModal}
          onHide={() => {
            const draft = localStorage.getItem("datumise-observation-draft");
            const image = localStorage.getItem("datumise-observation-image");

            const hasText =
              draft && JSON.parse(draft) && (
                JSON.parse(draft).title?.trim() ||
                JSON.parse(draft).description?.trim()
              );

            const hasImage = !!image;

            if (hasText || hasImage) {
              const confirmed = window.confirm(
                "Close observation?\n\nYour draft will be saved, but this observation has not been saved to the survey yet."
              );
              if (!confirmed) return;
            }

            setShowObservationModal(false);
          }}
          centered
          dialogClassName="observation-modal"
        >
          <Modal.Header closeButton className="px-3">
              <Modal.Title>
                <div className="fw-semibold">
                  Add Observation #{observationCount + 1}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    lineHeight: "1",
                    minHeight: "1rem",
                    position: "relative",
                    marginTop: "0.25rem",
                  }}
                >
                  <span
                    className="text-muted"
                    style={{
                      opacity: observationSuccess ? 0 : 1,
                      transition: "opacity 0.9s ease",
                      position: "absolute",
                      left: 0,
                      top: 0,
                    }}
                  >
                    Duration {formatSurveyDuration(survey?.created_at, durationTick)}
                  </span>
                  <span
                    className="text-success fw-light"
                    style={{
                      opacity: observationSuccess ? 1 : 0,
                      transition: "opacity 0.9s ease",
                      position: "absolute",
                      left: 0,
                      top: 0,
                    }}
                  >
                    Observation Added
                  </span>
                </div>
              </Modal.Title>
            </Modal.Header>
              <Modal.Body className="pt-2 pb-3">
                <ObservationCreateForm
                  surveyId={survey?.id}
                  onPauseSurvey={pauseSurvey}

                  onClose={() => {
                    setShowObservationModal(false);
                  }}




                  onSuccess={(newObservation) => {
                    setObservationCount((prev) => prev + 1);

                    setSurvey((prev) => ({
                      ...prev,
                      observations: [...(prev.observations || []), newObservation],
                    }));

                    fetchSurvey();

                    setObservationSuccess(false);

                    setTimeout(() => {
                      setObservationSuccess(true);
                    }, 300);
                    setObservationFading(false);

                    setTimeout(() => {
                      setObservationFading(true);
                    }, 1200);

                    setTimeout(() => {
                      setObservationSuccess(false);
                    }, 3200);
                  }}




                />
              </Modal.Body>

            </Modal>
    </div>
  );
}

export default SurveyDetail;
