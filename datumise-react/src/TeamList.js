import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import AddButton from "./AddButton";

function TeamList() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [openMembers, setOpenMembers] = useState({});
  const [listOpen, setListOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [roleDropOpen, setRoleDropOpen] = useState(false);

  const toggleMember = (id) => setOpenMembers((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await api.get("/api/team/");
        setMembers(response.data.results || response.data);
      } catch (err) {
        console.error("Failed to fetch team:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <p className="text-muted">Loading team...</p>
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
      <h5 className="mb-2 fw-bold d-none d-md-block">Team</h5>
      <div className="d-none d-md-flex gap-2 mb-3">
        <Link to="/team/create" className="btn btn-sm" style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24, textDecoration: "none" }}>+ Team Member</Link>
      </div>
      {/* Applied filters */}
      <div className="edit-fieldset mb-4" style={{ backgroundColor: "#2E5E3E", borderRadius: 2, color: "#fefdfc" }}>
        <p className="edit-legend section-toggle" onClick={() => setFiltersOpen(!filtersOpen)} style={{ color: "#fefdfc" }}>
          <span className={`section-chevron section-chevron--light${filtersOpen ? " section-chevron--open" : ""}`}></span>
          Filters
        </p>
        {filtersOpen && <><div className="d-flex gap-2 flex-wrap" style={{ alignItems: "flex-start", marginLeft: "var(--section-gap, 16px)" }}>
        {[
          { value: "all", label: "All", count: members.length },
          { value: "active", label: "Active", count: members.filter(m => m.status === "active").length },
          { value: "archived", label: "Archived", count: members.filter(m => m.status === "archived").length },
        ].map(({ value, label, count }) => (
          <button key={value} type="button"
            className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem", color: "#f5f5f7", borderColor: "#f5f5f7", backgroundColor: filter === value ? "#db440a" : "transparent" }}
            onClick={() => { setFilter(value); setRoleDropOpen(false); if (value === "all") setSelectedRoles([]); }}>
            {label} ({count})
          </button>
        ))}
        <div style={{ position: "relative", display: "flex" }}>
          <button type="button" className="btn btn-sm"
            style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem", height: "100%", color: "#f5f5f7", borderColor: "#f5f5f7", backgroundColor: selectedRoles.length > 0 ? "#db440a" : "transparent" }}
            onClick={() => setRoleDropOpen(!roleDropOpen)}>
            Role{selectedRoles.length > 0 ? ` (${selectedRoles.length})` : ""}
          </button>
          {roleDropOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 10, backgroundColor: "#fff", border: "1px solid #c8c2b8", borderRadius: 6, padding: 8, marginTop: 4, minWidth: 160, boxShadow: "0 3px 10px rgba(0,0,0,0.15)", color: "#1f2a33" }}>
              {[...new Set(members.map(m => m.role_display).filter(Boolean))].sort().map(role => (
                <label key={role} className="d-flex align-items-center gap-2" style={{ fontSize: "0.82rem", cursor: "pointer", padding: "3px 0" }}>
                  <input type="checkbox" checked={selectedRoles.includes(role)}
                    onChange={() => setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])} />
                  {role}
                </label>
              ))}
              {selectedRoles.length > 0 && (
                <button type="button" className="btn btn-outline-secondary btn-sm mt-1" style={{ fontSize: "0.65rem", padding: "2px 8px" }}
                  onClick={() => setSelectedRoles([])}>Clear</button>
              )}
            </div>
          )}
        </div>
      </div>
        <div style={{ marginLeft: "var(--section-gap, 16px)", marginTop: 8 }}>
          <input type="text" className="filter-search" placeholder="Search team..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "4px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: "transparent", color: "#f5f5f7", outline: "none", width: "100%", maxWidth: 220 }} />
        </div>
      </>}
        {(filter !== "all" || selectedRoles.length > 0) && (
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
              {selectedRoles.map(role => (
                <span key={role} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#1565c0", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {role} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#1565c0" }} onClick={() => setSelectedRoles(prev => prev.filter(r => r !== role))}>&times;</button>
                </span>
              ))}
              <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", marginLeft: 4 }}
                onClick={() => { setFilter("all"); setSelectedRoles([]); }} style={{ border: "none", background: "#fcfaf7", padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", color: "#c0392b", borderRadius: 4 }}>Clear all</button>
            </div>
          </div>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-muted text-center mt-4">No team members yet.</p>
      ) : listOpen ? (
        <>
        {(() => {
          let filtered = members;
          if (filter === "active") filtered = filtered.filter(m => m.status === "active");
          else if (filter === "archived") filtered = filtered.filter(m => m.status === "archived");
          if (selectedRoles.length > 0) filtered = filtered.filter(m => selectedRoles.includes(m.role_display));
          if (search) filtered = filtered.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
          return filtered;
        })().map((member) => (
          <div key={member.id} className="edit-fieldset mb-2 list-card-hover" style={{ backgroundColor: "#cec7bb", cursor: "pointer", alignSelf: "stretch" }} onClick={() => navigate(`/team/${member.id}`)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p className="edit-legend section-toggle" onClick={(e) => { e.stopPropagation(); toggleMember(member.id); }} style={{ marginBottom: 0, alignItems: "center" }}>
                <span className={`section-chevron${openMembers[member.id] ? " section-chevron--open" : ""}`}></span>
                <span style={{ display: "inline-flex", alignItems: "baseline" }}>
                  <span className="team-name-hover" style={{ minWidth: "12rem", marginRight: 8, whiteSpace: "nowrap", lineHeight: 1 }}>{member.name}</span>
                  <span className="team-role-hover" onClick={(e) => { e.stopPropagation(); navigate(`/team/${member.id}`); }} style={{ fontStyle: "italic", fontWeight: 400, fontSize: "0.82rem", color: member.status === "archived" ? "#c0392b" : "#888", marginRight: "1.5rem", lineHeight: 1, cursor: "pointer" }}>{member.status === "archived" ? "Archived" : member.role_display}</span>
                  {member.survey_count > 0 && <span style={{ fontSize: "0.75rem", color: "#6c757d", lineHeight: 1 }}>{member.survey_count} survey{member.survey_count !== 1 ? "s" : ""}</span>}
                </span>
              </p>
              <div className="d-flex align-items-center gap-3" style={{ marginLeft: 16 }}>
                <Link to={`/team/${member.id}`} className="text-decoration-none" onClick={(e) => e.stopPropagation()}>
                  <img className="team-edit-icon" src="/view.svg" alt="View" width="14" height="14" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
                </Link>
                <Link to={`/team/${member.id}/edit`} className="text-decoration-none" onClick={(e) => e.stopPropagation()}>
                  <img className="team-edit-icon" src="/datumise-edit.svg" alt="Edit" width="14" height="14" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
                </Link>
              </div>
            </div>
            {openMembers[member.id] && (
              <div className="card-stack">
                <div className="field-block" style={{ backgroundColor: "#f0ece4", width: "fit-content" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                    <div className="field-label" style={{ minWidth: "4.5rem", color: "#999", fontStyle: "italic" }}>Username</div>
                    <span className="edit-field" style={{ flex: 1, color: "#999", fontStyle: "italic", border: "1px solid #c8c2b8", borderRadius: 6, padding: "4px 8px", backgroundColor: "#fff" }}>{member.username}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                    <div className="field-label" style={{ minWidth: "4.5rem" }}>Role</div>
                    <span className="edit-field" style={{ flex: 1, border: "1px solid #c8c2b8", borderRadius: 6, padding: "4px 8px", backgroundColor: "#fefdfc", textAlign: "left" }}>{member.role_display}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                    <div className="field-label" style={{ minWidth: "4.5rem" }}>Phone</div>
                    <span className="edit-field" style={{ flex: 1, border: "1px solid #c8c2b8", borderRadius: 6, padding: "4px 8px", backgroundColor: "#fefdfc", textAlign: "left" }}>{member.phone || "—"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                    <div className="field-label" style={{ minWidth: "4.5rem" }}>Email</div>
                    <span className="edit-field" style={{ flex: 1, border: "1px solid #c8c2b8", borderRadius: 6, padding: "4px 8px", backgroundColor: "#fefdfc", textAlign: "left" }}>{member.email || "—"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="field-label" style={{ minWidth: "4.5rem" }}>Status</div>
                    <span className="edit-field" style={{ flex: 1, border: "1px solid #c8c2b8", borderRadius: 6, padding: "4px 8px", backgroundColor: "#fefdfc", textAlign: "left" }}>{member.status_display || "Active"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        </>
      ) : null}

      <div className="d-md-none">
        <AddButton to="/team/create" />
      </div>
      <ReturnButton to="/" />
    </div>
  );
}

export default TeamList;
