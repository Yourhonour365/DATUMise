import React, { useState, useEffect } from "react";
import api from "./api/api";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";
import { useFilters } from "./FilterContext";
import FilterAppliedCard from "./FilterAppliedCard";
import AddButton from "./AddButton";
import FilterMultiSelect from "./FilterMultiSelect";

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

  const ss = survey.survey_status || survey.status;
  const isFinished = (
    ["completed", "cancelled", "abandoned"].includes(ss) ||
    survey.survey_record_status === "archived" ||
    ["submitted", "completed", "missed", "cancelled", "archived"].includes(survey.status) ||
    (survey.status === "assigned" && survey.current_session_status === null)
  );
  const isOverdue = due && due < now && !isFinished;

  let date = "-";
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
  const sched = survey.scheduled_status || schedStatus;
  if (sched === "self_scheduled") {
    scheduleLabel = "Self-set";
  } else if (sched === "provisional") {
    scheduleLabel = "Provisional";
  } else if (sched === "confirmed" || sched === "booked") {
    scheduleLabel = "Confirmed";
  } else if (visitReq === "prearranged") {
    scheduleLabel = "Pre-arranged";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSurveys, setSelectedSurveys] = useState(new Set());
  const { filters, setFilters, clearFilters } = useFilters();
  const [filterClients, setFilterClients] = useState([]);
  const [filterSites, setFilterSites] = useState([]);
  const [filterTeam, setFilterTeam] = useState([]);
  const [userId, setUserId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [surveyorFilter, setSurveyorFilter] = useState(new Set());
  const [clientFilterLocal, setClientFilterLocal] = useState(new Set());
  const [siteFilterLocal, setSiteFilterLocal] = useState(new Set());
  const [dateFilter, setDateFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState(new Set());
  const [myOnly, setMyOnly] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const autoFilterDoneRef = React.useRef(false);

  useEffect(() => {
    document.body.style.backgroundColor = "#faf6ef";
    return () => { document.body.style.backgroundColor = ""; };
  }, []);

  // Fetch filter options and auto-set "My Surveys" for surveyors
  useEffect(() => {
    Promise.all([
      api.get("/api/clients/"),
      api.get("/api/sites/"),
      api.get("/api/team/"),
      api.get("/api/auth/user/").catch(() => ({ data: {} })),
    ]).then(([c, s, t, u]) => {
      setFilterClients(c.data.results || c.data);
      setFilterSites(s.data.results || s.data);
      const teamData = t.data.results || t.data;
      setFilterTeam(teamData);
      const uid = u.data.pk || u.data.id || null;
      setUserId(uid);
      if (!autoFilterDoneRef.current && uid) {
        autoFilterDoneRef.current = true;
        const me = teamData.find(m => String(m.id) === String(uid) || String(m.user) === String(uid));
        if (me && (me.role === "surveyor" || me.role === "admin")) {
          setMyOnly(true);
        }
      }
      setFiltersReady(true);
    }).catch(() => { setFiltersReady(true); });
  }, []);

  useEffect(() => {
    // Wait for filter options to load (and auto-filter to be set) before fetching
    if (!filtersReady) return;
    if (myOnly && !userId) return;
    const fetchSurveys = async () => {
      try {
        let url = `/api/surveys/?search=${searchTerm}`;
        // Local status filter
        if (statusFilter) {
          const statusMap = { active: "open,assigned", completed: "completed", cancelled: "archived", abandoned: "archived", archived: "archived", draft: "draft" };
          url += `&status=${statusMap[statusFilter] || statusFilter}`;
          if (statusFilter === "cancelled") url += `&closure_reason=cancelled`;
          if (statusFilter === "abandoned") url += `&closure_reason=abandoned`;
        } else if (filters.statuses.length) {
          const dbStatuses = [...new Set(filters.statuses.map((s) => STATUS_FILTER_TRANSLATION[s.id] || s.id))];
          url += `&status=${dbStatuses.join(",")}`;
        }
        // Client
        if (clientFilter) {
          url += `&client=${clientFilter}`;
        } else if (clientFilterLocal.size > 0) {
          url += `&client=${[...clientFilterLocal].join(",")}`;
        } else if (filters.clients.length) {
          url += `&client=${filters.clients.map((c) => c.id).join(",")}`;
        }
        // Site
        if (siteFilterLocal.size > 0) url += `&site=${[...siteFilterLocal].join(",")}`;
        else if (filters.sites.length) url += `&site=${filters.sites.map((s) => s.id).join(",")}`;
        // Surveyor
        if (myOnly && userId) url += `&assigned_to=${userId}`;
        else if (surveyorFilter.size > 0) url += `&assigned_to=${[...surveyorFilter].join(",")}`;
        else if (filters.surveyors.length) url += `&assigned_to=${filters.surveyors.map((s) => s.id).join(",")}`;
        // Legacy context filters
        if (filters.schedule_types.length) url += `&visit_requirement=${filters.schedule_types.map((s) => s.id).join(",")}`;
        if (filters.site_types.length) url += `&site_type=${filters.site_types.map((s) => s.id).join(",")}`;
        // Date
        if (dateFilter) url += `&time_period=${dateFilter}`;
        if (scheduleFilter.size > 0) url += `&schedule_status=${[...scheduleFilter].join(",")}`;
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
  }, [searchTerm, clientFilter, filters, statusFilter, surveyorFilter, clientFilterLocal, siteFilterLocal, dateFilter, scheduleFilter, myOnly, userId, filtersReady]);

  return (
    <div className="container mt-3" style={{ paddingBottom: "50vh" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to={clientFilter ? `/clients/${clientFilter}` : "/"} className="text-decoration-none">
          &larr; Back to {clientFilter ? "Client" : "Home"}
        </Link>
      </div>
      <div className="d-none d-md-block mb-1">
        <h5 className="mb-0 fw-bold">Surveys ({surveys.length})</h5>
      </div>
      {surveys.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 12px", marginBottom: 8, fontSize: "0.82rem", color: "#6c757d" }}>
          <span style={{ fontWeight: 700, color: "#1f0e05" }}>Surveys:</span>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span>All {surveys.length}</span>
            <span>Scheduled {surveys.filter(s => s.survey_date_status === "scheduled" || s.scheduled_for).length}</span>
            <span>Unscheduled {surveys.filter(s => s.survey_date_status === "unscheduled" || (!s.survey_date_status && !s.scheduled_for)).length}</span>
            <span>Completed {surveys.filter(s => (s.survey_status || s.status) === "completed").length}</span>
          </div>
          <span />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span>Draft {surveys.filter(s => (s.survey_status || s.status) === "draft").length}</span>
            <span>Cancelled {surveys.filter(s => (s.survey_status) === "cancelled" || (s.status === "archived" && s.closure_reason === "cancelled")).length}</span>
            <span>Abandoned {surveys.filter(s => (s.survey_status) === "abandoned" || (s.status === "archived" && s.closure_reason === "abandoned")).length}</span>
            <span>Archived {surveys.filter(s => s.survey_record_status === "archived" || s.status === "archived").length}</span>
          </div>
        </div>
      )}
      {surveys.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8, fontSize: "0.82rem", color: "#6c757d" }}>
          <span style={{ fontWeight: 700, color: "#1f0e05" }}>Sessions:</span>
          <span>All {surveys.reduce((n, s) => n + (s.session_count || 0), 0)}</span>
          <span>Live {surveys.filter(s => s.current_session_status === "active").length}</span>
          <span>Paused {surveys.filter(s => s.current_session_status === "paused").length}</span>
        </div>
      )}
      <div className="d-flex gap-2 align-items-center mb-3">
        <Link to="/surveys/create" className="btn btn-sm" style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}>Add Survey</Link>
        {selectMode && selectedSurveys.size > 0 && (
          <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
            onClick={async () => {
              try {
                const count = selectedSurveys.size;
                await Promise.all([...selectedSurveys].map(sId => {
                  const src = surveys.find(s => s.id === sId);
                  if (!src) return Promise.resolve();
                  return api.post("/api/surveys/", {
                    site: src.site_id || src.site,
                    visit_requirement: src.visit_requirement || null,
                    visit_time: src.visit_time || null,
                    arrival_action: src.arrival_action || null,
                    departure_action: src.departure_action || src.arrival_action || null,
                    window_days: src.window_days || null,
                  });
                }));
                setSelectMode(false); setSelectedSurveys(new Set());
                alert(`${count} survey${count !== 1 ? "s" : ""} copied as draft.`);
                window.location.reload();
              } catch (err) { alert("Failed to copy surveys."); }
            }}>Copy ({selectedSurveys.size})</button>
        )}
        <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: "#0006b1", color: "#fefdfc", border: "none", borderRadius: 2, height: 24, marginLeft: "auto" }}
          onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedSurveys(new Set()); }}>
          {selectMode ? `Select (${selectedSurveys.size})` : "Select"}
        </button>
      </div>
      {/* ---- Filters container ---- */}
      <div className="edit-fieldset mb-4" style={{ backgroundColor: "#2E5E3E", borderRadius: 2, color: "#fefdfc" }}>
        <p className="edit-legend section-toggle" onClick={() => setFiltersOpen(!filtersOpen)} style={{ color: "#fefdfc" }}>
          <span className={`section-chevron section-chevron--light${filtersOpen ? " section-chevron--open" : ""}`}></span>
          Filters
        </p>
        {filtersOpen && <>
        <div style={{ marginLeft: "var(--section-gap, 16px)", marginBottom: 8 }}>
          <input type="text" className="filter-search" placeholder="Search surveys..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "4px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: "transparent", color: "#fefdfc", outline: "none", width: "100%", maxWidth: 220 }} />
        </div>
        <div className="d-flex gap-2 flex-wrap" style={{ marginLeft: "var(--section-gap, 16px)", marginBottom: 6, alignItems: "stretch" }}>
          <button type="button" onClick={() => { setMyOnly(!myOnly); if (!myOnly) setSurveyorFilter(new Set()); }}
            style={{ fontSize: "0.72rem", padding: "2px 12px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: myOnly ? "#25d366" : "transparent", color: "#fefdfc", cursor: "pointer", height: 24 }}>
            My Surveys
          </button>
          <FilterMultiSelect label="Surveyor" options={filterTeam.filter(m => m.role === "surveyor")} selected={surveyorFilter} onChange={(s) => { setSurveyorFilter(s); if (s.size > 0) setMyOnly(false); }} />
          <FilterMultiSelect label="Client" options={filterClients} selected={clientFilterLocal} onChange={setClientFilterLocal} />
          <FilterMultiSelect label="Site" options={filterSites} selected={siteFilterLocal} onChange={setSiteFilterLocal} />
          <FilterMultiSelect label="Schedule" options={[
            { id: "self_scheduled", name: "Self-set" },
            { id: "provisional", name: "Provisional" },
            { id: "confirmed", name: "Confirmed" },
          ]} selected={scheduleFilter} onChange={setScheduleFilter} />
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            style={{ fontSize: "0.72rem", padding: "2px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: dateFilter ? "#25d366" : "transparent", color: "#fefdfc", outline: "none", height: 24 }}>
            <option value="" style={{ color: "#1f2a33" }}>Date</option>
            <option value="all_time" style={{ color: "#1f2a33" }}>All Time</option>
            <option value="today" style={{ color: "#1f2a33" }}>Today</option>
            <option value="this_week" style={{ color: "#1f2a33" }}>This week</option>
            <option value="this_month" style={{ color: "#1f2a33" }}>This month</option>
            <option value="last_month" style={{ color: "#1f2a33" }}>Last month</option>
          </select>
        </div>
        <div className="d-flex gap-2 flex-wrap" style={{ marginLeft: "var(--section-gap, 16px)", marginBottom: 6 }}>
          {[{ v: "active", l: "Active" }, { v: "completed", l: "Completed" }, { v: "cancelled", l: "Cancelled" }, { v: "abandoned", l: "Abandoned" }, { v: "archived", l: "Archived" }, { v: "draft", l: "Draft" }].map(({ v, l }) => (
            <button key={v} type="button" onClick={() => setStatusFilter(statusFilter === v ? "" : v)}
              style={{ fontSize: "0.72rem", padding: "2px 12px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: statusFilter === v ? "#db440a" : "transparent", color: "#fefdfc", cursor: "pointer", height: 24 }}>
              {l}
            </button>
          ))}
        </div>
        {(myOnly || surveyorFilter.size > 0 || clientFilterLocal.size > 0 || siteFilterLocal.size > 0 || scheduleFilter.size > 0 || dateFilter || statusFilter) && (
          <div style={{ marginLeft: "var(--section-gap, 16px)" }}>
            <button type="button" onClick={() => { setMyOnly(false); setSurveyorFilter(new Set()); setClientFilterLocal(new Set()); setSiteFilterLocal(new Set()); setScheduleFilter(new Set()); setDateFilter(""); setStatusFilter(""); clearFilters(); }}
              style={{ border: "none", background: "#fcfaf7", padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", borderRadius: 4 }}>Clear all</button>
          </div>
        )}
        </>}
        {/* Active filter chips when accordion closed */}
        {!filtersOpen && (() => {
          const chips = [];
          if (myOnly) chips.push({ key: "my", label: "My Surveys", clear: () => setMyOnly(false) });
          if (surveyorFilter.size > 0) chips.push({ key: "sv", label: `Surveyor (${surveyorFilter.size})`, clear: () => setSurveyorFilter(new Set()) });
          if (clientFilterLocal.size > 0) chips.push({ key: "cl", label: `Client (${clientFilterLocal.size})`, clear: () => setClientFilterLocal(new Set()) });
          if (siteFilterLocal.size > 0) chips.push({ key: "si", label: `Site (${siteFilterLocal.size})`, clear: () => setSiteFilterLocal(new Set()) });
          if (scheduleFilter.size > 0) chips.push({ key: "sc", label: `Schedule (${scheduleFilter.size})`, clear: () => setScheduleFilter(new Set()) });
          if (dateFilter) chips.push({ key: "dt", label: dateFilter.replace(/_/g, " "), clear: () => setDateFilter("") });
          if (statusFilter) chips.push({ key: "st", label: statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1), clear: () => setStatusFilter("") });
          if (searchTerm) chips.push({ key: "q", label: `"${searchTerm}"`, clear: () => setSearchTerm("") });
          if (chips.length === 0) return null;
          return (
            <div className="d-flex gap-2 flex-wrap" style={{ marginLeft: "var(--section-gap, 16px)", marginTop: 4 }}>
              {chips.map(c => (
                <span key={c.key} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#2e5e3e", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {c.label} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#c0392b" }} onClick={c.clear}>&times;</button>
                </span>
              ))}
            </div>
          );
        })()}
      </div>


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
                  style={{ ...((survey.survey_status || survey.status) === "draft" ? { borderLeft: "4px solid #FFA500", borderRight: "4px solid #FFA500" } : {}), position: "relative" }}
                  onClick={() => {
                    if (selectMode) { setSelectedSurveys(prev => { const n = new Set(prev); n.has(survey.id) ? n.delete(survey.id) : n.add(survey.id); return n; }); return; }
                    navigate(`/surveys/${survey.id}`);
                  }}
                >
                  <div className="survey-queue-grid">
                    {/* Row 1: date + schedule status | site name, postcode | ! | ★ */}
                    <span style={{ color: schedule.overdue ? "#d3212f" : undefined, gridColumn: "1 / 3" }}>
                      <span style={{ display: "inline-block", width: "5em" }}>{schedule.date}</span>{schedule.scheduleLabel ? <span style={{ fontSize: "0.68rem", fontStyle: "italic" }}>{schedule.scheduleLabel}</span> : ""}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                      {survey.site_name || "No site"}{survey.site_postcode ? `, ${survey.site_postcode}` : ""}
                    </span>
                    <span>{schedule.urgent && <span style={{ color: "#ffff00", fontWeight: 700 }}>!</span>}</span>
                    <span>{survey.client_present && <span style={{ color: "#ffff00" }}>&#9733;</span>}</span>

                    {/* Row 2: time | sessions */}
                    <span style={{ gridColumn: "1 / 3" }}>{schedule.time || "-"}</span>
                    <span style={{ gridColumn: "3 / -1", fontStyle: "italic", fontSize: "0.68rem" }}>
                      {survey.session_count > 0 && <>{survey.session_count} Session{survey.session_count !== 1 ? "s" : ""}{survey.current_session_status === "active" ? " · 1 Live" : survey.current_session_status === "paused" ? " · 1 Paused" : ""}</>}
                    </span>

                    {/* Row 3: status | obs + draft + surveyor */}
                    <span style={{ fontStyle: "italic", fontSize: "0.68rem", gridColumn: "1 / 3" }}>{(() => {
                      const ss = survey.survey_status;
                      if (ss === "completed") return "Completed";
                      if (ss === "cancelled") return "Cancelled";
                      if (ss === "abandoned") return "Abandoned";
                      if (ss === "draft") return "Draft";
                      if (ss === "active" || survey.status === "open" || survey.status === "assigned") return "Active";
                      if (survey.survey_record_status === "archived") return "Archived";
                      return survey.status_display || "";
                    })()}</span>
                    <span style={{ gridColumn: "3 / -1", display: "flex", gap: "0.3rem", alignItems: "baseline", overflow: "hidden", whiteSpace: "nowrap" }}>{(() => {
                      const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
                      const obs = survey.observation_count || 0;
                      const drafts = (survey.observations || []).filter(o => o.is_draft).length || 0;
                      return (<>
                        <span style={{ flexShrink: 0, fontStyle: "italic" }}>{fmt(obs)} Obs</span>
                        <span style={{ flexShrink: 0, fontStyle: "italic" }}>{fmt(drafts)} Draft</span>
                        <span style={{ fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, marginLeft: "0.5rem" }}>{survey.assigned_to_name || survey.assigned_to || "Unassigned"}</span>
                      </>);
                    })()}</span>

                  </div>
                  {selectMode && (
                    <div style={{ position: "absolute", bottom: 6, right: 8, width: 20, height: 20, borderRadius: "50%", border: "2px solid #fff", backgroundColor: selectedSurveys.has(survey.id) ? "#0d6efd" : "transparent" }} />
                  )}
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
        <div className="d-flex justify-content-center gap-2 mt-3 mb-3">
          <button
            className="btn btn-outline-secondary btn-sm"
            style={{ opacity: previousPage ? 1 : 0.4 }}
            onClick={() =>
              previousPage &&
              api.get(previousPage).then((response) => {
                setSurveys(response.data.results);
                setNextPage(response.data.next);
                setPreviousPage(response.data.previous);
                window.scrollTo(0, 0);
              })
            }
            disabled={!previousPage}
          >
            &larr; Previous
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            style={{ opacity: nextPage ? 1 : 0.4 }}
            onClick={() =>
              nextPage &&
              api.get(nextPage).then((response) => {
                setSurveys(response.data.results);
                setNextPage(response.data.next);
                setPreviousPage(response.data.previous);
                window.scrollTo(0, 0);
              })
            }
            disabled={!nextPage}
          >
            Next &rarr;
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
