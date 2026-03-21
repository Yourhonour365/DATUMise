import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import EditButton from "./EditButton";

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
  const [surveyFilter, setSurveyFilter] = useState("assigned");

  useEffect(() => {
    setSurveysOpen(false);
    setSurveysListOpen(false);
    setSurveyFilter("assigned");
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

      <div className="d-none d-md-flex align-items-center justify-content-between">
        <div className="profile-header">
          <div className="profile-header__name-row">
            <span className="profile-header__name">{site.name}</span>
            <span className="profile-header__role">{site.site_type_display || ""}</span>
          </div>
          <div className="profile-header__meta-row">
            <span className="profile-header__username">
              {site.client_name} &middot; {site.survey_count} {site.survey_count === 1 ? "survey" : "surveys"}
            </span>
            <span className={site.status === "active" ? "profile-header__status--active" : "profile-header__status--archived"}>{site.status === "active" ? "Active" : "Archived"}</span>
          </div>
          {site.contact_name && <div className="profile-header__meta-row">
            <span>{site.contact_name}</span>
          </div>}
          <div className="profile-header__contact-row">
            <span>{site.contact_phone ? <a href={`tel:${site.contact_phone}`} style={{ color: "inherit", textDecoration: "none" }}>{site.contact_phone}</a> : "—"}</span>
            <span className="profile-header__separator">|</span>
            <span>{site.contact_email ? <a href={`mailto:${site.contact_email}`} style={{ color: "inherit", textDecoration: "none" }}>{site.contact_email}</a> : "—"}</span>
          </div>
          <div className="profile-header__meta-row">
            <span style={{ color: "#888" }}>{[site.address_line_1, site.address_line_2, site.city].filter(Boolean).join(", ") || "—"}</span>
          </div>
          {site.postcode && <div className="profile-header__meta-row">
            <span style={{ color: "#888" }}>{site.postcode}</span>
          </div>}
          {sitePosition.total >= 1 && <div className="profile-header__meta-row">
            <span style={{ color: "#999", fontStyle: "italic", fontSize: "0.78rem" }}>Site {sitePosition.current} of {sitePosition.total}</span>
          </div>}
        </div>
        <EditButton to={`/sites/${id}/edit`} />
      </div>
      <div className="d-md-none">
        <div className="profile-header">
          <div className="profile-header__name-row">
            <span className="profile-header__name">{site.name}</span>
            <span className="profile-header__role">{site.site_type_display || ""}</span>
          </div>
          <div className="profile-header__meta-row">
            <span className="profile-header__username">
              {site.client_name} &middot; {site.survey_count} {site.survey_count === 1 ? "survey" : "surveys"}
            </span>
            <span className={site.status === "active" ? "profile-header__status--active" : "profile-header__status--archived"}>{site.status === "active" ? "Active" : "Archived"}</span>
          </div>
          {site.contact_name && <div className="profile-header__meta-row">
            <span>{site.contact_name}</span>
          </div>}
          <div className="profile-header__contact-row">
            <span>{site.contact_phone ? <a href={`tel:${site.contact_phone}`} style={{ color: "inherit", textDecoration: "none" }}>{site.contact_phone}</a> : "—"}</span>
            <span className="profile-header__separator">|</span>
            <span>{site.contact_email ? <a href={`mailto:${site.contact_email}`} style={{ color: "inherit", textDecoration: "none" }}>{site.contact_email}</a> : "—"}</span>
          </div>
          <div className="profile-header__meta-row">
            <span style={{ color: "#888" }}>{[site.address_line_1, site.address_line_2, site.city].filter(Boolean).join(", ") || "—"}</span>
          </div>
          {site.postcode && <div className="profile-header__meta-row">
            <span style={{ color: "#888" }}>{site.postcode}</span>
          </div>}
          {sitePosition.total >= 1 && <div className="profile-header__meta-row">
            <span style={{ color: "#999", fontStyle: "italic", fontSize: "0.78rem" }}>Site {sitePosition.current} of {sitePosition.total}</span>
          </div>}
        </div>
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
          <div className="d-flex gap-2 flex-wrap" style={{ marginLeft: "1rem" }}>
            {[
              { value: "assigned", label: "Assigned", count: surveys.filter(s => ["draft", "open", "assigned"].includes(s.status)).length },
              { value: "completed", label: "Completed", count: surveys.filter(s => s.status === "completed").length },
              { value: "archived", label: "Archived", count: surveys.filter(s => s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned").length },
              { value: "cancelled", label: "Cancelled", count: surveys.filter(s => s.status === "archived" && s.closure_reason === "cancelled").length },
              { value: "abandoned", label: "Abandoned", count: surveys.filter(s => s.status === "archived" && s.closure_reason === "abandoned").length },
            ].map(({ value, label, count }) => (
              <button key={value} type="button"
                className={`btn btn-sm ${surveyFilter === value ? "btn-secondary" : "btn-outline-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem" }}
                onClick={() => setSurveyFilter(value)}>
                {label} ({count})
              </button>
            ))}
          </div>
        </div>}
      </div>

      {/* ---- Surveys ---- */}
      <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
        <p className="edit-legend section-toggle" onClick={() => setSurveysListOpen(!surveysListOpen)}>
          <span className={`section-chevron${surveysListOpen ? " section-chevron--open" : ""}`}></span>
          Surveys
        </p>
        {surveysListOpen && <div className="card-stack">
          {(() => {
            const filtered = surveys.filter((s) => {
              if (surveyFilter === "assigned") return ["draft", "open", "assigned"].includes(s.status);
              if (surveyFilter === "completed") return s.status === "completed";
              if (surveyFilter === "archived") return s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned";
              if (surveyFilter === "cancelled") return s.status === "archived" && s.closure_reason === "cancelled";
              if (surveyFilter === "abandoned") return s.status === "archived" && s.closure_reason === "abandoned";
              return true;
            });
            return filtered.length === 0 ? null : filtered.map((s) => {
              const scheduled = s.scheduled_for ? new Date(s.scheduled_for) : null;
              let dateStr = "—";
              let timeStr = "";
              if (scheduled) {
                const d = scheduled.getDate();
                const m = scheduled.toLocaleDateString("en-GB", { month: "short" });
                const y = String(scheduled.getFullYear()).slice(2);
                dateStr = `${d} ${m} '${y}`;
                const h = scheduled.getHours();
                const min = scheduled.getMinutes();
                if (h !== 0 || min !== 0) {
                  const period = h >= 12 ? "pm" : "am";
                  const h12 = h % 12 || 12;
                  timeStr = `${h12}:${min.toString().padStart(2, "0")}${period}`;
                }
              }
              return (
                <div key={s.id} className="survey-queue-card" onClick={() => navigate(`/surveys/${s.id}`)}>
                  <div className="survey-queue-grid">
                    <span>{dateStr}</span>
                    <span>{s.status_display || ""}</span>
                    <span style={{ justifySelf: "end" }}>{s.observation_count != null ? `${s.observation_count} obs` : ""}</span>
                    <span style={{ color: "#6c757d" }}>{timeStr}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.assigned_to || "Unassigned"}
                    </span>
                    <span />
                  </div>
                </div>
              );
            });
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
