import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import EditButton from "./EditButton";
import SearchPickerModal from "./SearchPickerModal";
import OverviewBlock from "./OverviewBlock";
import { SurveyCardGrid, surveyCardStyle } from "./SurveyCard";

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
  const [surveyFilter, setSurveyFilter] = useState("active");
  const [siblingIds, setSiblingIds] = useState({ prev: null, next: null });
  // Select mode for sites and surveys
  const [siteSelectMode, setSiteSelectMode] = useState(false);
  const [selectedSites, setSelectedSites] = useState(new Set());
  const [surveySelectMode, setSurveySelectMode] = useState(false);
  const [selectedSurveys, setSelectedSurveys] = useState(new Set());
  const [showCopyPrompt, setShowCopyPrompt] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [allSurveysForCopy, setAllSurveysForCopy] = useState([]);
  const [copySurveySearch, setCopySurveySearch] = useState("");

  useEffect(() => {
    setSitesOpen(false);
    setSurveysOpen(false);
    setSurveysListOpen(false);
    setSurveyFilter("active");
    window.scrollTo(0, 0);
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

      {(() => {
        const raw = client.billing_address || "";
        const parts = raw ? (raw.includes("\n") ? raw.split("\n").filter(Boolean) : raw.split(",").map(s => s.trim()).filter(Boolean)) : [];
        const pc = parts.length > 1 ? parts[parts.length - 1] : null;
        const addr = pc ? parts.slice(0, -1) : parts;
        return (<>
          <OverviewBlock
            name={client.name}
            subtitle={client.client_type_display || ""}
            stats={`${client.site_count} ${client.site_count === 1 ? "site" : "sites"} \u00B7 ${client.survey_count} ${client.survey_count === 1 ? "survey" : "surveys"}`}
            status={client.status}
            contact={{ name: client.contact_name, phone: client.contact_phone, email: client.contact_email }}
            address={addr}
            postcode={pc}
          />
          <div className="d-flex gap-2 align-items-center mt-2 mb-2">
            <button type="button" className="btn btn-sm" style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }} onClick={() => setShowCopyPrompt(true)}>+ Survey</button>
            <Link to={`/sites/create?client=${id}`} className="btn btn-sm" style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24, textDecoration: "none" }}>+ Site</Link>
            <Link to={`/clients/${id}/edit`} className="btn btn-secondary btn-sm" style={{ borderRadius: 2, height: 24 }}>Edit</Link>
          </div>
        </>);
      })()}


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
          <div className="d-flex gap-2 align-items-center">
            {siteSelectMode && selectedSites.size > 0 && (<>
              <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 4 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const count = selectedSites.size;
                    const existing = sites.filter(s => s.client === parseInt(id)).length;
                    await Promise.all([...selectedSites].map((sId, i) => {
                      const src = sites.find(s => s.id === sId);
                      if (!src) return Promise.resolve();
                      return api.post("/api/sites/", {
                        client: parseInt(id),
                        name: `Copy ${existing + i + 1}`,
                        site_type: src.site_type || "",
                        contact_name: src.contact_name || "",
                        contact_phone: src.contact_phone || "",
                        contact_email: src.contact_email || "",
                        access_notes: src.access_notes || "",
                        status: "active",
                      });
                    }));
                    setSiteSelectMode(false); setSelectedSites(new Set());
                    const res = await api.get(`/api/sites/?client=${id}`); setSites(res.data.results || res.data);
                    alert(`${count} site${count !== 1 ? "s" : ""} copied.`);
                  } catch (err) { alert("Failed to copy sites."); }
                }}>Copy ({selectedSites.size})</button>
              {(() => {
                const hasRealObs = [...selectedSites].some(sId => surveys.some(sv => (sv.site_id || sv.site) === sId && (sv.real_observation_count > 0 || (sv.observation_count > 0 && sv.real_observation_count === undefined))));
                return hasRealObs ? (
                  <button type="button" className="btn btn-sm d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, padding: 0, backgroundColor: "#c0392b", border: "none", borderRadius: 2, opacity: 0.45, cursor: "not-allowed" }}
                    onClick={(e) => { e.stopPropagation(); alert("This item contains survey data and cannot be deleted. Archive instead."); }}>
                    <img src="/datumise_delete.svg" alt="Delete" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} /></button>
                ) : (
                  <button type="button" className="btn btn-sm d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, padding: 0, backgroundColor: "#c0392b", border: "none", borderRadius: 2 }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm(`Delete ${selectedSites.size} site${selectedSites.size !== 1 ? "s" : ""}?`)) return;
                      try {
                        await Promise.all([...selectedSites].map(sId => api.delete(`/api/sites/${sId}/`)));
                        setSiteSelectMode(false); setSelectedSites(new Set());
                        const res = await api.get(`/api/sites/?client=${id}`); setSites(res.data.results || res.data);
                      } catch (err) { alert("Failed to delete sites."); }
                    }}>
                    <img src="/datumise_delete.svg" alt="Delete" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} /></button>
                );
              })()}
              <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: "#6c757d", color: "#fefdfc", border: "none", borderRadius: 4 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!window.confirm(`Archive ${selectedSites.size} site${selectedSites.size !== 1 ? "s" : ""}?`)) return;
                  try {
                    await Promise.all([...selectedSites].map(sId => api.patch(`/api/sites/${sId}/`, { status: "archived" })));
                    setSiteSelectMode(false); setSelectedSites(new Set());
                    const res = await api.get(`/api/sites/?client=${id}`); setSites(res.data.results || res.data);
                  } catch (err) { alert("Failed to archive sites."); }
                }}>Archive ({selectedSites.size})</button>
            </>)}
            <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: siteSelectMode ? "#0006b1" : "#db440a", color: "#fefdfc", border: "none", borderRadius: 4 }}
              onClick={(e) => { e.stopPropagation(); const entering = !siteSelectMode; setSiteSelectMode(entering); if (!entering) setSelectedSites(new Set()); if (entering && !sitesOpen) setSitesOpen(true); }}>
              {siteSelectMode ? `Select (${selectedSites.size})` : "Select"}
            </button>
          </div>
        </div>
        {sitesOpen && <div className="card-stack" style={{ marginTop: 8 }}>
          {sites.map((site) => (
            <div key={site.id} className="edit-fieldset mb-0 list-card-hover"
              style={{ backgroundColor: site._copied ? "#fff3cd" : "#f0ece4", cursor: "pointer", position: "relative" }}
              onClick={() => {
                if (siteSelectMode) { setSelectedSites(prev => { const n = new Set(prev); n.has(site.id) ? n.delete(site.id) : n.add(site.id); return n; }); return; }
                navigate(`/sites/${site.id}`);
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1F2A33" }}>{site.name}</span>
                  {site.status === "archived" && <span style={{ fontStyle: "italic", fontSize: "0.82rem", color: "#c0392b" }}>Archived</span>}
                </div>
                {!siteSelectMode && site.status === "active" && (
                  <Link to={`/surveys/create?client=${id}&site=${site.id}`} className="btn btn-outline-secondary btn-sm"
                    style={{ fontSize: "0.65rem", padding: "1px 8px", whiteSpace: "nowrap" }}
                    onClick={(e) => e.stopPropagation()}>Add Survey</Link>
                )}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#888", fontStyle: "italic" }}>
                {[`${site.survey_count} ${site.survey_count === 1 ? "survey" : "surveys"}`, site.city, site.postcode].filter(Boolean).join(" \u00B7 ")}
              </div>
              {siteSelectMode && (
                <div style={{ position: "absolute", bottom: 6, right: 8, width: 20, height: 20, borderRadius: "50%", border: "2px solid #888", backgroundColor: selectedSites.has(site.id) ? "#0d6efd" : "#fff", cursor: "pointer" }} />
              )}
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
              { value: "active", label: "Active", count: surveys.filter(s => (s.survey_status || s.status) === "active" || ["draft", "open", "assigned"].includes(s.status)).length },
              { value: "completed", label: "Completed", count: surveys.filter(s => (s.survey_status || s.status) === "completed").length },
              { value: "archived", label: "Archived", count: surveys.filter(s => s.survey_record_status === "archived" || (s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned")).length },
              { value: "cancelled", label: "Cancelled", count: surveys.filter(s => (s.survey_status) === "cancelled" || (s.status === "archived" && s.closure_reason === "cancelled")).length },
              { value: "abandoned", label: "Abandoned", count: surveys.filter(s => (s.survey_status) === "abandoned" || (s.status === "archived" && s.closure_reason === "abandoned")).length },
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="edit-legend section-toggle" onClick={() => setSurveysListOpen(!surveysListOpen)} style={{ marginBottom: 0 }}>
            <span className={`section-chevron${surveysListOpen ? " section-chevron--open" : ""}`}></span>
            Surveys ({surveys.length})
          </p>
          <div className="d-flex gap-2 align-items-center">
            {surveySelectMode && selectedSurveys.size > 0 && (<>
              <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 4 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const count = selectedSurveys.size;
                    await Promise.all([...selectedSurveys].map(sId => {
                      const src = surveys.find(s => s.id === sId);
                      if (!src) return Promise.resolve();
                      return api.post("/api/surveys/", {
                        site: src.site_id || src.site,
                        visit_requirement: src.visit_requirement || null,
                        visit_time: src.visit_time || null,
                        arrival_action: src.arrival_action || null,
                        departure_action: src.departure_action || src.arrival_action || null,
                        notes: src.notes || "",
                        urgent: src.urgent || false,
                      });
                    }));
                    setSurveySelectMode(false); setSelectedSurveys(new Set());
                    const res = await api.get(`/api/surveys/?client=${id}`); setSurveys(res.data.results || res.data);
                    alert(`${count} survey${count !== 1 ? "s" : ""} copied as draft.`);
                  } catch (err) { alert("Failed to copy surveys."); }
                }}>Copy ({selectedSurveys.size})</button>
              {(() => {
                const hasRealObs = [...selectedSurveys].some(sId => { const sv = surveys.find(s => s.id === sId); return sv && (sv.real_observation_count > 0 || (sv.observation_count > 0 && sv.real_observation_count === undefined)); });
                return hasRealObs ? (
                  <button type="button" className="btn btn-sm d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, padding: 0, backgroundColor: "#c0392b", border: "none", borderRadius: 2, opacity: 0.45, cursor: "not-allowed" }}
                    onClick={(e) => { e.stopPropagation(); alert("This item contains survey data and cannot be deleted. Archive instead."); }}>
                    <img src="/datumise_delete.svg" alt="Delete" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} /></button>
                ) : (
                  <button type="button" className="btn btn-sm d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, padding: 0, backgroundColor: "#c0392b", border: "none", borderRadius: 2 }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm(`Delete ${selectedSurveys.size} survey${selectedSurveys.size !== 1 ? "s" : ""}?`)) return;
                      try {
                        await Promise.all([...selectedSurveys].map(sId => api.delete(`/api/surveys/${sId}/`)));
                        setSurveySelectMode(false); setSelectedSurveys(new Set());
                        const res = await api.get(`/api/surveys/?client=${id}`); setSurveys(res.data.results || res.data);
                      } catch (err) { alert("Failed to delete surveys."); }
                    }}>
                    <img src="/datumise_delete.svg" alt="Delete" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} /></button>
                );
              })()}
              <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: "#6c757d", color: "#fefdfc", border: "none", borderRadius: 4 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!window.confirm(`Archive ${selectedSurveys.size} survey${selectedSurveys.size !== 1 ? "s" : ""}?`)) return;
                  try {
                    await Promise.all([...selectedSurveys].map(sId => api.patch(`/api/surveys/${sId}/`, { status: "archived" })));
                    setSurveySelectMode(false); setSelectedSurveys(new Set());
                    const res = await api.get(`/api/surveys/?client=${id}`); setSurveys(res.data.results || res.data);
                  } catch (err) { alert("Failed to archive surveys."); }
                }}>Archive ({selectedSurveys.size})</button>
            </>)}
            <button type="button" className="btn btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px", backgroundColor: surveySelectMode ? "#0006b1" : "#db440a", color: "#fefdfc", border: "none", borderRadius: 4 }}
              onClick={(e) => { e.stopPropagation(); const entering = !surveySelectMode; setSurveySelectMode(entering); if (!entering) setSelectedSurveys(new Set()); if (entering && !surveysListOpen) setSurveysListOpen(true); }}>
              {surveySelectMode ? `Select (${selectedSurveys.size})` : "Select"}
            </button>
          </div>
        </div>
        {surveysListOpen && <div className="card-stack">
          {(() => {
            const filtered = surveys.filter((s) => {
              const ss = s.survey_status || s.status;
              if (surveyFilter === "active") return ss === "active" || ["draft", "open", "assigned"].includes(s.status);
              if (surveyFilter === "completed") return ss === "completed";
              if (surveyFilter === "archived") return s.survey_record_status === "archived" || (s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned");
              if (surveyFilter === "cancelled") return ss === "cancelled" || (s.status === "archived" && s.closure_reason === "cancelled");
              if (surveyFilter === "abandoned") return ss === "abandoned" || (s.status === "archived" && s.closure_reason === "abandoned");
              return true;
            });
            return filtered.length === 0 ? null : filtered.map((s) => (
                <div key={s.id} className="survey-queue-card" style={{ ...(surveyCardStyle(s) || {}), position: "relative" }}
                  onClick={() => {
                    if (surveySelectMode) { setSelectedSurveys(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; }); return; }
                    navigate(`/surveys/${s.id}`);
                  }}>
                  <SurveyCardGrid survey={s} />
                  {surveySelectMode && (
                    <div style={{ position: "absolute", bottom: 6, right: 8, width: 20, height: 20, borderRadius: "50%", border: "2px solid #888", backgroundColor: selectedSurveys.has(s.id) ? "#0d6efd" : "#fff" }} />
                  )}
                </div>
              ));
          })()}
        </div>}
      </div>

      <div className="d-md-none">
        <EditButton to={`/clients/${id}/edit`} />
      </div>
      <ReturnButton to="/clients" />

      {/* Rule 000025: Copy survey prompt */}
      {showCopyPrompt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setShowCopyPrompt(false)} />
          <div style={{ position: "relative", backgroundColor: "#fff", borderRadius: 8, padding: "24px 28px", maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 16, color: "#1F2A33" }}>
              Would you like to copy an existing survey?
            </p>
            <div className="d-flex justify-content-center gap-3">
              <button type="button" className="btn btn-success btn-sm px-4" onClick={async () => {
                setShowCopyPrompt(false);
                try {
                  const res = await api.get("/api/surveys/");
                  setAllSurveysForCopy(res.data.results || res.data);
                } catch (e) { setAllSurveysForCopy([]); }
                setCopySurveySearch("");
                setShowCopyModal(true);
              }}>Yes</button>
              <button type="button" className="btn btn-outline-secondary btn-sm px-4" onClick={() => {
                setShowCopyPrompt(false);
                navigate(`/surveys/create?client=${id}`);
              }}>No</button>
            </div>
          </div>
        </div>
      )}

      {/* Rule 000025: Copy survey modal */}
      {showCopyModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setShowCopyModal(false)} />
          <div style={{ position: "relative", backgroundColor: "#fff", borderRadius: 8, width: "90%", maxWidth: 480, maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e0dcd6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "#1F2A33" }}>Copy Survey</span>
                <button type="button" onClick={() => setShowCopyModal(false)}
                  style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#888", lineHeight: 1, padding: 0 }}>&times;</button>
              </div>
              <input type="text" placeholder="Search..." value={copySurveySearch} onChange={(e) => setCopySurveySearch(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #c8c2b8", borderRadius: 6, fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
              {(() => {
                const clientSurveys = allSurveysForCopy.filter(s => String(s.client_id || s.client) === String(id));
                const otherSurveys = allSurveysForCopy.filter(s => String(s.client_id || s.client) !== String(id));
                const filterFn = (s) => !copySurveySearch || (s.name || "").toLowerCase().includes(copySurveySearch.toLowerCase()) || (s.site_name || "").toLowerCase().includes(copySurveySearch.toLowerCase());
                return [...clientSurveys.filter(filterFn), ...otherSurveys.filter(filterFn)].map(s => (
                  <button key={s.id} type="button" style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", border: "none", cursor: "pointer", backgroundColor: "transparent", fontSize: "0.85rem" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f7"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    onClick={async () => {
                      try {
                        await api.post("/api/surveys/", {
                          site: s.site_id || s.site,
                          visit_requirement: s.visit_requirement || null,
                          visit_time: s.visit_time || null,
                          arrival_action: s.arrival_action || null,
                          departure_action: s.departure_action || s.arrival_action || null,
                          notes: s.notes || "",
                          urgent: s.urgent || false,
                          window_days: s.window_days || null,
                        });
                        setShowCopyModal(false);
                        const res = await api.get(`/api/surveys/?client=${id}`);
                        setSurveys(res.data.results || res.data);
                        alert("Survey copied as draft.");
                      } catch (err) { alert("Failed to copy survey."); }
                    }}>
                    <div style={{ fontWeight: 600 }}>{s.name || `Survey #${s.id}`}</div>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>{s.site_name || ""} {s.site_postcode || ""}</div>
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientDetail;
