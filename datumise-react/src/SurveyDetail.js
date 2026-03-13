import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";


function SurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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

const hasScrolledRef = useRef(false);
const scrollTarget = location.state?.scrollToObservation;
const [scrollReady, setScrollReady] = useState(!scrollTarget);
const [highlightedObs, setHighlightedObs] = useState(scrollTarget || null);

useLayoutEffect(() => {
  if (scrollTarget && survey?.observations && !hasScrolledRef.current) {
    const el = document.getElementById(`obs-${scrollTarget}`);
    if (el) {
      hasScrolledRef.current = true;
      el.scrollIntoView({ block: "center", behavior: "instant" });
    }
    setHighlightedObs(scrollTarget);
    setScrollReady(true);
    window.history.replaceState({}, "");
    // Direct DOM highlight: set fill immediately, fade out after 1s
    const row = document.querySelector(`#obs-${scrollTarget} .observation-row`);
    if (row) {
      row.style.background = "#9a8255";
      row.style.transition = "none";
      setTimeout(() => {
        row.style.transition = "background 2s ease";
        row.style.background = "#f0ece4";
      }, 1000);
    }
  }
}, [survey?.observations, scrollTarget]);


    const startSurvey = async () => {
        if (!survey.assigned_to || !survey.is_surveyor) return;
        try {
            await api.patch(`/api/surveys/${id}/`, {
            status: "live",
            });
            fetchSurvey();
        } catch (err) {
            console.log(err);
        }
    };

    const pauseSurvey = async () => {
        try {
            await api.patch(`/api/surveys/${id}/`, {
            status: "paused",
            });
            fetchSurvey();
        } catch (err) {
            console.log(err);
        }
    };

    const resumeSurvey = async () => {
  if (!survey.assigned_to || !survey.is_surveyor) return;
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

    const assignSurvey = async () => {
        if (survey.status !== "planned" || survey.assigned_to) return;
        try {
            await api.post(`/api/surveys/${id}/assign/`);
            fetchSurvey();
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
      <div className="mb-3 d-none d-md-block">
        <Link to="/surveys" className="text-decoration-none">
          &larr; Back to Surveys
        </Link>
      </div>

      {!localStorage.getItem("token") && (
        <p className="text-muted">Please log in to view survey details.</p>
      )}

      {loading && <p>Loading survey...</p>}

      {!loading && survey && (
        <>
          {/* ---- Row 1: schedule + status + actions ---- */}
          <div className="d-flex align-items-center justify-content-between mb-1 gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
              <span style={{ fontSize: "0.92rem", fontWeight: 600, lineHeight: 1.2 }}>
                {(() => {
                  const scheduled = survey.scheduled_for ? new Date(survey.scheduled_for) : null;
                  const schedType = survey.schedule_type || "pending";
                  if (schedType === "pending") return "Pending";
                  if (schedType === "self_scheduling") return "Self-scheduled";
                  if (!scheduled) return survey.schedule_type_display || "Pending";
                  const dateStr = scheduled.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                  if (schedType === "provisional") return `${dateStr} \u00B7 Provisional`;
                  const hasTime = scheduled.getHours() !== 0 || scheduled.getMinutes() !== 0;
                  const timeStr = hasTime
                    ? scheduled.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                    : "";
                  return timeStr ? `${dateStr} \u00B7 ${timeStr}` : dateStr;
                })()}
              </span>
              {survey.status !== "paused" && (
                <span
                  className={`badge ${
                    survey.status === "planned" ? "bg-secondary" :
                    survey.status === "live" ? "bg-success" :
                    survey.status === "submitted" ? "bg-dark" :
                    survey.status === "missed" ? "bg-warning" :
                    survey.status === "cancelled" ? "bg-danger" : ""
                  }`}
                  style={{ fontSize: "0.7rem" }}
                >
                  {survey.status_display}
                </span>
              )}
              {survey.status === "live" && (
                <span className="d-inline-flex align-items-center gap-1 text-muted" style={{ fontSize: "0.78rem" }}>
                  <img src="/datumise_timer.svg" alt="" width="11" height="11" style={{ opacity: 0.55 }} />
                  {formatSurveyDuration(survey.created_at, durationTick)}
                </span>
              )}
            </div>
            <div className="d-flex gap-2 flex-shrink-0 flex-wrap align-items-center">
              {!survey.assigned_to && survey.status === "planned" && (
                <button className="btn btn-primary btn-sm" onClick={assignSurvey}>Assign to me</button>
              )}
              {survey.status === "planned" && survey.is_surveyor && survey.assigned_to && (
                <button className="btn btn-success btn-sm" onClick={startSurvey}>Start</button>
              )}
              {survey.status === "live" && survey.is_surveyor && (
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
              {survey.status === "paused" && survey.is_surveyor && survey.assigned_to && (
                <>
                  <button className="btn btn-success btn-sm" onClick={resumeSurvey}>Resume</button>
                  <button className="btn btn-dark btn-sm" onClick={submitSurvey}>Submit</button>
                </>
              )}
              <Link
                to={`/surveys/${id}/edit`}
                className="btn p-0 border-0 bg-transparent edit-icon-circle"
                onClick={(e) => e.stopPropagation()}
              >
                <img src="/datumise-edit.svg" alt="Edit" width="14" height="14" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
              </Link>
              <button
                type="button"
                className="btn p-0 border-0 bg-transparent"
                onClick={() => setShowDetails((prev) => !prev)}
                aria-label={showDetails ? "Hide survey details" : "Show survey details"}
                style={{ opacity: 0.4 }}
              >
                <img src="/datumise-down-chev.svg" alt="" width="16" height="16" style={{ transform: showDetails ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
              </button>
            </div>
          </div>

          {/* ---- Row 2: client / site ---- */}
          <div className="text-muted mb-0" style={{ fontSize: "0.82rem", fontWeight: 500 }}>
            {survey.client && survey.site
              ? `${survey.client} \u2013 ${survey.site}`
              : survey.client || survey.site || "No client / site"}
          </div>

          {/* ---- Row 3: due + surveyor + client present + urgent ---- */}
          <div className="d-flex align-items-center gap-2 text-muted mb-1 flex-wrap" style={{ fontSize: "0.78rem" }}>
            {survey.due_by && (
              <>
                <span>Due {new Date(survey.due_by).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span>{"\u00B7"}</span>
              </>
            )}
            <span>{survey.assigned_to || "Unassigned"}</span>
            <span>{"\u00B7"}</span>
            <span>{survey.client_present ? "Client attending" : "Client not attending"}</span>
            {survey.urgent && (
              <>
                <span>{"\u00B7"}</span>
                <span className="badge bg-danger" style={{ fontSize: "0.65rem" }}>URGENT</span>
              </>
            )}
          </div>

          {/* ---- Collapsible survey details ---- */}
          <div className="mb-3">
            {showDetails && (
              <>
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
                    <span className="survey-detail-label">Client attending</span>
                    <span>{survey.client_present ? "Yes" : "No"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Site contact</span>
                    <span>{survey.site_contact_name || "Not set"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Site contact phone</span>
                    <span>{survey.site_contact_phone || "Not set"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Site contact email</span>
                    <span>{survey.site_contact_email || "Not set"}</span>
                  </div>
                  {survey.notes && (
                    <div className="survey-detail-item" style={{ gridColumn: "1 / -1" }}>
                      <span className="survey-detail-label">Notes</span>
                      <span>{survey.notes}</span>
                    </div>
                  )}
                  {survey.access_notes && (
                    <div className="survey-detail-item" style={{ gridColumn: "1 / -1" }}>
                      <span className="survey-detail-label">Access notes</span>
                      <span style={{ whiteSpace: "pre-line" }}>{survey.access_notes}</span>
                    </div>
                  )}
                </div>
              </>
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

          <div id="observations-list" style={{ opacity: scrollReady ? 1 : 0 }}>
            {survey?.observations?.map((observation, index) => (
              <Link
                key={observation.id}
                id={`obs-${observation.id}`}
                to={`/observations/${observation.id}`}
                state={{ fromSurvey: true, surveyId: id }}
                className="text-decoration-none text-dark"
              >
                <div
                  className={`observation-row${highlightedObs === observation.id ? " observation-row-highlight" : ""}`}
                  onMouseEnter={() => { if (highlightedObs && highlightedObs !== observation.id) setHighlightedObs(null); }}
                >
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
                    {(observation.likes_count > 0 || observation.comment_count > 0) && (
                      <div className="observation-row-desc d-flex align-items-center gap-2">
                        {observation.likes_count > 0 && (
                          <span className="d-flex align-items-center gap-1">
                            <img src="/datumise-like.svg" alt="" width="12" height="12" style={{ opacity: 0.5 }} />
                            {observation.likes_count}
                          </span>
                        )}
                        {observation.comment_count > 0 && (
                          <span className="d-flex align-items-center gap-1">
                            <img src="/datumise-comment.svg" alt="" width="12" height="12" style={{ opacity: 0.5 }} />
                            {observation.comment_count}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="observation-row-meta">
                      <span>#{survey.observations.length - index} of {survey.observations.length}</span>
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

      <ReturnButton to={-1} />
      <BackToTop />
    </div>
  );
}

export default SurveyDetail;
