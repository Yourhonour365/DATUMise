import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api/api";
import { useFilters } from "./FilterContext";
import ReturnButton from "./ReturnButton";
import FilterAppliedCard from "./FilterAppliedCard";

/* ------------------------------------------------------------------ */
/*  Reusable checkbox multi-select                                     */
/* ------------------------------------------------------------------ */
function MultiSelect({ label, options, selected, onChange, labelKey = "name", columns = 1, isOpen, onToggle }) {
  const [search, setSearch] = useState("");
  const selectedIds = new Set(selected.map((s) => s.id));

  const toggle = (item) => {
    if (selectedIds.has(item.id)) {
      onChange(selected.filter((s) => s.id !== item.id));
    } else {
      onChange([...selected, { id: item.id, name: item[labelKey] }]);
    }
  };

  const filtered = search
    ? options.filter((item) => item[labelKey].toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
      <p className="edit-legend section-toggle" onClick={() => onToggle()}>
        <span className={`section-chevron${isOpen ? " section-chevron--open" : ""}`}></span>
        {label}{selected.length > 0 ? ` (${selected.length})` : ""}
      </p>
      {isOpen && <div className="card-stack">
        <div className="field-block" style={{ backgroundColor: "#f5f5f7" }}>
          <div className="d-flex gap-1 mb-2" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn btn-outline-secondary" style={{ fontSize: "0.65rem", padding: "2px 8px", lineHeight: 1.2 }}
              onClick={() => onChange(options.map((item) => ({ id: item.id, name: item[labelKey] })))}>
              Select all
            </button>
            {selected.length > 0 && (
              <button type="button" className="btn btn-outline-secondary" style={{ fontSize: "0.65rem", padding: "2px 8px", lineHeight: 1.2 }}
                onClick={() => onChange([])}>
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            className="edit-field mb-2"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: "0.8rem" }}
          />
          <div style={{ maxHeight: "160px", overflowY: "auto", display: columns > 1 ? "grid" : "block", gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : undefined }}>
            {filtered.length === 0 && (
              <div className="text-muted" style={{ fontSize: "0.8rem" }}>No matches</div>
            )}
            {filtered.map((item) => (
              <label key={item.id} className="d-flex align-items-center gap-2" style={{ fontSize: "0.82rem", cursor: "pointer", padding: "3px 0" }}>
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggle(item)} />
                {item[labelKey]}
              </label>
            ))}
          </div>
        </div>
      </div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filters page                                                       */
/* ------------------------------------------------------------------ */
function Filters() {
  const { filters, setFilters, clearFilters } = useFilters();

  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [team, setTeam] = useState([]);
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (name) => setOpenSection((prev) => (prev === name ? null : name));

  useEffect(() => {
    Promise.all([
      api.get("/api/clients/"),
      api.get("/api/sites/"),
      api.get("/api/team/"),
    ]).then(([clientsRes, sitesRes, teamRes]) => {
      setClients(clientsRes.data.results || clientsRes.data);
      setSites(sitesRes.data.results || sitesRes.data);
      setTeam(teamRes.data.results || teamRes.data);
    }).catch((err) => console.error("Failed to load filter options:", err));
  }, []);

  // Filter sites by selected clients
  const selectedClientIds = new Set(filters.clients.map((c) => c.id));
  const filteredSites = selectedClientIds.size > 0
    ? sites.filter((s) => selectedClientIds.has(s.client))
    : sites;

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
      <h5 className="mb-3 fw-bold d-none d-md-block">Filters</h5>

      {/* ---- Selected filter chips ---- */}
      {(() => {
        const totalChips = (filters.timePeriod ? 1 : 0) + filters.statuses.length + filters.schedule_types.length + filters.site_types.length + filters.clients.length + filters.sites.length + filters.surveyors.length;
        if (totalChips === 0) return null;
        const chipsList = (
          <div className="d-flex gap-1 flex-wrap" style={{ marginTop: "0.4rem" }}>
            {filters.timePeriod && (
              <span className="filter-chip filter-chip-time-active">
                {({ today: "Today", this_week: "This week", last_week: "Last week", next_week: "Next week", this_month: "This month", last_month: "Last month", next_month: "Next month" })[filters.timePeriod]}
                <button type="button" className="filter-chip-x" onClick={() => setFilters({ timePeriod: "" })}>&times;</button>
              </span>
            )}
            {filters.statuses.map((st) => (
              <span key={`st-${st.id}`} className={`filter-chip ${["cancelled", "missed", "archived"].includes(st.id) ? "filter-chip-status-cancelled" : "filter-chip-status"}`}>
                {st.name}
                <button type="button" className="filter-chip-x" onClick={() => setFilters({ statuses: filters.statuses.filter((x) => x.id !== st.id) })}>&times;</button>
              </span>
            ))}
            {filters.schedule_types.map((sc) => (
              <span key={`sc-${sc.id}`} className="filter-chip filter-chip-schedule">
                {sc.name}
                <button type="button" className="filter-chip-x" onClick={() => setFilters({ schedule_types: filters.schedule_types.filter((x) => x.id !== sc.id) })}>&times;</button>
              </span>
            ))}
            {filters.site_types.map((st) => (
              <span key={`st2-${st.id}`} className="filter-chip filter-chip-site">
                {st.name}
                <button type="button" className="filter-chip-x" onClick={() => setFilters({ site_types: filters.site_types.filter((x) => x.id !== st.id) })}>&times;</button>
              </span>
            ))}
            {filters.clients.map((c) => (
              <span key={`c-${c.id}`} className="filter-chip filter-chip-client">
                {c.name}
                <button type="button" className="filter-chip-x" onClick={() => setFilters({ clients: filters.clients.filter((x) => x.id !== c.id) })}>&times;</button>
              </span>
            ))}
            {filters.sites.map((s) => (
              <span key={`s-${s.id}`} className="filter-chip filter-chip-site">
                {s.name}
                <button type="button" className="filter-chip-x" onClick={() => setFilters({ sites: filters.sites.filter((x) => x.id !== s.id) })}>&times;</button>
              </span>
            ))}
            {filters.surveyors.map((sv) => (
              <span key={`sv-${sv.id}`} className="filter-chip filter-chip-surveyor">
                {sv.name}
                <button type="button" className="filter-chip-x" onClick={() => setFilters({ surveyors: filters.surveyors.filter((x) => x.id !== sv.id) })}>&times;</button>
              </span>
            ))}
          </div>
        );
        return (
          <FilterAppliedCard
            totalChips={totalChips}
            onClear={clearFilters}
            defaultOpen
          >
            {chipsList}
          </FilterAppliedCard>
        );
      })()}

      {/* ---- Scope ---- */}
      <div className="field-block mb-2" style={{ backgroundColor: "#f0ece4", width: "fit-content", marginLeft: 0 }}>
        <div className="field-label">Apply to</div>
        <div className="edit-field d-flex gap-4">
          {["surveys", "observations", "both"].map((s) => (
            <label key={s} className="d-flex align-items-center gap-2" style={{ fontSize: "0.82rem", cursor: "pointer" }}>
              <input type="radio" name="scope" checked={filters.scope === s} onChange={() => setFilters({ scope: s })} />
              <span style={{ fontSize: "0.9rem" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ---- Time period ---- */}
      <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
        <p className="edit-legend section-toggle" onClick={() => toggleSection("time")}>
          <span className={`section-chevron${openSection === "time" ? " section-chevron--open" : ""}`}></span>
          Time{filters.timePeriod ? " (1)" : ""}
        </p>
        {openSection === "time" && <div className="card-stack">
          <div className="field-block" style={{ backgroundColor: "#f5f5f7" }}>
            <div className="d-flex gap-1 mb-2">
              {filters.timePeriod && (
                <button type="button" className="btn btn-outline-secondary" style={{ fontSize: "0.65rem", padding: "2px 8px", lineHeight: 1.2 }}
                  onClick={() => setFilters({ timePeriod: "" })}>
                  Clear
                </button>
              )}
            </div>
            <div className="d-flex gap-3 flex-wrap">
              {[
                { id: "today", name: "Today" },
                { id: "this_week", name: "This week" },
                { id: "last_week", name: "Last week" },
                { id: "next_week", name: "Next week" },
                { id: "this_month", name: "This month" },
                { id: "last_month", name: "Last month" },
                { id: "next_month", name: "Next month" },
              ].map((opt) => (
                <label key={opt.id} className="d-flex align-items-center gap-2" style={{ fontSize: "0.82rem", cursor: "pointer", padding: "3px 0" }}>
                  <input type="radio" name="timePeriod" checked={filters.timePeriod === opt.id}
                    onChange={() => setFilters({ timePeriod: filters.timePeriod === opt.id ? "" : opt.id })} />
                  {opt.name}
                </label>
              ))}
            </div>
          </div>
        </div>}
      </div>

      {/* ---- Survey-specific filters ---- */}
      {(filters.scope === "surveys" || filters.scope === "both") && (
        <>
          <MultiSelect
            label="Service Status"
            options={[
              { id: "planned", name: "Planned" },
              { id: "live", name: "Live" },
              { id: "paused", name: "Paused" },
              { id: "submitted", name: "Submitted" },
              { id: "missed", name: "Missed" },
              { id: "cancelled", name: "Cancelled" },
            ]}
            selected={filters.statuses}
            onChange={(val) => setFilters({ statuses: val })}
            columns={2}
            isOpen={openSection === "statuses"}
            onToggle={() => toggleSection("statuses")}
          />

          <MultiSelect
            label="Scheduling Status"
            options={[
              { id: "pending", name: "Pending" },
              { id: "provisional", name: "Provisional" },
              { id: "scheduled", name: "Scheduled" },
              { id: "self_scheduling", name: "Self-set" },
            ]}
            selected={filters.schedule_types}
            onChange={(val) => setFilters({ schedule_types: val })}
            columns={2}
            isOpen={openSection === "schedule_types"}
            onToggle={() => toggleSection("schedule_types")}
          />
        </>
      )}

      {/* ---- Site Type ---- */}
      <MultiSelect
        label="Site Type"
        options={[
          { id: "car_park", name: "Car park" },
          { id: "retail_park", name: "Retail park" },
          { id: "industrial_estate", name: "Industrial estate" },
          { id: "school", name: "School" },
          { id: "office_campus", name: "Office campus" },
        ]}
        selected={filters.site_types}
        onChange={(val) => setFilters({ site_types: val })}
        columns={2}
        isOpen={openSection === "site_types"}
        onToggle={() => toggleSection("site_types")}
      />

      {/* ---- Clients ---- */}
      <MultiSelect
        label="Clients"
        options={clients}
        selected={filters.clients}
        onChange={(val) => {
          const newClientIds = new Set(val.map((c) => c.id));
          const validSites = filters.sites.filter((s) => {
            const siteData = sites.find((si) => si.id === s.id);
            return siteData && newClientIds.has(siteData.client);
          });
          setFilters({
            clients: val,
            sites: newClientIds.size > 0 ? validSites : filters.sites,
          });
        }}
        isOpen={openSection === "clients"}
        onToggle={() => toggleSection("clients")}
      />

      {/* ---- Sites ---- */}
      <MultiSelect
        label="Sites"
        options={filteredSites}
        selected={filters.sites}
        onChange={(val) => setFilters({ sites: val })}
        isOpen={openSection === "sites"}
        onToggle={() => toggleSection("sites")}
      />

      {/* ---- Surveyors ---- */}
      <MultiSelect
        label="Surveyors"
        options={team}
        selected={filters.surveyors}
        onChange={(val) => setFilters({ surveyors: val })}
        isOpen={openSection === "surveyors"}
        onToggle={() => toggleSection("surveyors")}
      />

      <ReturnButton to={-1} />
    </div>
  );
}

export default Filters;
