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

  return (
    <div className="container mt-4">
      <h3>Survey Detail</h3>

      {!localStorage.getItem("token") && (
        <p className="text-muted">Please log in to view survey details.</p>
      )}

      {loading && <p>Loading survey...</p>}

      {!loading && survey && (
        <>
          <h5>{survey.name}</h5>

          <p className="text-muted">Status: {survey.status}</p>

          <p className="text-muted">
            Created:{" "}
            {new Date(survey.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>

          <h5 className="mt-4">
            Observations ({survey.observations?.length || 0})
          </h5>

          <div className="mt-3">
            {survey.observations?.map((observation) => (
              <Link
                key={observation.id}
                to={`/observations/${observation.id}`}
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