import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";

function SiteList() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await api.get("/api/sites/");
        setSites(response.data.results || response.data);
      } catch (err) {
        console.error("Failed to fetch sites:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSites();
  }, []);

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <p className="text-muted">Loading sites...</p>
      </div>
    );
  }

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
      <h5 className="mb-3 fw-bold d-none d-md-block">Sites</h5>

      {sites.length === 0 ? (
        <p className="text-muted text-center mt-4">No sites yet.</p>
      ) : (
        sites.map((site) => (
          <div
            key={site.id}
            className="survey-queue-card"
            onClick={() => navigate(`/sites/${site.id}`)}
          >
            <div className="d-flex align-items-center gap-2">
              <img src="/datumise-sites.svg" alt="" width="22" height="22" style={{ flexShrink: 0 }} />
              <div className="survey-queue-grid" style={{ gridTemplateColumns: "1fr auto", flex: 1 }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{site.name}</span>
                <span className="text-muted" style={{ fontSize: "0.78rem", justifySelf: "end" }}>
                  {site.survey_count} {site.survey_count === 1 ? "survey" : "surveys"}
                </span>
                <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                  {[site.client_name, site.address_line_1, site.city, site.postcode].filter(Boolean).join(" \u00B7 ")}
                </span>
              </div>
            </div>
          </div>
        ))
      )}

      <ReturnButton to="/" />
    </div>
  );
}

export default SiteList;
