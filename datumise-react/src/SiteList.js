import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import AddButton from "./AddButton";

function SiteList() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [contactDropOpen, setContactDropOpen] = useState(false);
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    <div className="container mt-3 px-3" style={{ paddingBottom: "50vh" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
      <h5 className="mb-2 fw-bold d-none d-md-block">Sites ({sites.length})</h5>
      <div className="d-none d-md-flex gap-2 mb-3">
        <Link to="/surveys/create" className="btn btn-sm" style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24, textDecoration: "none" }}>+ Survey</Link>
        <Link to="/sites/create" className="btn btn-sm" style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24, textDecoration: "none" }}>+ Site</Link>
      </div>
      <div className="edit-fieldset mb-4" style={{ backgroundColor: "#2E5E3E", borderRadius: 2, color: "#fefdfc" }}>
        <p className="edit-legend section-toggle" onClick={() => setFiltersOpen(!filtersOpen)} style={{ color: "#fefdfc" }}>
          <span className={`section-chevron section-chevron--light${filtersOpen ? " section-chevron--open" : ""}`}></span>
          Filters
        </p>
        {filtersOpen && <><div className="d-flex gap-2 flex-wrap" style={{ alignItems: "flex-start", marginLeft: "var(--section-gap, 16px)" }}>
        {[
          { value: "all", label: "All", count: sites.length },
          { value: "active", label: "Active", count: sites.filter(s => s.status === "active").length },
          { value: "archived", label: "Archived", count: sites.filter(s => s.status === "archived").length },
        ].map(({ value, label, count }) => (
          <button key={value} type="button" className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem", color: "#f5f5f7", borderColor: "#f5f5f7", backgroundColor: filter === value ? "#db440a" : "transparent" }}
            onClick={() => { setFilter(value); setTypeDropOpen(false); setContactDropOpen(false); setClientDropOpen(false); if (value === "all") { setSelectedTypes([]); setSelectedContacts([]); setSelectedClients([]); } }}>
            {label} ({count})
          </button>
        ))}
        <div style={{ position: "relative", display: "flex" }}>
          <button type="button" className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem", height: "100%", color: "#f5f5f7", borderColor: "#f5f5f7", backgroundColor: selectedTypes.length > 0 ? "#db440a" : "transparent" }}
            onClick={() => { setTypeDropOpen(!typeDropOpen); setContactDropOpen(false); setClientDropOpen(false); }}>
            Type{selectedTypes.length > 0 ? ` (${selectedTypes.length})` : ""}
          </button>
          {typeDropOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 10, backgroundColor: "#fff", border: "1px solid #c8c2b8", borderRadius: 6, padding: 8, marginTop: 4, minWidth: 180, boxShadow: "0 3px 10px rgba(0,0,0,0.15)", color: "#1f2a33" }}>
              {[...new Set(sites.map(s => s.site_type_display).filter(Boolean))].sort().map(type => (
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
            onClick={() => { setContactDropOpen(!contactDropOpen); setTypeDropOpen(false); setClientDropOpen(false); }}>
            Contact{selectedContacts.length > 0 ? ` (${selectedContacts.length})` : ""}
          </button>
          {contactDropOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 10, backgroundColor: "#fff", border: "1px solid #c8c2b8", borderRadius: 6, padding: 8, marginTop: 4, minWidth: 200, maxHeight: 200, overflowY: "auto", boxShadow: "0 3px 10px rgba(0,0,0,0.15)", color: "#1f2a33" }}>
              {[...new Set(sites.map(s => s.contact_name).filter(Boolean))].sort().map(name => (
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
        <div style={{ position: "relative", display: "flex" }}>
          <button type="button" className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem", height: "100%", color: "#f5f5f7", borderColor: "#f5f5f7", backgroundColor: selectedClients.length > 0 ? "#db440a" : "transparent" }}
            onClick={() => { setClientDropOpen(!clientDropOpen); setTypeDropOpen(false); setContactDropOpen(false); }}>
            Client{selectedClients.length > 0 ? ` (${selectedClients.length})` : ""}
          </button>
          {clientDropOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 10, backgroundColor: "#fff", border: "1px solid #c8c2b8", borderRadius: 6, padding: 8, marginTop: 4, minWidth: 200, maxHeight: 200, overflowY: "auto", boxShadow: "0 3px 10px rgba(0,0,0,0.15)", color: "#1f2a33" }}>
              {[...new Set(sites.map(s => s.client_name).filter(Boolean))].sort().map(name => (
                <label key={name} className="d-flex align-items-center gap-2" style={{ fontSize: "0.82rem", cursor: "pointer", padding: "3px 0" }}>
                  <input type="checkbox" checked={selectedClients.includes(name)}
                    onChange={() => setSelectedClients(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])} />
                  {name}
                </label>
              ))}
              {selectedClients.length > 0 && (
                <button type="button" className="btn btn-outline-secondary btn-sm mt-1" style={{ fontSize: "0.65rem", padding: "2px 8px" }}
                  onClick={() => setSelectedClients([])}>Clear</button>
              )}
            </div>
          )}
        </div>
      </div>
        <div style={{ marginLeft: "var(--section-gap, 16px)", marginTop: 8 }}>
          <input type="text" className="filter-search" placeholder="Search sites..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "4px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: "transparent", color: "#f5f5f7", outline: "none", width: "100%", maxWidth: 220 }} />
        </div>
      </>}
        {(filter !== "all" || selectedTypes.length > 0 || selectedContacts.length > 0 || selectedClients.length > 0) && (
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
                <span key={`c-${name}`} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#7b1fa2", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#7b1fa2" }} onClick={() => setSelectedContacts(prev => prev.filter(n => n !== name))}>&times;</button>
                </span>
              ))}
              {selectedClients.map(name => (
                <span key={`cl-${name}`} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#f57f17", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {name} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#f57f17" }} onClick={() => setSelectedClients(prev => prev.filter(n => n !== name))}>&times;</button>
                </span>
              ))}
              <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", marginLeft: 4 }}
                onClick={() => { setFilter("all"); setSelectedTypes([]); setSelectedContacts([]); setSelectedClients([]); }} style={{ border: "none", background: "#fcfaf7", padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", borderRadius: 4 }}>Clear all</button>
            </div>
          </div>
        )}
      </div>

      {sites.length === 0 ? (
        <p className="text-muted text-center mt-4">No sites yet.</p>
      ) : (
        <>
        {(() => {
          let filtered = sites;
          if (filter === "active") filtered = filtered.filter(s => s.status === "active");
          else if (filter === "archived") filtered = filtered.filter(s => s.status === "archived");
          if (selectedTypes.length > 0) filtered = filtered.filter(s => selectedTypes.includes(s.site_type_display));
          if (selectedContacts.length > 0) filtered = filtered.filter(s => selectedContacts.includes(s.contact_name));
          if (selectedClients.length > 0) filtered = filtered.filter(s => selectedClients.includes(s.client_name));
          if (search) filtered = filtered.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
          return filtered;
        })().map((site) => (
          <div
            key={site.id}
            className="edit-fieldset mb-2 list-card-hover"
            style={{ backgroundColor: "#cec7bb", cursor: "pointer", alignSelf: "stretch" }}
            onClick={() => navigate(`/sites/${site.id}`)}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1F2A33", whiteSpace: "nowrap" }}>{site.name}</span>
              {site.status === "archived" && (
                <span style={{ fontStyle: "italic", fontSize: "0.82rem", color: "#c0392b" }}>Archived</span>
              )}
            </div>
            <div style={{ fontSize: "0.82rem", color: "#888", fontStyle: "italic", whiteSpace: "nowrap" }}>
              {[`${site.survey_count} ${site.survey_count === 1 ? "survey" : "surveys"}`, site.city, site.postcode].filter(Boolean).join(" \u00B7 ")}
            </div>
            <div className="site-card-actions" style={{ marginLeft: 0, marginTop: 6 }}>
              {site.status === "active" && (
                <Link to={`/surveys/create?client=${site.client}&site=${site.id}`} className="btn btn-outline-secondary btn-sm"
                  style={{ fontSize: "0.65rem", padding: "1px 8px", whiteSpace: "nowrap" }}
                  onClick={(e) => e.stopPropagation()}>Add Survey</Link>
              )}
              <Link to={`/sites/${site.id}`} className="text-decoration-none d-inline-flex align-items-center" onClick={(e) => e.stopPropagation()}>
                <img src="/view.svg" alt="View" width="20" height="20" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
              </Link>
              <Link to={`/sites/${site.id}/edit`} className="text-decoration-none d-inline-flex align-items-center" onClick={(e) => e.stopPropagation()}>
                <img src="/datumise-edit.svg" alt="Edit" width="20" height="20" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
              </Link>
            </div>
          </div>
        ))}
        </>
      )}

      <ReturnButton to="/" />
      <AddButton to="/sites/create" />
    </div>
  );
}

export default SiteList;
