import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useParams, Link } from "react-router-dom";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";


function SurveyDetail() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observationSuccess, setObservationSuccess] = useState(false);
  const [observationFading, setObservationFading] = useState(false);
  const [observationCount, setObservationCount] = useState(0);
  const [durationTick, setDurationTick] = useState(0);
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
  } catch (err) {
    console.log(err);
  }
};

    const completeSurvey = async () => {
        try {
            await api.patch(`/api/surveys/${id}/`, {
                status: "completed",
            });
            window.location.reload();
        } catch (err) {
            console.log(err);
        }
    };

    const submitSurvey = async () => {
        const confirmed = window.confirm(
            "Submit survey for office review?\n\n" +
            "The office team will be able to start reviewing the report.\n" +
            "You can still add additional observations or comments if needed, " +
            "but these may be marked as post-submission additions."
        );

        if (!confirmed) return;

        try {
            await api.patch(`/api/surveys/${id}/`, {
                status: "submitted",
            });

            alert("Survey submitted for office review.");
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
    <div className="container mt-4">
      

      {!localStorage.getItem("token") && (
        <p className="text-muted">Please log in to view survey details.</p>
      )}

      {loading && <p>Loading survey...</p>}

      {!loading && survey && (
        <>
          <h3 className="mb-3">
            {survey.urgent && (
                <span className="badge bg-danger me-2">URGENT</span>
            )}
            {survey.name}
          </h3>
            {survey.status === "created" && (
                <button
                    className="btn btn-success mb-3"
                    onClick={startSurvey}
                    >
                    Start Survey
                </button>
            )}

            {survey.status === "live" && (
                <button
                    className="btn btn-warning mb-3 ms-2"
                    onClick={pauseSurvey}
                    >
                    Pause Survey
                </button>
            )}
            
            {survey.status === "live" && (
                <button
                    className="btn btn-primary mb-3"
                    onClick={completeSurvey}
                >
                    Complete Survey
                </button>
            )}

            {survey.status === "paused" && (
                <button
                    className="btn btn-success mb-3"
                    onClick={resumeSurvey}
                >
                    Resume Survey
                </button>
            )}

            
            {survey.status === "completed" && (
                <button
                    className="btn btn-dark mb-3"
                    onClick={submitSurvey}
                >
                    Submit Survey
                </button>
            )}
            
            {survey.status === "live" && (
              <button
                className="btn btn-outline-success mb-3 ms-2"
                onClick={() => setShowObservationModal(true)}
              >
                Add Observation
              </button>
            )}






          <div className="text-muted mb-3">
            <div>
              Status:
              <span
                className={`badge ms-2
                  ${survey.status === "created" ? "bg-secondary" : ""}
                  ${survey.status === "live" ? "bg-success" : ""}
                  ${survey.status === "paused" ? "bg-warning text-dark" : ""}
                  ${survey.status === "completed" ? "bg-primary" : ""}
                  ${survey.status === "submitted" ? "bg-dark" : ""}
                `}
              >
                {survey.status_display}
              </span>
            </div>

            <div>
              Created{" "}
              {new Date(survey.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>

            <div>Client: {survey.client || "Not set"}</div>
            <div>Site: {survey.site || "Not set"}</div>
            <div>Client ID: {survey.client_id || "Not set"}</div>
            <div>Site ID: {survey.site_id || "Not set"}</div>
            
            <div>Surveyor: {survey.assigned_to || "Unassigned"}</div>
            <div>Created by: {survey.created_by || "Unknown"}</div>

            <div>Client present: {survey.client_present ? "Yes" : "No"}</div>
          </div>

          <h5 className="mt-4">
            Observations ({survey.observations?.length || 0})
          </h5>
                <Link
                    to={`/observations/survey/${survey?.id}`}
                    className="btn btn-outline-primary mb-3"
                    >
                    View All Observations
                </Link>    
          {survey.observations?.length === 0 && (
            <p className="text-muted mt-3">
                No observations have been added to this survey yet.
            </p>
         )}

          <div id="observations-list" className="mt-3">
              {survey?.observations?.map((observation, index) => (
                <Link
                  key={observation.id}
                  to={`/observations/${observation.id}`}
                  state={{ fromSurvey: true, surveyId: survey.id }}
                  className="text-decoration-none text-dark"
                >
                  <div className="border rounded p-3 mb-3">
                    <small className="text-muted">
                      {survey.observations.length - index} of {survey.observations.length}
                    </small>

                    {observation.image && (
                      <img
                        src={observation.image}
                        alt={observation.title}
                        className="img-fluid mb-2"
                        style={{ maxHeight: "150px", objectFit: "cover" }}
                      />
                    )}

                    <h6 className="mb-1">{observation.title}</h6>

                    <p className="mb-0 text-muted">{observation.description}</p>

                    <p className="small text-muted mt-2">
                      {new Date(observation.created_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
        </>
      )}
        <Modal
          show={showObservationModal}
          onHide={() => setShowObservationModal(false)}
          centered
        >
          <Modal.Header closeButton className="px-3">
              
              
              <Modal.Title>
                  Add Observation #{observationCount + 1}

                  <span
                    className="ms-3"
                    style={{
                      display: "inline-grid",
                      minWidth: "150px",
                      verticalAlign: "baseline",
                    }}
                  >
                    <span
                      className="text-muted"
                      style={{
                        gridArea: "1 / 1",
                        fontSize: "0.72rem",
                        lineHeight: "1",
                        opacity: observationSuccess ? 0 : 1,
                        transition: "opacity 0.9s ease",
                      }}
                    >
                      Duration {formatSurveyDuration(survey?.created_at, durationTick)}
                    </span>

                    <span
                      className="text-success fw-light"
                      style={{
                        gridArea: "1 / 1",
                        fontSize: "0.72rem",
                        lineHeight: "1",
                        opacity: observationSuccess ? 1 : 0,
                        transition: "opacity 0.9s ease",
                      }}
                    >
                      Observation Added
                    </span>
                  </span>
                </Modal.Title>
            
            
            
            </Modal.Header>
              <Modal.Body className="pt-2 pb-3">
                <ObservationCreateForm 
                  surveyId={survey?.id}
                  onPauseSurvey={pauseSurvey}
                  onClose={() => setShowObservationModal(false)}
                 
                 
                 
                 
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