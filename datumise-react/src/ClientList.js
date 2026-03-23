import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import AddButton from "./AddButton";

function ClientList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [filter, setFilter] = useState(() => sessionStorage.getItem("client-filter") || "all");
  const [search, setSearch] = useState(() => sessionStorage.getItem("client-search") || "");
  const [selectedTypes, setSelectedTypes] = useState(() => { try { return JSON.parse(sessionStorage.getItem("client-types") || "[]"); } catch { return []; } });
  const [selectedContacts, setSelectedContacts] = useState(() => { try { return JSON.parse(sessionStorage.getItem("client-contacts") || "[]"); } catch { return []; } });
  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [contactDropOpen, setContactDropOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickAddId, setQuickAddId] = useState(null);

  useEffect(() => {
    sessionStorage.setItem("client-filter", filter);
    sessionStorage.setItem("client-search", search);
    sessionStorage.setItem("client-types", JSON.stringify(selectedTypes));
    sessionStorage.setItem("client-contacts", JSON.stringify(selectedContacts));
  }, [filter, search, selectedTypes, selectedContacts]);

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
    <div className="container mt-3 px-3" style={{ paddingBottom: "50vh" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
      <h5 className="mb-2 fw-bold d-none d-md-block">Clients ({clients.length})</h5>
      <div className="d-none d-md-flex gap-2 mb-3">
        <Link to="/clients/create" className="btn btn-sm" style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24, textDecoration: "none" }}>+ Client</Link>
      </div>
      <div className="edit-fieldset mb-4" style={{ backgroundColor: "#2E5E3E", borderRadius: 2, color: "#fefdfc" }}>
        <p className="edit-legend section-toggle" onClick={() => setFiltersOpen(!filtersOpen)} style={{ color: "#fefdfc" }}>
          <span className={`section-chevron section-chevron--light${filtersOpen ? " section-chevron--open" : ""}`}></span>
          Filters
        </p>
        {filtersOpen && <><div className="d-flex gap-2 flex-wrap" style={{ alignItems: "flex-start", marginLeft: "var(--section-gap, 16px)" }}>
        {[
          { value: "all", label: "All", count: clients.length },
          { value: "active", label: "Active", count: clients.filter(c => c.status === "active").length },
          { value: "archived", label: "Archived", count: clients.filter(c => c.status === "archived").length },
        ].map(({ value, label, count }) => (
          <button key={value} type="button" className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem", color: "#f5f5f7", borderColor: "#f5f5f7", backgroundColor: filter === value ? "#db440a" : "transparent" }}
            onClick={() => { setFilter(value); setTypeDropOpen(false); setContactDropOpen(false); if (value === "all") { setSelectedTypes([]); setSelectedContacts([]); } }}>
            {label} ({count})
          </button>
        ))}
        <div style={{ position: "relative", display: "flex" }}>
          <button type="button" className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem", height: "100%", color: "#f5f5f7", borderColor: "#f5f5f7", backgroundColor: selectedTypes.length > 0 ? "#db440a" : "transparent" }}
            onClick={() => { setTypeDropOpen(!typeDropOpen); setContactDropOpen(false); }}>
            Type{selectedTypes.length > 0 ? ` (${selectedTypes.length})` : ""}
          </button>
          {typeDropOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 10, backgroundColor: "#fff", border: "1px solid #c8c2b8", borderRadius: 6, padding: 8, marginTop: 4, minWidth: 160, boxShadow: "0 3px 10px rgba(0,0,0,0.15)", color: "#1f2a33" }}>
              {[...new Set(clients.map(c => c.client_type_display).filter(Boolean))].sort().map(type => (
                <label key={type} className="d-flex align-items-center gap-2" style={{ fontSize: "0.82rem", cursor: "pointer", padding: "3px 0" }}>
                  <input type="checkbox" checked={selectedTypes.includes(type)}
                    onChange={() => setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])} />
                  {type}
                </label>
              ))}
              {selectedTypes.length > 0 && (
                <button type="button" className="btn btn-outline-secondary btn-sm mt-1" style={{ fontSize: "0.65rem", padding: "2px 8px" }}
                  onClick={() => setSelectedTypes([])}>Clear</button>
              )}
            </div>
          )}
        </div>
        <div style={{ position: "relative", display: "flex" }}>
          <button type="button" className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem", height: "100%", color: "#f5f5f7", borderColor: "#f5f5f7", backgroundColor: selectedContacts.length > 0 ? "#db440a" : "transparent" }}
            onClick={() => { setContactDropOpen(!contactDropOpen); setTypeDropOpen(false); }}>
            Contact{selectedContacts.length > 0 ? ` (${selectedContacts.length})` : ""}
          </button>
          {contactDropOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 10, backgroundColor: "#fff", border: "1px solid #c8c2b8", borderRadius: 6, padding: 8, marginTop: 4, minWidth: 200, maxHeight: 200, overflowY: "auto", boxShadow: "0 3px 10px rgba(0,0,0,0.15)", color: "#1f2a33" }}>
              {[...new Set(clients.map(c => c.contact_name).filter(Boolean))].sort().map(name => (
                <label key={name} className="d-flex align-items-center gap-2" style={{ fontSize: "0.82rem", cursor: "pointer", padding: "3px 0" }}>
                  <input type="checkbox" checked={selectedContacts.includes(name)}
                    onChange={() => setSelectedContacts(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])} />
                  {name}
                </label>
              ))}
              {selectedContacts.length > 0 && (
                <button type="button" className="btn btn-outline-secondary btn-sm mt-1" style={{ fontSize: "0.65rem", padding: "2px 8px" }}
                  onClick={() => setSelectedContacts([])}>Clear</button>
              )}
            </div>
          )}
        </div>
      </div>
        <div style={{ marginLeft: "var(--section-gap, 16px)", marginTop: 8 }}>
          <input type="text" className="filter-search" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "4px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: "transparent", color: "#f5f5f7", outline: "none", width: "100%", maxWidth: 220 }} />
        </div>
      </>}
        {(filter !== "all" || selectedTypes.length > 0 || selectedContacts.length > 0) && (
          <div style={{ backgroundColor: "#2e5e3e", borderRadius: 2, padding: "8px 0 8px 0", marginTop: 8, marginLeft: "var(--section-gap, 16px)" }}>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              {filter === "active" && (
                <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#2e7d32", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  Active <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#2e7d32" }} onClick={() => setFilter("all")}>&times;</button>
                </span>
              )}
              {filter === "archived" && (
                <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#c62828", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  Archived <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#c62828" }} onClick={() => setFilter("all")}>&times;</button>
                </span>
              )}
              {selectedTypes.map(type => (
                <span key={type} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#1565c0", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {type} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#1565c0" }} onClick={() => setSelectedTypes(prev => prev.filter(t => t !== type))}>&times;</button>
                </span>
              ))}
              {selectedContacts.map(name => (
                <span key={name} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#7b1fa2", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#7b1fa2" }} onClick={() => setSelectedContacts(prev => prev.filter(n => n !== name))}>&times;</button>
                </span>
              ))}
              <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", marginLeft: 4 }}
                onClick={() => { setFilter("all"); setSelectedTypes([]); setSelectedContacts([]); }} style={{ border: "none", background: "#fcfaf7", padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", borderRadius: 4 }}>Clear all</button>
            </div>
          </div>
        )}
      </div>

      {clients.length === 0 ? (
        <p className="text-muted text-center mt-4">No clients yet.</p>
      ) : (
        <>
        {(() => {
          let filtered = clients;
          if (filter === "active") filtered = filtered.filter(c => c.status === "active");
          else if (filter === "archived") filtered = filtered.filter(c => c.status === "archived");
          if (selectedTypes.length > 0) filtered = filtered.filter(c => selectedTypes.includes(c.client_type_display));
          if (selectedContacts.length > 0) filtered = filtered.filter(c => selectedContacts.includes(c.contact_name));
          if (search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
          return filtered;
        })().map((client) => (
          <div
            key={client.id}
            className="edit-fieldset mb-2 list-card-hover"
            style={{ backgroundColor: "#cec7bb", cursor: "pointer", alignSelf: "stretch" }}
            onClick={() => navigate(`/clients/${client.id}`)}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1F2A33", whiteSpace: "nowrap" }}>{client.name}</span>
                {client.status === "archived" && (
                  <span style={{ fontStyle: "italic", fontSize: "0.82rem", color: "#c0392b" }}>Archived</span>
                )}
              </div>
              <div className="d-flex align-items-center gap-3" style={{ marginLeft: 16, position: "relative" }}>
                <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "1.2rem", lineHeight: 1, color: "#2E5E3E", fontWeight: 700 }}
                  onClick={(e) => { e.stopPropagation(); setQuickAddId(quickAddId === client.id ? null : client.id); }}>+</button>
                {quickAddId === client.id && (
                  <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 10, backgroundColor: "#fff", border: "1px solid #c8c2b8", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: 140, padding: "4px 0" }}>
                    <Link to={`/surveys/create?client=${client.id}`} style={{ display: "block", padding: "6px 12px", fontSize: "0.82rem", color: "#1F2A33", textDecoration: "none" }}
                      onClick={(e) => e.stopPropagation()} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f7"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                      Add Survey
                    </Link>
                    <Link to={`/sites/create?client=${client.id}`} style={{ display: "block", padding: "6px 12px", fontSize: "0.82rem", color: "#1F2A33", textDecoration: "none" }}
                      onClick={(e) => e.stopPropagation()} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f7"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                      Add Site
                    </Link>
                  </div>
                )}
                <Link to={`/clients/${client.id}`} className="text-decoration-none" onClick={(e) => e.stopPropagation()}>
                  <img className="team-edit-icon" src="/view.svg" alt="View" width="14" height="14" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
                </Link>
                <Link to={`/clients/${client.id}/edit`} className="text-decoration-none" onClick={(e) => e.stopPropagation()}>
                  <img className="team-edit-icon" src="/datumise-edit.svg" alt="Edit" width="14" height="14" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
                </Link>
              </div>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#888", fontStyle: "italic" }}>
              {client.site_count} {client.site_count === 1 ? "site" : "sites"} &middot; {client.survey_count} {client.survey_count === 1 ? "survey" : "surveys"}
            </div>
          </div>
        ))}
        </>
      )}

      <div className="d-md-none">
        <AddButton to="/clients/create" />
      </div>
      <ReturnButton to="/" />
    </div>
  );
}

export default ClientList;
