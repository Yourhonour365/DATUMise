import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import api from "./api/api";
import { thumbnailUrl } from "./imageUtils";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";
import { useFilters } from "./FilterContext";
import FilterAppliedCard from "./FilterAppliedCard";

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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [useMode, setUseMode] = useState(false);
  const [selectedObs, setSelectedObs] = useState(new Set());
  const [pushModal, setPushModal] = useState(false);
  const [activeSurveys, setActiveSurveys] = useState([]);
  const [pushLoading, setPushLoading] = useState(false);
  const [selectedSurveys, setSelectedSurveys] = useState(new Set());
  const { filters, setFilters, clearFilters } = useFilters();

  useEffect(() => {
    let url = surveyId
      ? `/api/observations/?survey=${surveyId}&search=${searchTerm}`
      : `/api/observations/?search=${searchTerm}`;

    if (filters.clients.length) url += `&survey__client=${filters.clients.map((c) => c.id).join(",")}`;
    if (filters.sites.length) url += `&survey__site=${filters.sites.map((s) => s.id).join(",")}`;
    if (filters.surveyors.length) url += `&owner=${filters.surveyors.map((s) => s.id).join(",")}`;
    if (filters.site_types.length) url += `&site_type=${filters.site_types.map((s) => s.id).join(",")}`;
    if (filters.timePeriod) url += `&time_period=${filters.timePeriod}`;

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
          <input type="text" className="filter-search" placeholder="Search observations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "4px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: "transparent", color: "#f5f5f7", outline: "none", width: "100%", maxWidth: 220 }} />
        </div>
        </>}
        {/* Applied chips */}
        {(() => {
          const totalChips = filters.clients.length + filters.sites.length + filters.surveyors.length + filters.site_types.length;
          if (totalChips === 0) return null;
          return (
            <div style={{ backgroundColor: "#2e5e3e", borderRadius: 2, padding: "8px 0 8px 0", marginTop: 8, marginLeft: "var(--section-gap, 16px)" }}>
              <div className="d-flex gap-2 flex-wrap align-items-center">
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
                {filters.site_types.map((st) => (
                  <span key={`st-${st.id}`} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#7b1fa2", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {st.name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#7b1fa2" }} onClick={() => setFilters({ site_types: filters.site_types.filter((x) => x.id !== st.id) })}>&times;</button>
                  </span>
                ))}
                <button type="button" style={{ border: "none", background: "#fcfaf7", padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", borderRadius: 4 }}
                  onClick={clearFilters}>Clear all</button>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="d-none d-md-flex align-items-center justify-content-between mb-2">
        <h6 className="mb-0">
          Observations
          <span className="text-muted fw-normal ms-1" style={{ fontSize: "0.85rem" }}>
            ({observations.length})
          </span>
        </h6>
        <div className="d-flex align-items-center gap-2">
          {useMode && selectedObs.size > 0 && (
            <>
              <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 4 }}
                onClick={async () => {
                  setPushLoading(true);
                  try {
                    const res = await api.get("/api/surveys/");
                    const all = res.data.results || res.data;
                    setActiveSurveys(all.filter(s => !["completed", "archived"].includes(s.status)));
                  } catch (err) { console.error(err); }
                  setPushLoading(false);
                  setSelectedSurveys(new Set());
                  setPushModal(true);
                }}>
                <img src="/draft.svg" alt="" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} />
                Add to survey
              </button>
            </>
          )}
          <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
            style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: useMode ? "#0006b1" : "#db440a", color: "#fefdfc", border: "none", borderRadius: 4 }}
            onClick={() => { setUseMode(!useMode); if (useMode) setSelectedObs(new Set()); }}>
            <img src="/use.svg" alt="" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} />
            {useMode ? `Using (${selectedObs.size})` : "Use"}
          </button>
        </div>
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
                    setSelectedObs(prev => { const next = new Set(prev); if (next.has(obs.id)) next.delete(obs.id); else next.add(obs.id); return next; });
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
                  {obs.title}
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
                    {" \u00B7 "}{obs.owner || "Unassigned"}
                  </span>
                </div>
              </div>
              {useMode && (
                <div onClick={(e) => { e.stopPropagation(); setSelectedObs(prev => { const next = new Set(prev); if (next.has(obs.id)) next.delete(obs.id); else next.add(obs.id); return next; }); }}
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
          <div style={{ backgroundColor: "#fff", borderRadius: 8, padding: "1.5rem", maxWidth: 420, width: "90%", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
            <div className="d-flex justify-content-between align-items-start mb-1">
              <h6 className="fw-bold mb-0" style={{ fontSize: "0.9rem" }}>Reuse {selectedObs.size} observation description{selectedObs.size !== 1 ? "s" : ""}?</h6>
              <button type="button" style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer", flexShrink: 0 }} onClick={() => setPushModal(false)}>&times;</button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#555", margin: "0 0 12px 0" }}>
              Create draft observations in the selected surveys using the text from your selections. No images will be copied.
            </p>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {pushLoading ? (
                <p className="text-muted">Loading surveys...</p>
              ) : activeSurveys.length === 0 ? (
                <p className="text-muted">No active surveys found.</p>
              ) : (
                activeSurveys.map(s => (
                  <div key={s.id} className="survey-queue-card" style={{ cursor: "pointer", position: "relative", backgroundColor: selectedSurveys.has(s.id) ? "#dbeafe" : undefined }}
                    onClick={() => { setSelectedSurveys(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; }); }}>
                    <div className="survey-queue-grid" style={{ gridTemplateColumns: "auto 1fr auto" }}>
                      <span style={{ fontSize: "0.78rem", color: "#6c757d" }}>
                        {s.scheduled_for ? new Date(s.scheduled_for).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{s.site_name || "No site"}</span>
                      <span style={{ fontSize: "0.78rem", color: "#6c757d" }}>{s.status_display || s.status}</span>
                      <span style={{ fontSize: "0.78rem", color: "#6c757d" }}>
                        {s.scheduled_for ? new Date(s.scheduled_for).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#6c757d" }}>{s.assigned_to || "Unassigned"}</span>
                      <span />
                    </div>
                    <div style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "2px solid #0006b1", backgroundColor: selectedSurveys.has(s.id) ? "#0006b1" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selectedSurveys.has(s.id) && <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
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
                  Add ({selectedSurveys.size})
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
