import React, { useState, useEffect } from "react";
import api from "./api/api";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";
import { useFilters } from "./FilterContext";
import FilterAppliedCard from "./FilterAppliedCard";
import AddButton from "./AddButton";

// Session-lifecycle PATCH value for starting/resuming.
// "live" is a legacy string required because views.py perform_update
// triggers session create/resume only for requested_status == "live".
// PHASE 6B: Replace with dedicated session endpoints.
const PATCH_START_SESSION = "live";

/* ------------------------------------------------------------------ */
/*  Status filter translation: maps legacy filter ids to stored DB    */
/*  values. Handles saved filters that pre-date the Phase 3 migration.*/
/* ------------------------------------------------------------------ */
const STATUS_FILTER_TRANSLATION = {
  planned: "open",
  live: "assigned",
  paused: "assigned",
  submitted: "assigned",
  missed: "archived",
  cancelled: "archived",
};

/* ------------------------------------------------------------------ */
/*  Helper: build LINE 1 (schedule / due / urgency / client presence) */
/* ------------------------------------------------------------------ */
function formatScheduleLine(survey) {
  const now = new Date();

  const scheduled = survey.scheduled_for ? new Date(survey.scheduled_for) : null;
  const due = survey.due_by ? new Date(survey.due_by) : null;
  const visitReq = survey.visit_requirement;
  const schedStatus = survey.schedule_status;

  const isFinished = (
    ["submitted", "completed", "missed", "cancelled", "archived"].includes(survey.status) ||
    (survey.status === "assigned" && survey.current_session_status === null)
  );
  const isOverdue = due && due < now && !isFinished;

  let date = "\u2014";
  let time = "";

  if (isOverdue) {
    date = "Overdue";
  } else if (scheduled) {
    const d = scheduled.getDate();
    const m = scheduled.toLocaleDateString("en-GB", { month: "short" });
    const y = String(scheduled.getFullYear()).slice(2);
    date = `${d} ${m} '${y}`;
    const h = scheduled.getHours();
    const min = scheduled.getMinutes();
    if (h !== 0 || min !== 0) {
      const period = h >= 12 ? "pm" : "am";
      const h12 = h % 12 || 12;
      time = `${h12}:${min.toString().padStart(2, "0")}${period}`;
    }
  }

  let scheduleLabel = "";
  if (visitReq === "unrestricted") {
    scheduleLabel = "Self-scheduled";
  } else if (visitReq === "prearranged") {
    if (schedStatus === "provisional") scheduleLabel = "Provisional";
    else if (schedStatus === "booked") scheduleLabel = "Confirmed";
    else scheduleLabel = "Pre-arranged";
  }

  // Prefer is_urgent (new alias); fall back to urgent for compatibility.
  const urgent = !!(survey.is_urgent ?? survey.urgent);

  return { date, time, scheduleLabel, urgent, overdue: isOverdue };
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const { filters, setFilters, clearFilters } = useFilters();

  useEffect(() => {
    document.body.style.backgroundColor = "#E2DDD3";
    return () => { document.body.style.backgroundColor = ""; };
  }, []);

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        let url = `/api/surveys/?search=${searchTerm}`;
        if (filters.statuses.length) {
          // Translate legacy filter ids (planned, live, etc.) to current DB
          // values (open, assigned, archived). Deduplicates after translation
          // so "missed" + "cancelled" → a single "archived" param.
          const dbStatuses = [
            ...new Set(
              filters.statuses.map((s) => STATUS_FILTER_TRANSLATION[s.id] || s.id)
            ),
          ];
          url += `&status=${dbStatuses.join(",")}`;
        }
        if (clientFilter) {
          url += `&client=${clientFilter}`;
        } else if (filters.clients.length) {
          url += `&client=${filters.clients.map((c) => c.id).join(",")}`;
        }
        if (filters.sites.length) url += `&site=${filters.sites.map((s) => s.id).join(",")}`;
        if (filters.surveyors.length) url += `&assigned_to=${filters.surveyors.map((s) => s.id).join(",")}`;
        if (filters.schedule_types.length) url += `&visit_requirement=${filters.schedule_types.map((s) => s.id).join(",")}`;
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
      {/* ---- Filters container ---- */}
      <div className="edit-fieldset mb-4" style={{ backgroundColor: "#2E5E3E", borderRadius: 2, color: "#fefdfc" }}>
        <p className="edit-legend section-toggle" onClick={() => setFiltersOpen(!filtersOpen)} style={{ color: "#fefdfc" }}>
          <span className={`section-chevron section-chevron--light${filtersOpen ? " section-chevron--open" : ""}`}></span>
          Filters
        </p>
        {filtersOpen && <>
        <div className="d-flex gap-2 flex-wrap" style={{ alignItems: "flex-start", marginLeft: "var(--section-gap, 16px)" }}>
          <Link to="/filters" className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem", color: "#f5f5f7", borderColor: "#f5f5f7", backgroundColor: "transparent", textDecoration: "none" }}>
            Advanced
          </Link>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
            style={{ fontSize: "0.75rem", padding: "3px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: "transparent", color: "#f5f5f7", outline: "none" }}>
            <option value="newest" style={{ color: "#1f2a33" }}>Newest first</option>
            <option value="oldest" style={{ color: "#1f2a33" }}>Oldest first</option>
            <option value="most_liked" style={{ color: "#1f2a33" }}>Most liked</option>
            <option value="most_commented" style={{ color: "#1f2a33" }}>Most commented</option>
          </select>
        </div>
        <div style={{ marginLeft: "var(--section-gap, 16px)", marginTop: 8 }}>
          <input type="text" className="filter-search" placeholder="Search surveys..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "4px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: "transparent", color: "#f5f5f7", outline: "none", width: "100%", maxWidth: 220 }} />
        </div>
        </>}
        {/* Applied chips */}
        {(() => {
          const totalChips = filters.statuses.length + filters.schedule_types.length + filters.site_types.length + filters.clients.length + filters.sites.length + filters.surveyors.length;
          if (totalChips === 0) return null;
          return (
            <div style={{ backgroundColor: "#2e5e3e", borderRadius: 2, padding: "8px 0 8px 0", marginTop: 8, marginLeft: "var(--section-gap, 16px)" }}>
              <div className="d-flex gap-2 flex-wrap align-items-center">
                {filters.statuses.map((st) => (
                  <span key={`st-${st.id}`} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#2e7d32", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {st.name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#2e7d32" }} onClick={() => setFilters({ statuses: filters.statuses.filter((x) => x.id !== st.id) })}>&times;</button>
                  </span>
                ))}
                {filters.schedule_types.map((sc) => (
                  <span key={`sc-${sc.id}`} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#1565c0", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {sc.name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#1565c0" }} onClick={() => setFilters({ schedule_types: filters.schedule_types.filter((x) => x.id !== sc.id) })}>&times;</button>
                  </span>
                ))}
                {filters.site_types.map((st) => (
                  <span key={`st2-${st.id}`} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#7b1fa2", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {st.name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#7b1fa2" }} onClick={() => setFilters({ site_types: filters.site_types.filter((x) => x.id !== st.id) })}>&times;</button>
                  </span>
                ))}
                {filters.clients.map((c) => (
                  <span key={`c-${c.id}`} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#f57f17", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {c.name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#f57f17" }} onClick={() => setFilters({ clients: filters.clients.filter((x) => x.id !== c.id) })}>&times;</button>
                  </span>
                ))}
                {filters.sites.map((s) => (
                  <span key={`s-${s.id}`} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#c62828", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {s.name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#c62828" }} onClick={() => setFilters({ sites: filters.sites.filter((x) => x.id !== s.id) })}>&times;</button>
                  </span>
                ))}
                {filters.surveyors.map((sv) => (
                  <span key={`sv-${sv.id}`} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#00695c", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {sv.name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#00695c" }} onClick={() => setFilters({ surveyors: filters.surveyors.filter((x) => x.id !== sv.id) })}>&times;</button>
                  </span>
                ))}
                <button type="button" style={{ border: "none", background: "#fcfaf7", padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", borderRadius: 4 }}
                  onClick={clearFilters}>Clear all</button>
              </div>
            </div>
          );
        })()}
      </div>

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
              // Prefer is_urgent (new alias); fall back to urgent.
              const aUrgent = !!(a.is_urgent ?? a.urgent);
              const bUrgent = !!(b.is_urgent ?? b.urgent);
              if (bUrgent !== aUrgent) return (bUrgent ? 1 : 0) - (aUrgent ? 1 : 0);
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
                    {/* Row 1: date | site name (20 chars)... postcode | (empty) */}
                    <span className="d-flex align-items-center gap-1">
                      {schedule.urgent && <img src="/datumise_urgent.svg" alt="" width="12" height="12" style={{ filter: "invert(56%) sepia(81%) saturate(552%) hue-rotate(347deg) brightness(97%) contrast(87%)", flexShrink: 0 }} />}
                      <span style={{ color: schedule.overdue ? "#d3212f" : undefined }}>{schedule.date}</span>
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {survey.site_name ? survey.site_name.slice(0, 20) : "No site"}...{survey.site_postcode ? ` ${survey.site_postcode}` : ""}
                    </span>
                    <span />

                    {/* Row 2: time | surveyor · scheduleLabel | status + edit */}
                    <span style={{ color: "#6c757d" }}>{schedule.time}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[survey.assigned_to || "Unassigned", schedule.scheduleLabel].filter(Boolean).join(" \u00B7 ")}
                    </span>
                    <span style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{survey.status_display}</span>
                      <Link to={`/surveys/${survey.id}`} className="text-decoration-none" onClick={(e) => e.stopPropagation()}>
                        <img className="team-edit-icon" src="/view.svg" alt="View" width="12" height="12" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
                      </Link>
                      <Link to={`/surveys/${survey.id}/edit`} className="text-decoration-none" onClick={(e) => e.stopPropagation()}>
                        <img className="team-edit-icon" src="/datumise-edit.svg" alt="Edit" width="12" height="12" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
                      </Link>
                    </span>

                    {/* Row 3: action buttons (only when applicable) */}
                    {(() => {
                      const canStart = (survey.status === "planned" || survey.status === "open" || survey.current_session_status === "paused") && survey.is_surveyor && survey.assigned_to;
                      const canAssign = (survey.status === "planned" || survey.status === "open") && !survey.assigned_to;
                      if (!canStart && !canAssign) return null;
                      return (
                        <span style={{ gridColumn: "1 / -1", justifySelf: "end" }}>
                          {canStart && (
                            <a
                              href="#"
                              style={{ fontWeight: 700, color: "#198754", textDecoration: "none" }}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  await api.patch(`/api/surveys/${survey.id}/`, { status: PATCH_START_SESSION });
                                  navigate(`/surveys/${survey.id}/capture`);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                            >
                              {survey.current_session_status === "paused" ? "Resume" : "Start"}
                            </a>
                          )}
                          {canAssign && (
                            <a
                              href="#"
                              style={{ fontWeight: 600, color: "#0d6efd", textDecoration: "none", fontSize: "0.75rem" }}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
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
                        </span>
                      );
                    })()}
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
            style={{ width: "44px", height: "44px", background: "#db440a", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
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
      <div className="d-md-none">
        <AddButton to="/surveys/create" />
      </div>
      <ReturnButton to={clientFilter ? `/clients/${clientFilter}` : "/"} />
      <BackToTop />
    </div>
  );
}

export default SurveyList;
