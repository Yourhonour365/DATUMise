import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import EditButton from "./EditButton";
import OverviewBlock from "./OverviewBlock";
import { SurveyCardGrid, surveyCardStyle } from "./SurveyCard";

function SiteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [siblingIds, setSiblingIds] = useState({ prev: null, next: null });
  const [sitePosition, setSitePosition] = useState({ current: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [surveysOpen, setSurveysOpen] = useState(false);
  const [surveysListOpen, setSurveysListOpen] = useState(true);
  const [surveyFilter, setSurveyFilter] = useState("active");
  const [surveySelectMode, setSurveySelectMode] = useState(false);
  const [selectedSurveys, setSelectedSurveys] = useState(new Set());

  useEffect(() => {
    setSurveysOpen(false);
    setSurveysListOpen(false);
    setSurveyFilter("active");
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const [siteRes, surveysRes] = await Promise.all([
          api.get(`/api/sites/${id}/`),
          api.get(`/api/surveys/?site=${id}`),
        ]);
        const siteData = siteRes.data;
        setSite(siteData);
        setSurveys(surveysRes.data.results || surveysRes.data);
        // Fetch sibling sites for prev/next
        try {
          const allSitesRes = await api.get(`/api/sites/?client=${siteData.client}`);
          const allSites = allSitesRes.data.results || allSitesRes.data;
          const idx = allSites.findIndex(s => String(s.id) === String(id));
          setSiblingIds({
            prev: idx > 0 ? allSites[idx - 1].id : null,
            next: idx < allSites.length - 1 ? allSites[idx + 1].id : null,
          });
          setSitePosition({ current: idx + 1, total: allSites.length });
        } catch (_) {}
      } catch (err) {
        console.error("Failed to fetch site:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <p className="text-muted">Loading site...</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="container mt-4">
        <p className="text-danger">Site not found.</p>
        <ReturnButton to="/clients" />
      </div>
    );
  }

  return (
    <div className="container mt-3 px-3" style={{ paddingBottom: "50vh" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to={`/clients/${site.client}`} className="text-decoration-none">
          &larr; Back to {site.client_name}
        </Link>
      </div>

      <OverviewBlock
        name={site.name}
        subtitle={site.site_type_display || ""}
        stats={`${site.client_name} \u00B7 ${site.survey_count} ${site.survey_count === 1 ? "survey" : "surveys"}`}
        status={site.status}
        contact={{ name: site.contact_name, phone: site.contact_phone, email: site.contact_email }}
        address={[site.address_line_1, site.address_line_2, site.city].filter(Boolean)}
        postcode={site.postcode}
        position={sitePosition.total >= 1 ? { current: `Site ${sitePosition.current}`, total: sitePosition.total } : null}
      />
      <div className="d-flex gap-2 align-items-center mt-2 mb-2">
        <Link to={`/surveys/create?client=${site.client}&site=${id}`} className="btn btn-sm" style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24, textDecoration: "none" }}>+ Survey</Link>
        <Link to={`/sites/create?client=${site.client}`} className="btn btn-sm" style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24, textDecoration: "none" }}>+ Site</Link>
        <Link to={`/sites/${id}/edit`} className="btn btn-secondary btn-sm d-inline-flex align-items-center" style={{ borderRadius: 2, height: 24, fontSize: "0.75rem", padding: "3px 12px", textDecoration: "none" }}>Edit</Link>
      </div>


      {/* ---- Prev / Next ---- */}
      <div className="d-flex gap-2 mb-2" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!siblingIds.prev}
          style={{ opacity: siblingIds.prev ? 1 : 0.4 }}
          onClick={() => siblingIds.prev && navigate(`/sites/${siblingIds.prev}`)}>
          &larr; Previous
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!siblingIds.next}
          style={{ opacity: siblingIds.next ? 1 : 0.4 }}
          onClick={() => siblingIds.next && navigate(`/sites/${siblingIds.next}`)}>
          Next &rarr;
        </button>
      </div>

      {/* ---- Survey Filters ---- */}
      <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", marginTop: 16 }}>
        <p className="edit-legend section-toggle" onClick={() => setSurveysOpen(!surveysOpen)}>
          <span className={`section-chevron${surveysOpen ? " section-chevron--open" : ""}`}></span>
          Survey Filters{surveys.length > 0 ? ` (${surveys.length})` : ""}
        </p>
        {surveysOpen && <div className="card-stack">
          <div className="d-flex gap-2 flex-wrap filter-btn-row" style={{ marginLeft: "1rem" }}>
            {[
              { value: "active", label: "Active", count: surveys.filter(s => (s.survey_status || s.status) === "active" || ["draft", "open", "assigned"].includes(s.status)).length },
              { value: "completed", label: "Completed", count: surveys.filter(s => (s.survey_status || s.status) === "completed").length },
              { value: "archived", label: "Archived", count: surveys.filter(s => s.survey_record_status === "archived" || (s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned")).length },
              { value: "cancelled", label: "Cancelled", count: surveys.filter(s => (s.survey_status) === "cancelled" || (s.status === "archived" && s.closure_reason === "cancelled")).length },
              { value: "abandoned", label: "Abandoned", count: surveys.filter(s => (s.survey_status) === "abandoned" || (s.status === "archived" && s.closure_reason === "abandoned")).length },
            ].map(({ value, label, count }) => (
              <button key={value} type="button"
                className={`btn btn-sm ${surveyFilter === value ? "btn-secondary" : "btn-outline-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem" }}
                onClick={() => setSurveyFilter(value)}>
                {label} <span className="filter-count">({count})</span>
              </button>
            ))}
          </div>
        </div>}
      </div>

      {/* ---- Surveys ---- */}
      <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
        <div className="section-header-row">
          <p className="edit-legend section-toggle" onClick={() => setSurveysListOpen(!surveysListOpen)} style={{ marginBottom: 0 }}>
            <span className={`section-chevron${surveysListOpen ? " section-chevron--open" : ""}`}></span>
            Surveys ({surveys.length})
          </p>
          <div className="section-header-actions">
            {surveySelectMode && selectedSurveys.size > 0 && (<>
              <button type="button" className="btn btn-sm d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, padding: 0, backgroundColor: "#c0392b", border: "none", borderRadius: 2 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!window.confirm(`Delete ${selectedSurveys.size} survey${selectedSurveys.size !== 1 ? "s" : ""}?`)) return;
                  try {
                    await Promise.all([...selectedSurveys].map(sId => api.delete(`/api/surveys/${sId}/`)));
                    setSurveySelectMode(false); setSelectedSurveys(new Set());
                    const res = await api.get(`/api/surveys/?site=${id}`); setSurveys(res.data.results || res.data);
                  } catch (err) { alert("Failed to delete surveys."); }
                }}>
                <img src="/datumise_delete.svg" alt="Delete" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} /></button>
              <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: "#6c757d", color: "#fefdfc", border: "none", borderRadius: 4 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!window.confirm(`Archive ${selectedSurveys.size} survey${selectedSurveys.size !== 1 ? "s" : ""}?`)) return;
                  try {
                    await Promise.all([...selectedSurveys].map(sId => api.patch(`/api/surveys/${sId}/`, { status: "archived" })));
                    setSurveySelectMode(false); setSelectedSurveys(new Set());
                    const res = await api.get(`/api/surveys/?site=${id}`); setSurveys(res.data.results || res.data);
                  } catch (err) { alert("Failed to archive surveys."); }
                }}>Archive ({selectedSurveys.size})</button>
            </>)}
            <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: surveySelectMode ? "#0006b1" : "#db440a", color: "#fefdfc", border: "none", borderRadius: 4 }}
              onClick={(e) => { e.stopPropagation(); const entering = !surveySelectMode; setSurveySelectMode(entering); if (!entering) setSelectedSurveys(new Set()); if (entering && !surveysListOpen) setSurveysListOpen(true); }}>
              {surveySelectMode ? `Select (${selectedSurveys.size})` : "Select"}
            </button>
          </div>
        </div>
        {surveysListOpen && <div className="card-stack">
          {(() => {
            const filtered = surveys.filter((s) => {
              const ss = s.survey_status || s.status;
              if (surveyFilter === "active") return ss === "active" || ["draft", "open", "assigned"].includes(s.status);
              if (surveyFilter === "completed") return ss === "completed";
              if (surveyFilter === "archived") return s.survey_record_status === "archived" || (s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned");
              if (surveyFilter === "cancelled") return ss === "cancelled" || (s.status === "archived" && s.closure_reason === "cancelled");
              if (surveyFilter === "abandoned") return ss === "abandoned" || (s.status === "archived" && s.closure_reason === "abandoned");
              return true;
            });
            return filtered.length === 0 ? null : filtered.map((s) => (
                <div key={s.id} className="survey-queue-card" style={{ ...(surveyCardStyle(s) || {}), position: "relative" }}
                  onClick={() => {
                    if (surveySelectMode) { setSelectedSurveys(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; }); return; }
                    navigate(`/surveys/${s.id}`);
                  }}>
                  <SurveyCardGrid survey={s} />
                  {surveySelectMode && (
                    <div style={{ position: "absolute", bottom: 6, right: 8, width: 20, height: 20, borderRadius: "50%", border: "2px solid #888", backgroundColor: selectedSurveys.has(s.id) ? "#0d6efd" : "#fff" }} />
                  )}
                </div>
              ));
          })()}
        </div>}
      </div>

      <div className="d-md-none">
        <EditButton to={`/sites/${id}/edit`} />
      </div>
      <ReturnButton to={`/clients/${site.client}`} />
    </div>
  );
}

export default SiteDetail;
