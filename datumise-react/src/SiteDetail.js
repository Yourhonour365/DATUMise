import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";

function SiteDetail() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [siteRes, surveysRes] = await Promise.all([
          api.get(`/api/sites/${id}/`),
          api.get(`/api/surveys/?site=${id}`),
        ]);
        setSite(siteRes.data);
        setSurveys(surveysRes.data.results || surveysRes.data);
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
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to={`/clients/${site.client}`} className="text-decoration-none">
          &larr; Back to {site.client_name}
        </Link>
      </div>

      <div className="d-flex align-items-center justify-content-between mb-1">
        <h5 className="fw-bold mb-0">{site.name}</h5>
        <Link to={`/sites/${id}/edit`} className="text-decoration-none edit-icon-circle" aria-label="Edit site">
          <img src="/datumise-edit.svg" alt="Edit" width="14" height="14" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
        </Link>
      </div>
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap" style={{ fontSize: "0.82rem" }}>
        {site.site_type_display && <span>{site.site_type_display}</span>}
        {site.status === "archived" && (
          <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>Archived</span>
        )}
        <span className="text-muted">
          {site.client_name} &middot;{" "}
          {site.survey_count} {site.survey_count === 1 ? "survey" : "surveys"}
        </span>
      </div>

      <div className="survey-details-grid mb-3">
        <div className="survey-detail-item">
          <span className="survey-detail-label">Address</span>
          <span>{site.address || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Postcode</span>
          <span>{site.postcode || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Site contact</span>
          <span>{site.contact_name || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Contact phone</span>
          <span>{site.contact_phone || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Contact email</span>
          <span>{site.contact_email || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Client</span>
          <Link to={`/clients/${site.client}`} className="text-decoration-none">
            {site.client_name}
          </Link>
        </div>
        <div className="survey-detail-item" style={{ gridColumn: "1 / -1" }}>
          <span className="survey-detail-label">Access notes</span>
          <span style={{ whiteSpace: "pre-line" }}>{site.access_notes || "Not set"}</span>
        </div>
      </div>

      <h6 className="mb-2">
        Surveys
        <span className="text-muted fw-normal ms-1" style={{ fontSize: "0.85rem" }}>
          ({surveys.length})
        </span>
      </h6>

      {surveys.length === 0 ? (
        <p className="text-muted" style={{ fontSize: "0.85rem" }}>
          No surveys for this site yet.
        </p>
      ) : (
        surveys.map((survey) => (
          <Link
            key={survey.id}
            to={`/surveys/${survey.id}`}
            className="text-decoration-none text-dark"
          >
            <div className="survey-queue-card">
              <div className="survey-queue-grid" style={{ gridTemplateColumns: "1fr auto" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                  {new Date(survey.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span style={{ fontSize: "0.78rem", justifySelf: "end" }}>
                  <span className={
                    survey.status === "live" ? "text-success fw-semibold" :
                    survey.status === "submitted" ? "text-primary" :
                    survey.status === "missed" ? "text-danger" :
                    "text-muted"
                  }>
                    {survey.status_display}
                  </span>
                </span>
                <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                  {survey.assigned_to || "Unassigned"}
                  {(survey.observation_count ?? 0) > 0 && ` \u00B7 ${survey.observation_count} obs`}
                </span>
              </div>
            </div>
          </Link>
        ))
      )}

      <ReturnButton to={`/clients/${site.client}`} />
    </div>
  );
}

export default SiteDetail;
