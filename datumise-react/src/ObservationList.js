import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "./api/api";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";

function ObservationList() {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [nextPage, setNextPage] = useState(null);
  const { surveyId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const url = surveyId
      ? `/api/observations/?survey=${surveyId}&search=${searchTerm}`
      : `/api/observations/?search=${searchTerm}`;

    api
      .get(url)
      .then((response) => {
        setObservations(response.data.results);
        setNextPage(response.data.next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching observations:", err);
        setError("You must be logged in to view observations.");
        setLoading(false);
      });
  }, [surveyId, searchTerm]);

  const hasScrolled = useRef(false);

  useEffect(() => {
    const scrollTo = location.state?.scrollToObservation;
    if (scrollTo && !loading && observations.length > 0 && !hasScrolled.current) {
      const el = document.getElementById(`obs-${scrollTo}`);
      if (el) {
        hasScrolled.current = true;
        el.scrollIntoView({ block: "center" });
        window.history.replaceState({}, "");
      }
    }
  }, [loading, observations, location.state?.scrollToObservation]);

  const handleLoadMore = (url) => {
    api
      .get(url)
      .then((response) => {
        setObservations((prev) => [...prev, ...response.data.results]);
        setNextPage(response.data.next);
      })
      .catch((err) => {
        console.error("Error fetching observations:", err);
      });
  };

  return (
    <div className="container mt-3">
      {/* ---- Search toolbar ---- */}
      <div className="d-flex gap-2 mb-2 align-items-center flex-wrap">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search observations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: "220px" }}
        />
        {searchTerm && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setSearchTerm("")}
          >
            Clear
          </button>
        )}
      </div>

      <h6 className="mb-2">
        Observations
        <span className="text-muted fw-normal ms-1" style={{ fontSize: "0.85rem" }}>
          ({observations.length})
        </span>
      </h6>

      {error && <p className="text-danger">{error}</p>}
      {loading && <p>Loading observations...</p>}
      {!loading && !error && observations.length === 0 && (
        <p className="text-muted">No observations found.</p>
      )}

      <div>
        {!loading &&
          observations.map((obs) => (
            <div
              key={obs.id}
              id={`obs-${obs.id}`}
              className="observation-row"
              style={{ cursor: "pointer" }}
              onClick={() =>
                obs.survey
                  ? navigate(`/surveys/${obs.survey}/capture`, { state: { viewObservationId: obs.id, returnPath: surveyId ? `/observations/survey/${surveyId}` : "/observations" } })
                  : navigate(`/observations/${obs.id}`)
              }
            >
              {obs.image ? (
                <img
                  src={obs.image}
                  alt=""
                  className="observation-row-thumb"
                />
              ) : (
                <div className="observation-row-thumb observation-row-thumb-empty">
                  <span style={{ fontSize: "0.65rem" }}>No img</span>
                </div>
              )}
              <div className="observation-row-content">
                <div className="observation-row-title">{obs.title}</div>
                {obs.description && (
                  <div className="observation-row-desc">{obs.description}</div>
                )}
                <div className="observation-row-meta">
                  <span>
                    {new Date(obs.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>{obs.owner || "Unassigned"}</span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {nextPage && (
        <div className="text-center mt-3 mb-3">
          <button
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
            style={{ width: "44px", height: "44px", background: "#FF7518", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
            onClick={() => handleLoadMore(nextPage)}
            aria-label="Load more"
          >
            <img src="/datumise-load.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
        </div>
      )}
      <ReturnButton to="/" />
      <BackToTop />
    </div>
  );
}

export default ObservationList;
