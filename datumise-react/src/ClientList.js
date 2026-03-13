import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import AddButton from "./AddButton";

function ClientList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await api.get("/api/clients/");
        setClients(response.data.results || response.data);
      } catch (err) {
        console.error("Failed to fetch clients:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <p className="text-muted">Loading clients...</p>
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
      <div className="d-none d-md-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0 fw-bold">Clients</h5>
        <AddButton to="/clients/create" />
      </div>

      {clients.length === 0 ? (
        <p className="text-muted text-center mt-4">No clients yet.</p>
      ) : (
        clients.map((client) => (
          <Link
            key={client.id}
            to={`/clients/${client.id}`}
            className="text-decoration-none text-dark"
          >
            <div className="survey-queue-card">
              <div className="survey-queue-grid" style={{ gridTemplateColumns: "1fr auto" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{client.name}</span>
                <Link
                  to={`/clients/${client.id}/edit`}
                  className="text-decoration-none edit-icon-circle"
                  style={{ justifySelf: "end" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src="/datumise-edit.svg" alt="Edit" width="14" height="14" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
                </Link>
                <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                  {client.site_count} {client.site_count === 1 ? "site" : "sites"} &middot; {client.survey_count} {client.survey_count === 1 ? "survey" : "surveys"}
                </span>
              </div>
            </div>
          </Link>
        ))
      )}

      <div className="d-md-none">
        <AddButton to="/clients/create" />
      </div>
      <ReturnButton to="/" />
    </div>
  );
}

export default ClientList;
