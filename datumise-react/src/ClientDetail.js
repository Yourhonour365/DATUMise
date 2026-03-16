import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import EditButton from "./EditButton";

function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [sites, setSites] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientRes, sitesRes, surveysRes] = await Promise.all([
          api.get(`/api/clients/${id}/`),
          api.get(`/api/sites/?client=${id}`),
          api.get(`/api/surveys/?client=${id}`),
        ]);
        setClient(clientRes.data);
        setSites(sitesRes.data.results || sitesRes.data);
        setSurveys(surveysRes.data.results || surveysRes.data);
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
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/clients" className="text-decoration-none">
          &larr; Back to Clients
        </Link>
      </div>

      <div className="d-none d-md-flex align-items-center justify-content-between mb-1">
        <h5 className="fw-bold mb-0">{client.name}</h5>
        <EditButton to={`/clients/${id}/edit`} />
      </div>
      <h5 className="fw-bold mb-1 d-md-none">{client.name}</h5>
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap" style={{ fontSize: "0.82rem" }}>
        {client.client_type_display && <span>{client.client_type_display}</span>}
        {client.status === "archived" && (
          <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>Archived</span>
        )}
        <span className="text-muted">
          {client.site_count} {client.site_count === 1 ? "site" : "sites"} &middot;{" "}
          {client.survey_count} {client.survey_count === 1 ? "survey" : "surveys"}
        </span>
      </div>

      <div className="survey-details-grid mb-3">
        <div className="survey-detail-item">
          <span className="survey-detail-label">Account manager</span>
          <span>{client.account_manager || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Contact name</span>
          <span>{client.contact_name || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Contact email</span>
          <span>{client.contact_email || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Contact phone</span>
          <span>{client.contact_phone || "Not set"}</span>
        </div>
        <div className="survey-detail-item" style={{ gridColumn: "1 / -1" }}>
          <span className="survey-detail-label">Billing address</span>
          <span style={{ whiteSpace: "pre-line" }}>{client.billing_address || "Not set"}</span>
        </div>
      </div>

      <h6 className="mb-2">Surveys</h6>
      {surveys.length === 0 ? (
        <p className="text-muted mb-3" style={{ fontSize: "0.85rem" }}>No surveys yet.</p>
      ) : (
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <Link
            to={`/surveys?client=${id}`}
            className="text-decoration-none"
            style={{ fontSize: "0.82rem", padding: "0.3rem 0.65rem", background: "#f0ece4", borderRadius: "6px", color: "#2c3e50" }}
          >
            All ({surveys.length})
          </Link>
          {["planned", "live", "paused", "submitted", "missed", "cancelled"].map((status) => {
            const count = surveys.filter((s) => s.status === status).length;
            if (count === 0) return null;
            return (
              <Link
                key={status}
                to={`/surveys?client=${id}&status=${status}`}
                className="text-decoration-none"
                style={{ fontSize: "0.82rem", padding: "0.3rem 0.65rem", background: "#f0ece4", borderRadius: "6px", color: "#2c3e50" }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
              </Link>
            );
          })}
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 className="mb-0">
          Sites
          <span className="text-muted fw-normal ms-1" style={{ fontSize: "0.85rem" }}>
            ({sites.length})
          </span>
        </h6>
        <Link
          to={`/sites/create?client=${id}`}
          className="text-decoration-none"
          style={{ fontSize: "0.82rem", padding: "0.3rem 0.65rem", background: "#1a5bc4", borderRadius: "6px", color: "#faf6ef" }}
        >
          + Add Site
        </Link>
      </div>

      {sites.length === 0 ? (
        <p className="text-muted" style={{ fontSize: "0.85rem" }}>
          No sites yet.
        </p>
      ) : (
        sites.map((site) => (
          <Link
            key={site.id}
            to={`/sites/${site.id}`}
            className="text-decoration-none text-dark"
          >
            <div className="survey-queue-card">
              <div className="d-flex align-items-center gap-2">
                <img src="/datumise-sites.svg" alt="" width="22" height="22" style={{ flexShrink: 0 }} />
                <div className="survey-queue-grid" style={{ gridTemplateColumns: "1fr auto", flex: 1 }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{site.name}</span>
                  <span className="text-muted" style={{ fontSize: "0.78rem", justifySelf: "end" }}>
                    {site.survey_count} {site.survey_count === 1 ? "survey" : "surveys"}
                  </span>
                  <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                    {[site.site_type_display, site.address_line_1, site.city, site.postcode].filter(Boolean).join(" \u00B7 ")}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))
      )}

      <div className="d-md-none">
        <EditButton to={`/clients/${id}/edit`} />
      </div>
      <ReturnButton to="/clients" />
    </div>
  );
}

export default ClientDetail;
