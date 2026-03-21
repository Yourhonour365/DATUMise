import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import EditButton from "./EditButton";

function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [sites, setSites] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sitesOpen, setSitesOpen] = useState(true);
  const [surveysOpen, setSurveysOpen] = useState(false);
  const [surveysListOpen, setSurveysListOpen] = useState(true);
  const [surveyFilter, setSurveyFilter] = useState("assigned");
  const [siblingIds, setSiblingIds] = useState({ prev: null, next: null });

  useEffect(() => {
    setSitesOpen(false);
    setSurveysOpen(false);
    setSurveysListOpen(false);
    setSurveyFilter("assigned");
    const fetchData = async () => {
      try {
        const [clientRes, sitesRes, surveysRes, allClientsRes] = await Promise.all([
          api.get(`/api/clients/${id}/`),
          api.get(`/api/sites/?client=${id}`),
          api.get(`/api/surveys/?client=${id}`),
          api.get("/api/clients/"),
        ]);
        setClient(clientRes.data);
        setSites(sitesRes.data.results || sitesRes.data);
        setSurveys(surveysRes.data.results || surveysRes.data);
        const all = allClientsRes.data.results || allClientsRes.data;
        const idx = all.findIndex(c => String(c.id) === String(id));
        setSiblingIds({
          prev: idx > 0 ? all[idx - 1].id : null,
          next: idx < all.length - 1 ? all[idx + 1].id : null,
          current: idx + 1,
          total: all.length,
        });
      } catch (err) {
        console.error("Failed to fetch client:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <p className="text-muted">Loading client...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mt-4">
        <p className="text-danger">Client not found.</p>
        <ReturnButton to="/clients" />
      </div>
    );
  }

  return (
    <div className="container mt-3 px-3" style={{ paddingBottom: "50vh" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to="/clients" className="text-decoration-none">
          &larr; Back to Clients
        </Link>
      </div>

      <div className="d-none d-md-flex align-items-center justify-content-between">
        <div className="profile-header">
          <div className="profile-header__name-row">
            <span className="profile-header__name">{client.name}</span>
            <span className="profile-header__role">{client.client_type_display || ""}</span>
          </div>
          <div className="profile-header__meta-row">
            <span className="profile-header__username">
              {client.site_count} {client.site_count === 1 ? "site" : "sites"} &middot; {client.survey_count} {client.survey_count === 1 ? "survey" : "surveys"}
            </span>
            <span className={client.status === "active" ? "profile-header__status--active" : "profile-header__status--archived"}>{client.status === "active" ? "Active" : "Archived"}</span>
          </div>
          <div className="profile-header__meta-row">
            <span>{client.contact_name || "—"}</span>
          </div>
          <div className="profile-header__contact-row">
            <span>{client.contact_phone ? <a href={`tel:${client.contact_phone}`} style={{ color: "inherit", textDecoration: "none" }}>{client.contact_phone}</a> : "—"}</span>
            <span className="profile-header__separator">|</span>
            <span>{client.contact_email ? <a href={`mailto:${client.contact_email}`} style={{ color: "inherit", textDecoration: "none" }}>{client.contact_email}</a> : "—"}</span>
          </div>
          {(() => {
            const raw = client.billing_address || "";
            const parts = raw ? (raw.includes("\n") ? raw.split("\n").filter(Boolean) : raw.split(",").map(s => s.trim()).filter(Boolean)) : [];
            const postcode = parts.length > 1 ? parts[parts.length - 1] : null;
            const address = postcode ? parts.slice(0, -1).join(", ") : parts.join(", ");
            return <>
              <div className="profile-header__meta-row">
                <span style={{ color: "#888" }}>{address || "—"}</span>
              </div>
              <div className="profile-header__meta-row">
                <span style={{ color: "#888" }}>{postcode || "—"}</span>
              </div>
            </>;
          })()}
        </div>
        <EditButton to={`/clients/${id}/edit`} />
      </div>
      <div className="d-md-none">
        <div className="profile-header">
          <div className="profile-header__name-row">
            <span className="profile-header__name">{client.name}</span>
            <span className="profile-header__role">{client.client_type_display || ""}</span>
          </div>
          <div className="profile-header__meta-row">
            <span className="profile-header__username">
              {client.site_count} {client.site_count === 1 ? "site" : "sites"} &middot; {client.survey_count} {client.survey_count === 1 ? "survey" : "surveys"}
            </span>
            <span className={client.status === "active" ? "profile-header__status--active" : "profile-header__status--archived"}>{client.status === "active" ? "Active" : "Archived"}</span>
          </div>
          <div className="profile-header__meta-row">
            <span>{client.contact_name || "—"}</span>
          </div>
          <div className="profile-header__contact-row">
            <span>{client.contact_phone ? <a href={`tel:${client.contact_phone}`} style={{ color: "inherit", textDecoration: "none" }}>{client.contact_phone}</a> : "—"}</span>
            <span className="profile-header__separator">|</span>
            <span>{client.contact_email ? <a href={`mailto:${client.contact_email}`} style={{ color: "inherit", textDecoration: "none" }}>{client.contact_email}</a> : "—"}</span>
          </div>
          {(() => {
            const raw = client.billing_address || "";
            const parts = raw ? (raw.includes("\n") ? raw.split("\n").filter(Boolean) : raw.split(",").map(s => s.trim()).filter(Boolean)) : [];
            const postcode = parts.length > 1 ? parts[parts.length - 1] : null;
            const address = postcode ? parts.slice(0, -1).join(", ") : parts.join(", ");
            return <>
              <div className="profile-header__meta-row">
                <span style={{ color: "#888" }}>{address || "—"}</span>
              </div>
              <div className="profile-header__meta-row">
                <span style={{ color: "#888" }}>{postcode || "—"}</span>
              </div>
            </>;
          })()}
        </div>
      </div>


      <div style={{ marginTop: 16 }}>
        {siblingIds.total > 0 && <div style={{ fontSize: "0.78rem", color: "#999", fontStyle: "italic", marginBottom: 4 }}>Client {siblingIds.current} of {siblingIds.total}</div>}
        <div className="d-flex gap-2 mb-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!siblingIds.prev}
            style={{ opacity: siblingIds.prev ? 1 : 0.4 }}
            onClick={() => siblingIds.prev && navigate(`/clients/${siblingIds.prev}`)}>
            &larr; Previous
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!siblingIds.next}
            style={{ opacity: siblingIds.next ? 1 : 0.4 }}
            onClick={() => siblingIds.next && navigate(`/clients/${siblingIds.next}`)}>
            Next &rarr;
          </button>
        </div>
      </div>

      {/* ---- Sites ---- */}
      <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="edit-legend section-toggle" onClick={() => setSitesOpen(!sitesOpen)} style={{ marginBottom: 0 }}>
            <span className={`section-chevron${sitesOpen ? " section-chevron--open" : ""}`}></span>
            Sites ({sites.length})
          </p>
          <Link to={`/sites/create?client=${id}`} className="text-decoration-none"
            style={{ fontSize: "0.75rem", padding: "3px 10px", background: "#1a5bc4", borderRadius: "6px", color: "#fff" }}
            onClick={(e) => e.stopPropagation()}>
            + Add Site
          </Link>
        </div>
        {sitesOpen && <div className="card-stack" style={{ marginTop: 8 }}>
          {sites.map((site) => (
            <div key={site.id} className="edit-fieldset mb-0 list-card-hover"
              style={{ backgroundColor: "#f0ece4", cursor: "pointer" }}
              onClick={() => navigate(`/sites/${site.id}`)}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1F2A33" }}>{site.name}</span>
                {site.status === "archived" && <span style={{ fontStyle: "italic", fontSize: "0.82rem", color: "#c0392b" }}>Archived</span>}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#888", fontStyle: "italic" }}>
                {[`${site.survey_count} ${site.survey_count === 1 ? "survey" : "surveys"}`, site.city, site.postcode].filter(Boolean).join(" \u00B7 ")}
              </div>
            </div>
          ))}
        </div>}
      </div>

      {/* ---- Survey Filters ---- */}
      <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
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
                      {s.site_name || "No site"}{s.site_postcode ? ` ${s.site_postcode}` : ""}
                    </span>
                    <span style={{ justifySelf: "end", color: "#6c757d" }}>{s.assigned_to || "Unassigned"}</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>}
      </div>

      <div className="d-md-none">
        <EditButton to={`/clients/${id}/edit`} />
      </div>
      <ReturnButton to="/clients" />
    </div>
  );
}

export default ClientDetail;
