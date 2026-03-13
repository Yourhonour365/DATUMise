import React, { useState, useEffect } from "react";
import api from "./api/api";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";
import { useFilters } from "./FilterContext";
import FilterAppliedCard from "./FilterAppliedCard";
import AddButton from "./AddButton";

/* ------------------------------------------------------------------ */
/*  Helper: build LINE 1 (schedule / due / urgency / client presence) */
/* ------------------------------------------------------------------ */
function formatScheduleLine(survey) {
  const now = new Date();

  const scheduled = survey.scheduled_for ? new Date(survey.scheduled_for) : null;
  const due = survey.due_by ? new Date(survey.due_by) : null;
  const schedType = survey.schedule_type || "pending";

  const isFinished = ["submitted"].includes(survey.status);
  const isOverdue = due && due < now && !isFinished;

  const today = now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isDueToday = due && due.toDateString() === today;
  const isDueTomorrow = due && due.toDateString() === tomorrow.toDateString();

  let date = "\u2014";
  let time = "";
  let scheduleLabel = "";

  if (isOverdue) {
    date = "Overdue";
  } else if (schedType === "scheduled" && scheduled) {
    const d = scheduled.getDate();
    const m = scheduled.toLocaleDateString("en-GB", { month: "short" });
    const y = String(scheduled.getFullYear()).slice(2);
    date = `${d} ${m} '${y}`;
    const hasTime = scheduled.getHours() !== 0 || scheduled.getMinutes() !== 0;
    if (hasTime) {
      time = scheduled.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
  } else if (schedType === "provisional" && scheduled) {
    const d = scheduled.getDate();
    const m = scheduled.toLocaleDateString("en-GB", { month: "short" });
    const y = String(scheduled.getFullYear()).slice(2);
    date = `${d} ${m} '${y}`;
    const hasTime2 = scheduled.getHours() !== 0 || scheduled.getMinutes() !== 0;
    if (hasTime2) {
      time = scheduled.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    scheduleLabel = "Provisional";
  } else if (schedType === "self_scheduling") {
    scheduleLabel = "Self-scheduled";
  } else {
    scheduleLabel = "Pending";
  }

  let dueText = "";
  if (!isOverdue) {
    if (isDueToday) dueText = "Due today";
    else if (isDueTomorrow) dueText = "Due tomorrow";
    else if (due) {
      dueText = `Due ${due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    }
  }

  const clientAttending = !!survey.client_present;

  return { date, time, scheduleLabel, urgent: !!survey.urgent, overdue: isOverdue, clientAttending, dueText };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
function SurveyList() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientFilter = searchParams.get("client") || "";
  const [searchTerm, setSearchTerm] = useState("");
  const [nextPage, setNextPage] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const { filters, setFilters, clearFilters } = useFilters();

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        let url = `/api/surveys/?search=${searchTerm}`;
        if (filters.statuses.length) {
          url += `&status=${filters.statuses.map((s) => s.id).join(",")}`;
        }
        if (clientFilter) {
          url += `&client=${clientFilter}`;
        } else if (filters.clients.length) {
          url += `&client=${filters.clients.map((c) => c.id).join(",")}`;
        }
        if (filters.sites.length) url += `&site=${filters.sites.map((s) => s.id).join(",")}`;
        if (filters.surveyors.length) url += `&assigned_to=${filters.surveyors.map((s) => s.id).join(",")}`;
        if (filters.schedule_types.length) url += `&schedule_type=${filters.schedule_types.map((s) => s.id).join(",")}`;
        if (filters.site_types.length) url += `&site_type=${filters.site_types.map((s) => s.id).join(",")}`;
        const response = await api.get(url);
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
  }, [searchTerm, clientFilter, filters]);

  return (
    <div className="container mt-3">
      <div className="mb-3 d-none d-md-block">
        <Link to={clientFilter ? `/clients/${clientFilter}` : "/"} className="text-decoration-none">
          &larr; Back to {clientFilter ? "Client" : "Home"}
        </Link>
      </div>
      <div className="d-none d-md-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0 fw-bold">Surveys</h5>
        <AddButton to="/surveys/create" />
      </div>
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
        {searchTerm && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setSearchTerm("")}
          >
            Clear
          </button>
        )}
        <Link
          to="/filters"
          style={{ fontSize: "0.85rem", color: "#0d6efd", textDecoration: "underline" }}
        >
          Filters{filters.clients.length || filters.sites.length || filters.surveyors.length || filters.statuses.length || filters.schedule_types.length || filters.site_types.length ? ` (${filters.clients.length + filters.sites.length + filters.surveyors.length + filters.statuses.length + filters.schedule_types.length + filters.site_types.length})` : ""}
        </Link>
        <AddButton to="/surveys/create" />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="form-select form-select-sm"
          style={{ maxWidth: "130px", fontSize: "0.78rem" }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="most_liked">Most liked</option>
          <option value="most_commented">Most commented</option>
        </select>
      </div>

      {/* ---- Active filter chips ---- */}
      {(() => {
        const totalChips = filters.statuses.length + filters.schedule_types.length + filters.site_types.length + filters.clients.length + filters.sites.length + filters.surveyors.length;
        if (totalChips === 0) return null;
        return (
          <FilterAppliedCard totalChips={totalChips} onClear={clearFilters}>
            <div className="d-flex gap-1 flex-wrap" style={{ marginTop: "0.4rem" }}>
              {filters.statuses.map((st) => (
                <span key={`st-${st.id}`} className={`filter-chip ${st.id === "cancelled" || st.id === "missed" ? "filter-chip-status-cancelled" : "filter-chip-status"}`}>
                  {st.name}
                  <button type="button" className="filter-chip-x" onClick={() => setFilters({ statuses: filters.statuses.filter((x) => x.id !== st.id) })}>&times;</button>
                </span>
              ))}
              {filters.schedule_types.map((sc) => (
                <span key={`sc-${sc.id}`} className="filter-chip filter-chip-schedule">
                  {sc.name}
                  <button type="button" className="filter-chip-x" onClick={() => setFilters({ schedule_types: filters.schedule_types.filter((x) => x.id !== sc.id) })}>&times;</button>
                </span>
              ))}
              {filters.site_types.map((st) => (
                <span key={`st-${st.id}`} className="filter-chip filter-chip-site">
                  {st.name}
                  <button type="button" className="filter-chip-x" onClick={() => setFilters({ site_types: filters.site_types.filter((x) => x.id !== st.id) })}>&times;</button>
                </span>
              ))}
              {filters.clients.map((c) => (
                <span key={`c-${c.id}`} className="filter-chip filter-chip-client">
                  {c.name}
                  <button type="button" className="filter-chip-x" onClick={() => setFilters({ clients: filters.clients.filter((x) => x.id !== c.id) })}>&times;</button>
                </span>
              ))}
              {filters.sites.map((s) => (
                <span key={`s-${s.id}`} className="filter-chip filter-chip-site">
                  {s.name}
                  <button type="button" className="filter-chip-x" onClick={() => setFilters({ sites: filters.sites.filter((x) => x.id !== s.id) })}>&times;</button>
                </span>
              ))}
              {filters.surveyors.map((sv) => (
                <span key={`sv-${sv.id}`} className="filter-chip filter-chip-surveyor">
                  {sv.name}
                  <button type="button" className="filter-chip-x" onClick={() => setFilters({ surveyors: filters.surveyors.filter((x) => x.id !== sv.id) })}>&times;</button>
                </span>
              ))}
            </div>
          </FilterAppliedCard>
        );
      })()}

      <h6 className="mb-2 d-none d-md-block">
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
            .sort((a, b) => {
              if (sortOrder === "most_liked") return (b.total_likes_count || 0) - (a.total_likes_count || 0);
              if (sortOrder === "most_commented") return (b.total_comments_count || 0) - (a.total_comments_count || 0);
              if (b.urgent !== a.urgent) return b.urgent - a.urgent;
              const dateA = new Date(a.scheduled_for || a.created_at);
              const dateB = new Date(b.scheduled_for || b.created_at);
              return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
            })
            .map((survey) => {
              const schedule = formatScheduleLine(survey);

              return (
                <div
                  key={survey.id}
                  className="survey-queue-card"
                  onClick={() => navigate(`/surveys/${survey.id}`)}
                >
                  <div className="survey-queue-grid">
                    {/* Row 1: date + time | schedule label + surveyor | flags */}
                    <span>{schedule.date}{schedule.time ? ` ${schedule.time}` : ""}</span>
                    <span>{[schedule.scheduleLabel, survey.assigned_to || "Unassigned"].filter(Boolean).join(" \u00B7 ")}</span>
                    <span className="survey-queue-flags">
                      {survey.total_likes_count > 0 && (
                        <span className="d-inline-flex align-items-center gap-1" style={{ fontSize: "0.75rem", color: "#6c757d" }}>
                          <img src="/datumise-like.svg" alt="" width="12" height="12" style={{ opacity: 0.5 }} />
                          {survey.total_likes_count}
                        </span>
                      )}
                      <strong style={{ fontSize: "0.88rem" }}>{survey.observation_count > 0 ? `(${survey.observation_count})` : ""}</strong>
                      {schedule.urgent ? <img src="/datumise_urgent.svg" alt="Urgent" width="16" height="16" style={{ filter: "invert(56%) sepia(81%) saturate(552%) hue-rotate(347deg) brightness(97%) contrast(87%)" }} /> : <span style={{ display: "inline-block", width: "16px" }} />}
                      {schedule.overdue && "\u23F0"}
                    </span>

                    {/* Row 2: due date | client attending | edit */}
                    <span>{schedule.dueText}</span>
                    <span>{schedule.clientAttending ? "Client attending" : ""}</span>
                    <Link
                      to={`/surveys/${survey.id}/edit`}
                      className="text-decoration-none edit-icon-circle"
                      style={{ justifySelf: "end" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img src="/datumise-edit.svg" alt="Edit" width="14" height="14" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
                    </Link>

                    {/* Row 3: client, site | _ | resume/status */}
                    <span className="survey-queue-clientsite">{survey.site || survey.client || "No client / site"}</span>
                    <span style={{ justifySelf: "end" }}>
                      {(survey.status === "planned" || survey.status === "paused") && survey.is_surveyor && survey.assigned_to && (
                        <a
                          href="#"
                          style={{ fontWeight: 700, color: "#198754", textDecoration: "none" }}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!survey.assigned_to || !survey.is_surveyor) return;
                            try {
                              await api.patch(`/api/surveys/${survey.id}/`, { status: "live" });
                              navigate(`/surveys/${survey.id}/capture`);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          {survey.status === "paused" ? "Resume" : "Start"}
                        </a>
                      )}
                      {survey.status === "planned" && !survey.assigned_to && (
                        <a
                          href="#"
                          style={{ fontWeight: 600, color: "#0d6efd", textDecoration: "none", fontSize: "0.75rem" }}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (survey.status !== "planned" || survey.assigned_to) return;
                            try {
                              const res = await api.post(`/api/surveys/${survey.id}/assign/`);
                              setSurveys((prev) => prev.map((s) => s.id === survey.id ? res.data : s));
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          Assign to me
                        </a>
                      )}
                      {survey.status === "live" && (
                        <span style={{ color: "#198754", fontWeight: 600 }}>Live</span>
                      )}
                      {survey.status === "submitted" && <span style={{ color: "#1a5bc4" }}>Submitted</span>}
                      {survey.status === "missed" && <span style={{ color: "#d3212f" }}>Missed</span>}
                      {survey.status === "cancelled" && "Cancelled"}
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
      <ReturnButton to={clientFilter ? `/clients/${clientFilter}` : "/"} />
      <BackToTop />
    </div>
  );
}

export default SurveyList;
