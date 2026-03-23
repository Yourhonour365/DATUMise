import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import api from "./api/api";
import { thumbnailUrl } from "./imageUtils";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";
import { useFilters } from "./FilterContext";
import FilterAppliedCard from "./FilterAppliedCard";
import FilterMultiSelect from "./FilterMultiSelect";
import { SurveyCardGrid, surveyCardStyle } from "./SurveyCard";

function ObservationList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { surveyId } = useParams();

  // useState initializer runs exactly once, even in Strict Mode
  const [initialCache] = useState(() => {
    const c = window.__obsListCache;
    if (c && c.surveyId === (surveyId || null)) {
      window.__obsListCache = null;
      return c;
    }
    return null;
  });

  const [observations, setObservations] = useState(initialCache?.observations || []);
  const [loading, setLoading] = useState(!initialCache);
  const [nextPage, setNextPage] = useState(initialCache?.nextPage || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [useMode, setUseMode] = useState(false);
  const [selectedObs, setSelectedObs] = useState(new Set());
  const [pushModal, setPushModal] = useState(false);
  const [activeSurveys, setActiveSurveys] = useState([]);
  const [pushLoading, setPushLoading] = useState(false);
  const [selectedSurveys, setSelectedSurveys] = useState(new Set());
  const [pushNextPage, setPushNextPage] = useState(null);
  const [pushSearch, setPushSearch] = useState("");
  const [pushStatusFilter, setPushStatusFilter] = useState("");
  const { filters, setFilters, clearFilters } = useFilters();
  const [filterClients, setFilterClients] = useState([]);
  const [filterSites, setFilterSites] = useState([]);
  const [filterTeam, setFilterTeam] = useState([]);
  const [userId, setUserId] = useState(null);
  const [surveyorFilter, setSurveyorFilter] = useState(new Set());
  const [clientFilterLocal, setClientFilterLocal] = useState(new Set());
  const [siteFilterLocal, setSiteFilterLocal] = useState(new Set());
  const [dateFilter, setDateFilter] = useState("");
  const [myOnly, setMyOnly] = useState(false);
  const [sortFilter, setSortFilter] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/api/clients/"), api.get("/api/sites/"), api.get("/api/team/"),
      api.get("/api/auth/user/").catch(() => ({ data: {} })),
    ]).then(([c, s, t, u]) => {
      setFilterClients(c.data.results || c.data);
      setFilterSites(s.data.results || s.data);
      setFilterTeam(t.data.results || t.data);
      setUserId(u.data.pk || u.data.id || null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let url = surveyId
      ? `/api/observations/?survey=${surveyId}&search=${searchTerm}`
      : `/api/observations/?search=${searchTerm}`;

    if (clientFilterLocal.size > 0) url += `&survey__client=${[...clientFilterLocal].join(",")}`;
    else if (filters.clients.length) url += `&survey__client=${filters.clients.map((c) => c.id).join(",")}`;
    if (siteFilterLocal.size > 0) url += `&survey__site=${[...siteFilterLocal].join(",")}`;
    else if (filters.sites.length) url += `&survey__site=${filters.sites.map((s) => s.id).join(",")}`;
    if (myOnly && userId) url += `&owner=${userId}`;
    else if (surveyorFilter.size > 0) url += `&owner=${[...surveyorFilter].join(",")}`;
    else if (filters.surveyors.length) url += `&owner=${filters.surveyors.map((s) => s.id).join(",")}`;
    if (filters.site_types.length) url += `&site_type=${filters.site_types.map((s) => s.id).join(",")}`;
    if (dateFilter) url += `&time_period=${dateFilter}`;
    else if (filters.timePeriod) url += `&time_period=${filters.timePeriod}`;
    if (sortFilter === "most_commented") url += `&ordering=-comment_count`;
    if (sortFilter === "most_liked") url += `&ordering=-likes_count`;

    // If cache exists, show cached data immediately but update counts in background
    if (initialCache && searchTerm === "") {
      api.get(url).then((response) => {
        const freshMap = {};
        response.data.results.forEach((obs) => { freshMap[obs.id] = obs; });
        setObservations((prev) =>
          prev.map((obs) => freshMap[obs.id]
            ? { ...obs, likes_count: freshMap[obs.id].likes_count, comment_count: freshMap[obs.id].comment_count, reply_count: freshMap[obs.id].reply_count, is_liked: freshMap[obs.id].is_liked }
            : obs
          )
        );
      }).catch(() => {});
      return;
    }

    setLoading(true);
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
  }, [surveyId, searchTerm, initialCache, filters]);

  // Restore scroll + highlight from cache
  useLayoutEffect(() => {
    if (!initialCache || loading) return;

    if (initialCache.highlightId) {
      const el = document.getElementById(`obs-${initialCache.highlightId}`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        const rowDiv = el.querySelector(".observation-row") || el;
        rowDiv.style.background = "#9a8255";
        rowDiv.style.transition = "none";
        setTimeout(() => {
          rowDiv.style.transition = "background 2s ease";
          rowDiv.style.background = "";
        }, 600);
      }
    } else if (initialCache.scrollY) {
      window.scrollTo(0, initialCache.scrollY);
    }
  }, [initialCache, loading]);

  // Scroll-to-observation from capture mode return
  const scrollTarget = location.state?.scrollToObservation;
  const [scrollReady, setScrollReady] = useState(!scrollTarget);
  const [highlightedObs, setHighlightedObs] = useState(scrollTarget || null);
  const hasScrolled = useRef(false);

  useLayoutEffect(() => {
    if (scrollTarget && !loading && observations.length > 0 && !hasScrolled.current) {
      const el = document.getElementById(`obs-${scrollTarget}`);
      if (el) {
        hasScrolled.current = true;
        el.scrollIntoView({ block: "center", behavior: "instant" });
      }
      setHighlightedObs(scrollTarget);
      setScrollReady(true);
      window.history.replaceState({}, "");
      const row = el || document.getElementById(`obs-${scrollTarget}`);
      if (row) {
        const rowDiv = row.querySelector(".observation-row") || row;
        rowDiv.style.background = "#9a8255";
        rowDiv.style.transition = "none";
        setTimeout(() => {
          rowDiv.style.transition = "background 2s ease";
          rowDiv.style.background = "#f0ece4";
        }, 1000);
      }
    }
  }, [loading, observations, scrollTarget]);

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

  const handleObsLike = async (e, obsId) => {
    e.stopPropagation();
    try {
      const response = await api.post(`/api/observations/${obsId}/like/`);
      setObservations((prev) =>
        prev.map((obs) =>
          obs.id === obsId ? { ...obs, is_liked: response.data.liked, likes_count: response.data.likes_count } : obs
        )
      );
    } catch (err) {
      console.error("Failed to like:", err);
    }
  };

  const navigateWithCache = (to, options, obsId) => {
    window.__obsListCache = {
      surveyId: surveyId || null,
      observations,
      nextPage,
      scrollY: window.scrollY,
      highlightId: obsId,
    };
    navigate(to, options);
  };

  return (
    <div className="container mt-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
      <div className="d-none d-md-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0 fw-bold">Observations ({observations.length})</h5>
        <div className="d-flex align-items-center gap-2">
          {useMode && selectedObs.size > 0 && (
            <button type="button" className="btn btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#6c757d", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
              onClick={() => setSelectedObs(new Set())}>Clear</button>
          )}
          {useMode && selectedObs.size > 0 && (
            <button type="button" className="btn btn-sm d-flex align-items-center"
              style={{ fontSize: "0.75rem", padding: "2px 8px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
              onClick={async () => {
                setPushLoading(true);
                setPushSearch("");
                setPushStatusFilter("");
                try {
                  const res = await api.get("/api/surveys/?page_size=25");
                  setActiveSurveys(res.data.results || res.data);
                  setPushNextPage(res.data.next || null);
                } catch (err) { console.error(err); }
                setPushLoading(false);
                setSelectedSurveys(new Set());
                setPushModal(true);
              }}>
              Text
            </button>
          )}
          <button type="button" className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "2px 8px", backgroundColor: "#0006b1", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
            onClick={() => { setUseMode(!useMode); if (useMode) setSelectedObs(new Set()); }}>
            {useMode && selectedObs.size > 0 ? `${selectedObs.size}/10` : "Select"}
          </button>
        </div>
      </div>
      {/* ---- Filters container ---- */}
      <div className="edit-fieldset mb-4" style={{ backgroundColor: "#2E5E3E", borderRadius: 2, color: "#fefdfc" }}>
        <p className="edit-legend section-toggle" onClick={() => setFiltersOpen(!filtersOpen)} style={{ color: "#fefdfc" }}>
          <span className={`section-chevron section-chevron--light${filtersOpen ? " section-chevron--open" : ""}`}></span>
          Filters
        </p>
        {filtersOpen && <>
        <div style={{ marginLeft: "var(--section-gap, 16px)", marginBottom: 8 }}>
          <input type="text" placeholder="Search observations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "4px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: "transparent", color: "#fefdfc", outline: "none", width: "100%", maxWidth: 220 }} />
        </div>
        <div className="d-flex gap-2 flex-wrap" style={{ marginLeft: "var(--section-gap, 16px)", marginBottom: 6 }}>
          <button type="button" onClick={() => { setMyOnly(!myOnly); if (!myOnly) setSurveyorFilter(new Set()); }}
            style={{ fontSize: "0.72rem", padding: "2px 12px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: myOnly ? "#25d366" : "transparent", color: "#fefdfc", cursor: "pointer" }}>
            My Observations
          </button>
          <FilterMultiSelect label="Surveyor" options={filterTeam.filter(m => m.role === "surveyor")} selected={surveyorFilter} onChange={(s) => { setSurveyorFilter(s); if (s.size > 0) setMyOnly(false); }} />
          <FilterMultiSelect label="Client" options={filterClients} selected={clientFilterLocal} onChange={setClientFilterLocal} />
          <FilterMultiSelect label="Site" options={filterSites} selected={siteFilterLocal} onChange={setSiteFilterLocal} />
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            style={{ fontSize: "0.72rem", padding: "2px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: dateFilter ? "#25d366" : "transparent", color: "#fefdfc", outline: "none" }}>
            <option value="" style={{ color: "#1f2a33" }}>Date</option>
            <option value="all_time" style={{ color: "#1f2a33" }}>All Time</option>
            <option value="today" style={{ color: "#1f2a33" }}>Today</option>
            <option value="this_week" style={{ color: "#1f2a33" }}>This week</option>
            <option value="this_month" style={{ color: "#1f2a33" }}>This month</option>
            <option value="last_month" style={{ color: "#1f2a33" }}>Last month</option>
          </select>
        </div>
        <div className="d-flex gap-2 flex-wrap" style={{ marginLeft: "var(--section-gap, 16px)", marginBottom: 6 }}>
          {[{ v: "most_commented", l: "Most Commented" }, { v: "most_liked", l: "Most Liked" }].map(({ v, l }) => (
            <button key={v} type="button" onClick={() => setSortFilter(sortFilter === v ? "" : v)}
              style={{ fontSize: "0.72rem", padding: "2px 12px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: sortFilter === v ? "#db440a" : "transparent", color: "#fefdfc", cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>
        {(myOnly || surveyorFilter.size > 0 || clientFilterLocal.size > 0 || siteFilterLocal.size > 0 || dateFilter || sortFilter) && (
          <div style={{ marginLeft: "var(--section-gap, 16px)" }}>
            <button type="button" onClick={() => { setMyOnly(false); setSurveyorFilter(new Set()); setClientFilterLocal(new Set()); setSiteFilterLocal(new Set()); setDateFilter(""); setSortFilter(""); clearFilters(); }}
              style={{ border: "none", background: "#fcfaf7", padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", borderRadius: 4 }}>Clear all</button>
          </div>
        )}
        </>}
        {/* Active filter chips when accordion closed */}
        {!filtersOpen && (() => {
          const chips = [];
          if (myOnly) chips.push({ key: "my", label: "My Observations", clear: () => setMyOnly(false) });
          if (surveyorFilter.size > 0) chips.push({ key: "sv", label: `Surveyor (${surveyorFilter.size})`, clear: () => setSurveyorFilter(new Set()) });
          if (clientFilterLocal.size > 0) chips.push({ key: "cl", label: `Client (${clientFilterLocal.size})`, clear: () => setClientFilterLocal(new Set()) });
          if (siteFilterLocal.size > 0) chips.push({ key: "si", label: `Site (${siteFilterLocal.size})`, clear: () => setSiteFilterLocal(new Set()) });
          if (dateFilter) chips.push({ key: "dt", label: dateFilter.replace(/_/g, " "), clear: () => setDateFilter("") });
          if (sortFilter) chips.push({ key: "sf", label: sortFilter === "most_commented" ? "Most Commented" : "Most Liked", clear: () => setSortFilter("") });
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
      {loading && <p>Loading observations...</p>}
      {!loading && !error && observations.length === 0 && (
        <p className="text-muted">No observations found.</p>
      )}

      <div style={{ opacity: scrollReady ? 1 : 0 }}>
        {!loading &&
          (() => {
            const sorted = [...observations].sort((a, b) => {
              if (sortOrder === "most_liked") return (b.likes_count || 0) - (a.likes_count || 0);
              if (sortOrder === "most_commented") return (b.comment_count || 0) - (a.comment_count || 0);
              const dateA = new Date(a.created_at);
              const dateB = new Date(b.created_at);
              return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
            });
            const obsIds = sorted.map((o) => o.id);
            return sorted.map((obs) => (
            <div
              key={obs.id}
              id={`obs-${obs.id}`}
              className={`observation-row${highlightedObs === obs.id ? " observation-row-highlight" : ""}`}
              style={{ cursor: "pointer", padding: 0, alignItems: "stretch", overflow: "hidden", gap: 0, height: "80px", position: "relative" }}
              onMouseEnter={() => { if (highlightedObs && highlightedObs !== obs.id) setHighlightedObs(null); }}
              onClick={(e) => {
                if (useMode) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  if (clickX > rect.width * 0.8) {
                    setSelectedObs(prev => { const next = new Set(prev); if (next.has(obs.id)) next.delete(obs.id); else if (next.size < 10) next.add(obs.id); return next; });
                    return;
                  }
                }
                navigateWithCache(`/observations/${obs.id}`, { state: { observationIds: obsIds, observationIndex: obsIds.indexOf(obs.id), obsCreatedAt: obs.created_at, obsOwner: obs.owner, nextPage } }, obs.id);
              }}
            >
              {obs.image ? (
                <img
                  src={thumbnailUrl(obs)}
                  alt=""
                  loading="lazy"
                  style={{ width: "80px", minHeight: "100%", objectFit: "cover", borderRadius: "2px 0 0 2px", flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: "80px", minHeight: "100%", borderRadius: "2px 0 0 2px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#e9ecef" }}>
                  <span style={{ fontSize: "0.65rem", color: "#2c3e50" }}>No img</span>
                </div>
              )}
              <div className="observation-row-content d-flex flex-column" style={{ padding: "0.3rem 1rem 0.3rem 0.4rem", overflow: "hidden" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center" }}><div className="observation-row-title" style={{ lineHeight: 1.2 }}>
                  {obs.is_draft && (
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, background: "#db440a", color: "#fff", borderRadius: "3px", padding: "1px 4px", marginRight: "5px", verticalAlign: "middle" }}>DRAFT</span>
                  )}
                  {["completed", "cancelled", "abandoned", "archived"].includes(obs.survey_status) && (
                    <span style={{ fontSize: "0.65rem", marginRight: "4px", verticalAlign: "middle" }}>{"\uD83D\uDD12"}</span>
                  )}
                  {(() => {
                    const t = obs.title || "";
                    if (t.length <= 80) return t;
                    const words = t.split(" ");
                    let line1 = "";
                    let rest = [];
                    for (let i = 0; i < words.length; i++) {
                      if ((line1 + (line1 ? " " : "") + words[i]).length <= 80) {
                        line1 += (line1 ? " " : "") + words[i];
                      } else {
                        rest = words.slice(i);
                        break;
                      }
                    }
                    if (rest.length === 0) return line1;
                    let line2 = "";
                    for (let i = 0; i < rest.length; i++) {
                      if ((line2 + (line2 ? " " : "") + rest[i]).length <= 77) {
                        line2 += (line2 ? " " : "") + rest[i];
                      } else break;
                    }
                    return <>{line1}<br />{line2}{line2.length < rest.join(" ").length ? "..." : ""}</>;
                  })()}
                </div></div>
                <div className="observation-row-meta d-flex align-items-center justify-content-start gap-2" style={{ lineHeight: 1.6, marginTop: "0.1rem", flexShrink: 0 }}>
                  <button
                    className="btn btn-link btn-sm p-0 border-0 bg-transparent d-inline-flex align-items-center gap-1"
                    style={{ fontSize: "0.6rem", textDecoration: "none", color: "#95a5a6" }}
                    onClick={(e) => handleObsLike(e, obs.id)}
                  >
                    <img src="/datumise-like.svg" alt="" width="11" height="11" style={{ opacity: obs.is_liked ? 1 : 0.4, filter: obs.is_liked ? "invert(20%) sepia(90%) saturate(3000%) hue-rotate(120deg) brightness(0.5)" : "none" }} />
                    {obs.likes_count || 0}
                  </button>
                  <button
                    className="btn btn-link btn-sm p-0 border-0 bg-transparent d-inline-flex align-items-center gap-1"
                    style={{ fontSize: "0.6rem", textDecoration: "none", color: "#95a5a6" }}
                    onClick={(e) => { e.stopPropagation(); navigateWithCache(`/observations/${obs.id}`, { state: { openComment: true } }, obs.id); }}
                  >
                    <img src="/datumise-comment.svg" alt="" width="11" height="11" style={{ opacity: 0.5 }} />
                    {obs.comment_count || 0}
                  </button>
                  <span>
                    {new Date(obs.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" \u00B7 "}{obs.owner_name || obs.owner || "Unassigned"}
                  </span>
                </div>
              </div>
              {useMode && (
                <div onClick={(e) => { e.stopPropagation(); setSelectedObs(prev => { const next = new Set(prev); if (next.has(obs.id)) next.delete(obs.id); else if (next.size < 10) next.add(obs.id); return next; }); }}
                  style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "2px solid #0006b1", backgroundColor: selectedObs.has(obs.id) ? "#0006b1" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {selectedObs.has(obs.id) && <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                </div>
              )}
            </div>
          ));
          })()}
      </div>

      <div className="text-center mt-3 mb-3">
        {nextPage ? (
          <button
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
            style={{ width: "44px", height: "44px", background: "#db440a", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
            onClick={() => handleLoadMore(nextPage)}
            aria-label="Load more"
          >
            <img src="/datumise-load.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
        ) : !loading && observations.length > 0 && (
          <>
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
              style={{ width: "44px", height: "44px", background: "#2c3e50", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
            >
              <img src="/end.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1)", opacity: 0.7 }} />
            </div>
            <div className="text-muted fst-italic mt-2" style={{ fontSize: "0.78rem" }}>All observations loaded</div>
          </>
        )}
      </div>
      <ReturnButton to="/" />
      <BackToTop />

      {pushModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 2, maxWidth: 520, width: "90%", maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="d-flex justify-content-between align-items-center" style={{ backgroundColor: "#db440a", padding: "0.5rem 1rem" }}>
              <span style={{ color: "#faf6ef", fontWeight: 700, fontSize: "1rem" }}>Create draft observations in selected surveys from observation text?</span>
              <button type="button" style={{ border: "none", background: "none", fontSize: "1.3rem", cursor: "pointer", color: "#faf6ef", lineHeight: 1, padding: 0 }} onClick={() => setPushModal(false)}>&times;</button>
            </div>
            <div style={{ padding: "0.75rem 1rem 0.5rem" }}>
              <p style={{ fontSize: "0.88rem", color: "#1F2A33", margin: "0 0 8px 0" }}>
                Create draft observations in the selected surveys using the text from your selections. No images will be copied.
              </p>
              <div className="d-flex gap-2 flex-wrap" style={{ marginBottom: 8 }}>
                <input type="text" className="filter-search" placeholder="Search surveys..." value={pushSearch}
                  onChange={(e) => setPushSearch(e.target.value)}
                  style={{ fontSize: "0.75rem", padding: "3px 8px", border: "1px solid #c8c2b8", borderRadius: 4, outline: "none", width: "100%", maxWidth: 180 }} />
                {[{ v: "", l: "All" }, { v: "active", l: "Active" }, { v: "draft", l: "Draft" }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setPushStatusFilter(v)}
                    style={{ fontSize: "0.68rem", padding: "2px 10px", border: "1px solid #c8c2b8", borderRadius: 4, backgroundColor: pushStatusFilter === v ? "#db440a" : "transparent", color: pushStatusFilter === v ? "#fff" : "#1F2A33", cursor: "pointer", height: 24 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "0 1rem" }}>
              {pushLoading ? (
                <p className="text-muted">Loading surveys...</p>
              ) : (() => {
                const filtered = activeSurveys.filter(s => {
                  if (pushSearch) {
                    const q = pushSearch.toLowerCase();
                    if (!(s.site_name || "").toLowerCase().includes(q) && !(s.name || "").toLowerCase().includes(q) && !(s.assigned_to_name || s.assigned_to || "").toLowerCase().includes(q)) return false;
                  }
                  if (pushStatusFilter) {
                    const ss = s.survey_status || s.status;
                    if (pushStatusFilter === "active" && ss !== "active" && !["open", "assigned"].includes(s.status)) return false;
                    if (pushStatusFilter === "draft" && ss !== "draft") return false;
                  }
                  return true;
                });
                return filtered.length === 0 ? (
                  <p className="text-muted">No surveys found.</p>
                ) : (<>
                  {filtered.map(s => (
                    <div key={s.id} className="survey-queue-card" style={{ ...(surveyCardStyle(s) || {}), cursor: "pointer", position: "relative" }}
                      onClick={() => { setSelectedSurveys(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; }); }}>
                      <SurveyCardGrid survey={s} />
                      <div style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "2px solid #fff", backgroundColor: selectedSurveys.has(s.id) ? "#0d6efd" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {selectedSurveys.has(s.id) && <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                      </div>
                    </div>
                  ))}
                  {pushNextPage ? (
                    <div className="text-center my-2">
                      <button className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
                        style={{ width: 36, height: 36, background: "#db440a", border: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
                        onClick={async () => {
                          try {
                            const res = await api.get(pushNextPage);
                            setActiveSurveys(prev => [...prev, ...(res.data.results || res.data)]);
                            setPushNextPage(res.data.next || null);
                          } catch (err) { console.error(err); }
                        }}>
                        <img src="/datumise-load.svg" alt="Load more" width="18" height="18" style={{ filter: "brightness(0) invert(1)" }} />
                      </button>
                    </div>
                  ) : (
                    <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#999", fontStyle: "italic", margin: "8px 0" }}>All surveys downloaded</p>
                  )}
                </>);
              })()}
            </div>
            <div className="d-flex justify-content-end gap-2" style={{ padding: "0.5rem 1rem 1rem" }}>
              {selectedSurveys.size > 0 && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedSurveys(new Set())}>Clear</button>
              )}
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setPushModal(false)}>Cancel</button>
              {selectedSurveys.size > 0 && (
                <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                  style={{ backgroundColor: "#0006b1", color: "#fefdfc", border: "none", borderRadius: 4, fontSize: "0.75rem", padding: "3px 12px" }}
                  onClick={async () => {
                    try {
                      const obsTexts = observations.filter(o => selectedObs.has(o.id)).map(o => o.title);
                      const surveyIds = [...selectedSurveys];
                      const requests = [];
                      for (const surveyId of surveyIds) {
                        for (const title of obsTexts) {
                          requests.push(api.post("/api/observations/", { survey: surveyId, title, is_draft: true }));
                        }
                      }
                      await Promise.all(requests);
                      setPushModal(false);
                      setUseMode(false);
                      setSelectedObs(new Set());
                      setSelectedSurveys(new Set());
                      alert(`${obsTexts.length * surveyIds.length} draft observations created.`);
                    } catch (err) {
                      console.error("Failed to create drafts:", err);
                      alert("Failed to create draft observations.");
                    }
                  }}>
                  <img src="/draft.svg" alt="" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} />
                  Add ({selectedSurveys.size} {selectedSurveys.size === 1 ? "survey" : "surveys"})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ObservationList;
