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
        <Link
          to="/filters"
          style={{ fontSize: "0.85rem", color: "#0d6efd", textDecoration: "underline" }}
        >
          Filters{filters.clients.length || filters.sites.length || filters.surveyors.length || filters.site_types.length ? ` (${filters.clients.length + filters.sites.length + filters.surveyors.length + filters.site_types.length})` : ""}
        </Link>
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
        const totalChips = filters.clients.length + filters.sites.length + filters.surveyors.length + filters.site_types.length;
        if (totalChips === 0) return null;
        return (
          <FilterAppliedCard totalChips={totalChips} onClear={clearFilters}>
            <div className="d-flex gap-1 flex-wrap" style={{ marginTop: "0.4rem" }}>
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
              {filters.site_types.map((st) => (
                <span key={`st-${st.id}`} className="filter-chip filter-chip-site">
                  {st.name}
                  <button type="button" className="filter-chip-x" onClick={() => setFilters({ site_types: filters.site_types.filter((x) => x.id !== st.id) })}>&times;</button>
                </span>
              ))}
            </div>
          </FilterAppliedCard>
        );
      })()}

      <h6 className="mb-2 d-none d-md-block">
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
              style={{ cursor: "pointer", padding: 0, alignItems: "stretch", overflow: "hidden", gap: 0, height: "80px" }}
              onMouseEnter={() => { if (highlightedObs && highlightedObs !== obs.id) setHighlightedObs(null); }}
              onClick={() =>
                navigateWithCache(`/observations/${obs.id}`, { state: { observationIds: obsIds, observationIndex: obsIds.indexOf(obs.id), obsCreatedAt: obs.created_at, obsOwner: obs.owner, nextPage } }, obs.id)
              }
            >
              {obs.image ? (
                <img
                  src={thumbnailUrl(obs)}
                  alt=""
                  loading="lazy"
                  style={{ width: "80px", minHeight: "100%", objectFit: "cover", borderRadius: "8px 0 0 8px", flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: "80px", minHeight: "100%", borderRadius: "8px 0 0 8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#e9ecef" }}>
                  <span style={{ fontSize: "0.65rem", color: "#2c3e50" }}>No img</span>
                </div>
              )}
              <div className="observation-row-content d-flex flex-column justify-content-between" style={{ padding: "0.3rem 0.4rem", overflow: "hidden" }}>
                <div className="observation-row-title" style={{ lineHeight: 1.2 }}>
                  {obs.is_draft && (
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, background: "#db440a", color: "#fff", borderRadius: "3px", padding: "1px 4px", marginRight: "5px", verticalAlign: "middle" }}>DRAFT</span>
                  )}
                  {obs.title}
                </div>
                <div className="observation-row-meta d-flex align-items-center justify-content-end gap-2" style={{ lineHeight: 1, marginTop: "0.1rem", flexShrink: 0 }}>
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
    </div>
  );
}

export default ObservationList;
