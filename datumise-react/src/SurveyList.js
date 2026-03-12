import React, { useState, useEffect } from "react";
import api from "./api/api";
import { useNavigate } from "react-router-dom";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";

/* ------------------------------------------------------------------ */
/*  Helper: build LINE 1 (schedule / due / urgency / client presence) */
/* ------------------------------------------------------------------ */
function formatScheduleLine(survey) {
  const now = new Date();
  const parts = [];
  const flags = [];

  const scheduled = survey.scheduled_for ? new Date(survey.scheduled_for) : null;
  const due = survey.due_by ? new Date(survey.due_by) : null;

  const isFinished = ["submitted", "completed"].includes(survey.status);
  const isOverdue = due && due < now && !isFinished;

  const today = now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isDueToday = due && due.toDateString() === today;
  const isDueTomorrow = due && due.toDateString() === tomorrow.toDateString();

  if (isOverdue) {
    parts.push("Overdue");
  } else if (scheduled) {
    const dateStr = scheduled.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    parts.push(`Scheduled ${dateStr}`);

    // Show time if not midnight (midnight = date-only convention)
    const hasTime = scheduled.getHours() !== 0 || scheduled.getMinutes() !== 0;
    if (hasTime) {
      parts.push(
        scheduled.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      );
    }

    // For scheduled surveys, only flag due-date urgency (don't repeat full date)
    if (isDueToday) parts.push("Due today");
    else if (isDueTomorrow) parts.push("Due tomorrow");
  } else {
    parts.push("Unscheduled");
    if (isDueToday) {
      parts.push("Due today");
    } else if (isDueTomorrow) {
      parts.push("Due tomorrow");
    } else if (due && !isOverdue) {
      parts.push(
        `Due ${due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
      );
    }
  }

  if (survey.client_present) {
    parts.push("Client present");
  }

  if (survey.urgent) flags.push("\u26A0");
  if (isOverdue) flags.push("\u23F0");

  return { text: parts.join(" \u00B7 "), flags: flags.join(" ") };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
function SurveyList() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [nextPage, setNextPage] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const response = await api.get(
          `/api/surveys/?search=${searchTerm}&status=${statusFilter}`
        );
        setSurveys(response.data.results);
        setNextPage(response.data.next);
        setPreviousPage(response.data.previous);
        setLoading(false);
      } catch (err) {
        console.log(err);
        setError("Failed to load surveys.");
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [searchTerm, statusFilter]);

  return (
    <div className="container mt-3">
      {/* ---- Search & filter toolbar ---- */}
      <div className="d-flex gap-2 mb-2 align-items-center flex-wrap">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search surveys..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: "220px" }}
        />
        <select
          className="form-select form-select-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: "150px" }}
        >
          <option value="">All statuses</option>
          <option value="created">Created</option>
          <option value="live">Live</option>
          <option value="paused">Paused</option>
          <option value="submitted">Submitted</option>
        </select>
        {(searchTerm || statusFilter) && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => { setSearchTerm(""); setStatusFilter(""); }}
          >
            Clear
          </button>
        )}
      </div>

      <h6 className="mb-2">
        Surveys
        <span className="text-muted fw-normal ms-1" style={{ fontSize: "0.85rem" }}>
          ({surveys.length})
        </span>
      </h6>

      {error && <p className="text-danger">{error}</p>}
      {loading && <p>Loading surveys...</p>}
      {!loading && surveys.length === 0 && (
        <p className="text-muted">No surveys found.</p>
      )}

      <div>
        {!loading &&
          [...surveys]
            .sort((a, b) => b.urgent - a.urgent)
            .map((survey) => {
              const schedule = formatScheduleLine(survey);

              return (
                <div
                  key={survey.id}
                  className="survey-queue-card"
                  onClick={() => navigate(`/surveys/${survey.id}`)}
                >
                  {/* LINE 1: schedule / due / urgency / client presence */}
                  <div className="survey-queue-line1">
                    <span>{schedule.text}</span>
                    {schedule.flags && (
                      <span className="survey-queue-flags">{schedule.flags}</span>
                    )}
                  </div>

                  {/* LINE 2: client / site */}
                  <div className="survey-queue-line2">
                    {survey.client && survey.site
                      ? `${survey.client} \u2013 ${survey.site}`
                      : survey.client || survey.site || "No client / site"}
                  </div>

                  {/* LINE 3: surveyor / obs count / action */}
                  <div className="survey-queue-line3">
                    <span className="survey-queue-surveyor">
                      {survey.assigned_to || "Unassigned"}
                    </span>
                    <span className="survey-queue-obs">
                      {survey.observation_count ?? 0} obs
                    </span>
                    <span className="survey-queue-action">
                      {survey.status === "created" && (
                        <button
                          className="btn btn-success btn-sm survey-queue-btn"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.patch(`/api/surveys/${survey.id}/`, { status: "live" });
                              navigate(`/surveys/${survey.id}/capture`);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          Start
                        </button>
                      )}
                      {survey.status === "paused" && (
                        <button
                          className="btn btn-success btn-sm survey-queue-btn"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.patch(`/api/surveys/${survey.id}/`, { status: "live" });
                              navigate(`/surveys/${survey.id}/capture`);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          Resume
                        </button>
                      )}
                      {survey.status === "live" && (
                        <span className="badge bg-success" style={{ fontSize: "0.62rem" }}>Live</span>
                      )}
                      {survey.status === "submitted" && (
                        <span className="survey-queue-status-text">Submitted</span>
                      )}
                      {survey.status === "completed" && (
                        <span className="survey-queue-status-text">Completed</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Mobile: load more */}
      {nextPage && (
        <div className="d-md-none text-center mt-3 mb-3">
          <button
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
            style={{ width: "44px", height: "44px", background: "#FF7518", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
            onClick={() =>
              api.get(nextPage).then((response) => {
                setSurveys((prev) => [...prev, ...response.data.results]);
                setNextPage(response.data.next);
                setPreviousPage(response.data.previous);
              })
            }
            aria-label="Load more"
          >
            <img src="/datumise-load.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
        </div>
      )}

      {/* Desktop: prev / next */}
      {(previousPage || nextPage) && (
        <div className="d-none d-md-flex justify-content-between mt-3 mb-3">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() =>
              previousPage &&
              api.get(previousPage).then((response) => {
                setSurveys(response.data.results);
                setNextPage(response.data.next);
                setPreviousPage(response.data.previous);
              })
            }
            disabled={!previousPage}
          >
            Previous
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() =>
              nextPage &&
              api.get(nextPage).then((response) => {
                setSurveys(response.data.results);
                setNextPage(response.data.next);
                setPreviousPage(response.data.previous);
              })
            }
            disabled={!nextPage}
          >
            Next
          </button>
        </div>
      )}
      <ReturnButton to="/" />
      <BackToTop />
    </div>
  );
}

export default SurveyList;
