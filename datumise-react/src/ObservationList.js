import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api/api";
import { useNavigate } from "react-router-dom";

function ObservationList() {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextPage, setNextPage] = useState(null);
  const navigate = useNavigate();
  const [previousPage, setPreviousPage] = useState(null);

  useEffect(() => {
    api.get("/api/observations/")
      .then((response) => {
        setObservations(response.data.results);
        setNextPage(response.data.next);
        setPreviousPage(response.data.previous);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching observations:", error);
      });
  }, []);

  const handlePageChange = (url) => {
    window.scrollTo(0, 0);
    setLoading(true);

    api.get(url)
      .then((response) => {
        setObservations(response.data.results);
        setNextPage(response.data.next);
        setPreviousPage(response.data.previous);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching paginated observations:", error);
      });
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-3">Observations</h3>
        <Link to="/observations/create" className="btn btn-primary btn-sm">
          + New Observation
        </Link>
      </div>

      {loading && <p>Loading observations...</p>}

      {!loading && observations.length === 0 && (
        <p>No observations yet.</p>
      )}

      {!loading && observations.map((obs) => (
        <div key={obs.id} className="card mb-3 shadow-sm">
          <div className="card-body d-flex gap-3 align-items-start"
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/observations/${obs.id}`)}
          >
            <div style={{ width: "120px", height: "120px", flexShrink: 0 }}>
                <Link to={`/observations/${obs.id}`}>
                    <img
                    src={obs.image || "/datumise-placeholder.svg"}
                    alt={obs.title}
                    className="img-fluid rounded"
                    style={{
                        width: "120px",
                        height: "120px",
                        objectFit: obs.image ? "cover" : "contain",
                        opacity: obs.image ? 1 : 0.7,
                    }}
                    />
                </Link>
                </div>

            <div style={{ flex: 1 }}>
              <h5>
                <Link
                to={`/observations/${obs.id}`}
                style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
  {obs.title}
</Link>
              </h5>

              <p style={{ wordBreak: "break-word" }}>
                {obs.description.slice(0, 120)}
                {obs.description.length > 120 && "..."}
              </p>

              <small>
                <Link
                    to={`/observations/${obs.id}#comment-form`}
                    className="text-muted text-decoration-underline"
                    onClick={(e) => e.stopPropagation()}
                >
                  💬 {
                    obs.comment_count === 0
                      ? "Add first comment"
                      : obs.comment_count === 1
                      ? "1 comment"
                      : `${obs.comment_count} comments`
                  }
                </Link>
              </small>
              <br />
              <small className="text-muted">
                {obs.owner} •{" "}
                {new Date(obs.created_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
          </div>
        </div>
      ))}

      <div className="d-flex justify-content-center gap-2 mt-4 mb-4">
        {previousPage && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => handlePageChange(previousPage)}
          >
            Previous
          </button>
        )}

        {nextPage && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => handlePageChange(nextPage)}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

export default ObservationList;