import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import api from "./api/api";
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
    // Idempotent: skip initial fetch when cache provided (safe in Strict Mode)
    if (initialCache && searchTerm === "") return;

    let url = surveyId
      ? `/api/observations/?survey=${surveyId}&search=${searchTerm}`
      : `/api/observations/?search=${searchTerm}`;

    if (filters.clients.length) url += `&survey__client=${filters.clients.map((c) => c.id).join(",")}`;
    if (filters.sites.length) url += `&survey__site=${filters.sites.map((s) => s.id).join(",")}`;
    if (filters.surveyors.length) url += `&owner=${filters.surveyors.map((s) => s.id).join(",")}`;
    if (filters.site_types.length) url += `&site_type=${filters.site_types.map((s) => s.id).join(",")}`;
    if (filters.timePeriod) url += `&time_period=${filters.timePeriod}`;

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

  // Restore scroll + highlight from cache (idempotent — safe for Strict Mode double-mount)
  useEffect(() => {
    if (!initialCache || loading) return;

    requestAnimationFrame(() => {
      if (initialCache.scrollY) {
        window.scrollTo(0, initialCache.scrollY);
      }
      if (initialCache.highlightId) {
        const el = document.getElementById(`obs-${initialCache.highlightId}`);
        if (el) {
          el.style.background = "#9a8255";
          el.style.transition = "none";
          setTimeout(() => {
            el.style.transition = "background 2s ease";
            el.style.background = "";
          }, 600);
        }
      }
    });
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
          [...observations]
            .sort((a, b) => {
              if (sortOrder === "most_liked") return (b.likes_count || 0) - (a.likes_count || 0);
              if (sortOrder === "most_commented") return (b.comment_count || 0) - (a.comment_count || 0);
              const dateA = new Date(a.created_at);
              const dateB = new Date(b.created_at);
              return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
            })
            .map((obs) => (
            <div
              key={obs.id}
              id={`obs-${obs.id}`}
              className={`observation-row${highlightedObs === obs.id ? " observation-row-highlight" : ""}`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => { if (highlightedObs && highlightedObs !== obs.id) setHighlightedObs(null); }}
              onClick={() =>
                navigateWithCache(`/observations/${obs.id}`, {}, obs.id)
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
                {(obs.likes_count > 0 || obs.comment_count > 0 || obs.comment_likes_count > 0) && (
                  <div className="observation-row-desc d-flex align-items-center gap-2">
                    {obs.likes_count > 0 && (
                      <span className="d-flex align-items-center gap-1">
                        <img src="/datumise-like.svg" alt="" width="12" height="12" style={{ opacity: 0.5 }} />
                        {obs.likes_count}
                      </span>
                    )}
                    {obs.comment_count > 0 && (
                      <span className="d-flex align-items-center gap-1">
                        <img src="/datumise-comment.svg" alt="" width="12" height="12" style={{ opacity: 0.5 }} />
                        {obs.comment_count}
                      </span>
                    )}
                    {obs.comment_likes_count > 0 && (
                      <span className="d-flex align-items-center gap-1">
                        <img src="/datumise-comment.svg" alt="" width="10" height="10" style={{ opacity: 0.4 }} />
                        <img src="/datumise-like.svg" alt="" width="10" height="10" style={{ opacity: 0.4, marginLeft: "-4px" }} />
                        {obs.comment_likes_count}
                      </span>
                    )}
                  </div>
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
            style={{ width: "44px", height: "44px", background: "#db440a", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
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
