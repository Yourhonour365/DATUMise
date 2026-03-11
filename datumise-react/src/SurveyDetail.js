import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "./api/api";

function SurveyDetail() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      try {
        const response = await api.get(`/api/surveys/${id}/`);
        setSurvey(response.data);
        setLoading(false);
      } catch (err) {
        console.log(err);
        setLoading(false);
      }
    };

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
            await api.patch(`/api/surveys/${id}/`, {
                status: "live",
            });
            window.location.reload();
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
            
            <Link
              to={`/observations/create?survey=${survey.id}`}
              className="btn btn-outline-success mb-3 ms-2"
            >
              Add Observation
            </Link>






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
                    to={`/observations/survey/${survey.id}`}
                    className="btn btn-outline-primary mb-3"
                    >
                    View All Observations
                </Link>    
          {survey.observations?.length === 0 && (
            <p className="text-muted mt-3">
                No observations have been added to this survey yet.
            </p>
         )}

          <div className="mt-3">
            {survey.observations?.map((observation) => (
              <Link
                key={observation.id}
                to={`/observations/${observation.id}`}
                state={{ fromSurvey: true, surveyId: survey.id }}
                className="text-decoration-none text-dark"
              >
                <div className="border rounded p-3 mb-3">
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
                    {new Date(observation.created_at).toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default SurveyDetail;