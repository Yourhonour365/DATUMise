import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "./api/api";
import SearchPickerModal from "./SearchPickerModal";

const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, i) => {
  const h = Math.floor(i / 12);
  const m = (i % 12) * 5;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? "am" : "pm";
  return { value: `${hh}:${mm}`, label: `${hour12}:${mm}${ampm}` };
});

const QUARTER_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? "am" : "pm";
  return { value: `${hh}:${mm}`, label: `${hour12}:${mm}${ampm}` };
});

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} '${y.slice(2)}`;
}

function TimePicker({ value, onChange, defaultValue, className, style }) {
  const total = QUARTER_OPTIONS.length;
  const half = total >> 1;
  const currentIdx = QUARTER_OPTIONS.findIndex((o) => o.value === value);
  const defIdx = Math.max(0, QUARTER_OPTIONS.findIndex((o) => o.value === defaultValue));
  const centerIdx = currentIdx >= 0 ? currentIdx : defIdx;
  const options = Array.from({ length: total }, (_, pos) => {
    const i = ((centerIdx - half + pos) % total + total) % total;
    return { pos, label: QUARTER_OPTIONS[i].label, val: QUARTER_OPTIONS[i].value };
  });
  return (
    <select className={className} style={style}
      value={currentIdx >= 0 ? String(half) : ""}
      onChange={(e) => { const p = e.target.value; onChange(p === "" ? "" : options[parseInt(p)].val); }}
      onClick={(e) => e.stopPropagation()}>
      <option value="">— no time</option>
      {options.map(({ pos, label }) => <option key={pos} value={String(pos)}>{label}</option>)}
    </select>
  );
}

const WINDOW_DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const EMPTY_DAY = { on: false, timeStart: "", timeEnd: "" };
const EMPTY_WINDOW_DAYS = { mon: { ...EMPTY_DAY }, tue: { ...EMPTY_DAY }, wed: { ...EMPTY_DAY }, thu: { ...EMPTY_DAY }, fri: { ...EMPTY_DAY }, sat: { ...EMPTY_DAY }, sun: { ...EMPTY_DAY } };

function parseWindowDays(json) {
  const result = { mon: { ...EMPTY_DAY }, tue: { ...EMPTY_DAY }, wed: { ...EMPTY_DAY }, thu: { ...EMPTY_DAY }, fri: { ...EMPTY_DAY }, sat: { ...EMPTY_DAY }, sun: { ...EMPTY_DAY } };
  if (json && typeof json === "object") {
    Object.entries(json).forEach(([day, val]) => {
      if (!(day in result)) return;
      if (val && typeof val === "object") {
        result[day] = { on: true, timeStart: val.start || "", timeEnd: val.end || "" };
      } else {
        result[day] = { on: true, timeStart: val || "", timeEnd: "" };
      }
    });
  }
  return result;
}

function buildWindowDaysPayload(windowDays) {
  const out = {};
  Object.entries(windowDays).forEach(([day, { on, timeStart, timeEnd }]) => {
    if (on) out[day] = { start: timeStart || null, end: timeEnd || null };
  });
  return Object.keys(out).length > 0 ? out : null;
}

function SurveyCreateForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClient = searchParams.get("client") || "";
  const preselectedSite = searchParams.get("site") || "";
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [team, setTeam] = useState([]);
  const [clientFilter, setClientFilter] = useState(preselectedClient);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(null);
  const [showDateConfirmModal, setShowDateConfirmModal] = useState(false);
  const [showSurveyorConfirmModal, setShowSurveyorConfirmModal] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);

  const [form, setForm] = useState({
    site: preselectedSite,
    assigned_to: "",
    visit_requirement: "",
    scheduled_for: "",
    survey_date: "",
    survey_time: "",
    window_end_date: "",
    window_end_time: "",
    window_start_end_time: "",
    due_by: "",
    schedule_status: "",
    visit_time: "",
    arrival_action: "",
    departure_action: "",
    urgent: "",
    client_present: false,
    other_attendees: [],
    site_requirements: "",
    notes: "",
  });

  const [windowDays, setWindowDays] = useState({ ...EMPTY_WINDOW_DAYS });
  const [pickerOpen, setPickerOpen] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [openSections, setOpenSections] = useState({
    client: true, visit: false, schedule: false, attendees: false, requirements: false, notes: false,
  });
  const toggle = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const [openCards, setOpenCards] = useState({});
  const cardOpen = (key) => openCards[key] !== false;
  const toggleCard = (key) => setOpenCards((prev) => ({ ...prev, [key]: prev[key] === false }));
  const cardClass = (key, extra) => `field-block${extra || ""}${cardOpen(key) ? "" : " field-block--closed"}`;
  const cardLabel = (key, text) => (
    <button type="button" className="card-toggle" onClick={() => toggleCard(key)}>
      <span className={`toggle-caret${cardOpen(key) ? " toggle-caret--open" : ""}`} />
      <span className="toggle-title">{text}</span>
    </button>
  );

  useEffect(() => {
    document.body.style.backgroundColor = "#f5f5f7";
    return () => { document.body.style.backgroundColor = ""; };
  }, []);

  useEffect(() => {
    Promise.all([
      api.get("/api/clients/"),
      api.get("/api/sites/"),
      api.get("/api/team/"),
      api.get("/api/auth/user/"),
    ])
      .then(([clientsRes, sitesRes, teamRes, userRes]) => {
        setClients(clientsRes.data.results || clientsRes.data);
        setSites(sitesRes.data.results || sitesRes.data);
        const teamData = teamRes.data.results || teamRes.data;
        setTeam(teamData);
        const uid = userRes.data.pk || userRes.data.id;
        setUserId(uid);
        const me = teamData.find(m => m.id === uid);
        setUserRole(me?.role || "");
      })
      .catch((err) => console.error("Failed to load options:", err));
  }, []);

  const vr = form.visit_requirement;
  const isUnrestricted = ["24h_notify", "24h_no_notify", "wh_notify", "wh_no_notify"].includes(vr);
  const isPrearranged = vr === "prearranged";
  const isWindow = form.visit_time === "window";

  const canDraft = !!(clientFilter && form.site);

  const visitProtocolsComplete = !!(
    form.visit_requirement &&
    (form.visit_time || Object.values(windowDays).some(d => d.on)) &&
    form.site_requirements &&
    form.arrival_action
  );

  const isSurveyor = userRole === "surveyor";

  // Rule 000010: required fields for activation
  // Activation field completion (orange border system)
  const fieldComplete = {
    client: !!clientFilter,
    site: !!form.site,
    visit_requirement: !!form.visit_requirement,
    visit_time: !!form.visit_time,
    working_hours: Object.values(windowDays).some(d => d.on),
    site_requirements: !!form.site_requirements,
    arrival_action: !!form.arrival_action,
    other_attendees: form.other_attendees.length > 0,
    urgent: !!(form.urgent && form.urgent !== ""),
  };

  const canActivate =
    fieldComplete.client && fieldComplete.site &&
    fieldComplete.visit_requirement && fieldComplete.visit_time && fieldComplete.working_hours &&
    fieldComplete.site_requirements && fieldComplete.arrival_action &&
    fieldComplete.other_attendees && fieldComplete.urgent;


  // Orange border: incomplete = #db440a, complete = normal. Live, not on save.
  const incompleteBorder = { borderLeft: "4px solid #db440a" };
  const fieldBorder = (complete) => complete ? {} : incompleteBorder;

  // Section borders: orange if ANY required field inside is incomplete
  const sectionBorder = (key) => {
    if (key === "client") return (fieldComplete.client && fieldComplete.site) ? {} : incompleteBorder;
    if (key === "visit") return (fieldComplete.visit_requirement && fieldComplete.visit_time && fieldComplete.working_hours && fieldComplete.site_requirements && fieldComplete.arrival_action) ? {} : incompleteBorder;
    if (key === "attendees") return fieldComplete.other_attendees ? {} : incompleteBorder;
    if (key === "requirements") return fieldComplete.urgent ? {} : incompleteBorder;
    return {};
  };


  const activeClients = clients.filter((c) => c.status === "active");
  const clientHasActiveSite = (clientId) => sites.some((s) => s.client === clientId && s.status === "active");
  const isClientSelectable = (c) => c.status === "active" && clientHasActiveSite(c.id);
  const activeSites = sites.filter((s) => s.status === "active");
  const filteredSites = clientFilter
    ? activeSites.filter((s) => s.client === parseInt(clientFilter))
    : activeSites;

  const buildPayload = () => {
    const p = {};
    if (form.site) p.site = parseInt(form.site);
    if (form.assigned_to) p.assigned_to = parseInt(form.assigned_to);
    p.visit_requirement = form.visit_requirement || null;
    if (form.scheduled_for) p.scheduled_for = form.scheduled_for;
    if (form.survey_date) p.survey_date = form.survey_date;
    if (form.survey_time) p.survey_time = form.survey_time;
    if (form.window_end_date) p.window_end_date = form.window_end_date;
    if (form.window_end_time) p.window_end_time = form.window_end_time;
    if (form.window_start_end_time) p.window_start_end_time = form.window_start_end_time;
    if (form.due_by) p.due_by = form.due_by;
    if (form.schedule_status) p.schedule_status = form.schedule_status === "confirmed" ? "booked" : form.schedule_status;
    p.visit_time = form.visit_time || null;
    p.arrival_action = form.arrival_action || null;
    p.departure_action = form.departure_action || form.arrival_action || null;
    if (form.urgent === "yes") p.urgent = true;
    else if (form.urgent === "no") p.urgent = false;
    else if (form.urgent === "critical") p.urgent = true;
    p.client_present = form.client_present;
    if (form.other_attendees && form.other_attendees.length > 0) p.other_attendees = form.other_attendees;
    if (form.site_requirements) p.site_requirements = form.site_requirements;
    if (form.notes.trim()) p.notes = form.notes.trim();
    p.window_days = buildWindowDaysPayload(windowDays);
    return p;
  };

  const handleDraft = async (e) => {
    e.preventDefault();
    if (!canDraft) return;
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      if (savedId) {
        await api.patch(`/api/surveys/${savedId}/`, buildPayload());
      } else {
        const res = await api.post("/api/surveys/", buildPayload());
        setSavedId(res.data.id);
      }
      setSavedMessage("Draft Survey Saved");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err) {
      setError("Failed to save survey.");
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="container mt-3 px-3" style={{ paddingBottom: "50vh" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to="/surveys" className="text-decoration-none">&larr; Back to Surveys</Link>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3 d-none d-md-flex">
        <h5 className="fw-bold mb-0">New Survey</h5>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ client: true, visit: true, schedule: true, attendees: true, requirements: true, notes: true })}>Open all</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ client: false, visit: false, schedule: false, attendees: false, requirements: false, notes: false })}>Close all</button>
        </div>
      </div>

      {clientFilter && form.site && (
        <div style={{ backgroundColor: "#d4edda", border: "1px solid #c3e6cb", borderRadius: 6, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#155724" }}>
          Complete the required fields to activate this survey.
        </div>
      )}

      {savedMessage && <p style={{ fontSize: "0.85rem", color: "#155724", backgroundColor: "#d4edda", border: "1px solid #c3e6cb", borderRadius: 6, padding: "8px 14px" }}>{savedMessage}</p>}
      {error && <p className="text-danger" style={{ fontSize: "0.85rem", whiteSpace: "pre-line" }}>{error}</p>}

      <form>
        {/* ---- Client Details ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("client") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("client")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.client ? " section-chevron--open" : ""}`}></span>
            <span>Client details</span>
            {clientFilter && form.site && (() => {
              const cName = clients.find(c => String(c.id) === clientFilter)?.name || "";
              const sName = filteredSites.find(s => String(s.id) === String(form.site))?.name || sites.find(s => String(s.id) === String(form.site))?.name || "";
              return (
                <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                  {cName}, {sName}
                </span>
              );
            })()}
          </p>
          {openSections.client && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: clientFilter ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.client) }}>
              <div className="field-label">Client</div>
              <button type="button" className="edit-field" onClick={() => setPickerOpen("client")}
                style={{ textAlign: "left", cursor: "pointer", background: "transparent", border: "1px solid #c8c2b8", borderRadius: 6, padding: "6px 12px" }}>
                {clientFilter ? (clients.find(c => String(c.id) === clientFilter)?.name || "All clients") : "All clients"}
              </button>
              {pickerOpen === "client" && (
                <SearchPickerModal
                  title="Select Client"
                  value={clientFilter}
                  onClose={() => setPickerOpen(null)}
                  onChange={(val) => { setClientFilter(val); setForm({ ...form, site: "" }); }}
                  options={[
                    { value: "", label: "All clients" },
                    ...clients.map((c) => {
                      const selectable = isClientSelectable(c);
                      return {
                        value: String(c.id), label: c.name + (c.status !== "active" ? " (archived)" : !clientHasActiveSite(c.id) ? " (no sites)" : ""),
                        disabled: !selectable, subtitle: !selectable ? (c.status !== "active" ? "Archived" : "No active sites") : undefined,
                      };
                    }),
                  ]}
                />
              )}
            </div>
            <div className="field-block" style={{ backgroundColor: form.site ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.site) }}>
              <div className="field-label">Site</div>
              <button type="button" className="edit-field" onClick={() => setPickerOpen("site")}
                style={{ textAlign: "left", cursor: "pointer", background: "transparent", border: "1px solid #c8c2b8", borderRadius: 6, padding: "6px 12px" }}>
                {form.site ? (filteredSites.find(s => String(s.id) === String(form.site))?.name || "-- Select --") : "-- Select --"}
              </button>
              {pickerOpen === "site" && (
                <SearchPickerModal
                  title="Select Site"
                  value={form.site}
                  onClose={() => setPickerOpen(null)}
                  onChange={(val) => {
                    const s = sites.find((x) => x.id === parseInt(val));
                    if (s) setClientFilter(String(s.client));
                    setForm({ ...form, site: val });
                  }}
                  options={[
                    { value: "", label: "-- Select --" },
                    ...filteredSites.map((s) => ({
                      value: String(s.id), label: s.name,
                    })),
                  ]}
                />
              )}
            </div>
          </div>}
        </div>

        {/* ---- Visit Protocols ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("visit") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("visit")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.visit ? " section-chevron--open" : ""}`}></span>
            <span>Visit Protocols</span>
            {form.visit_requirement && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {{ "24h_notify": "24 Hours - notify", "24h_no_notify": "24 Hours - no notification", "wh_notify": "Working hours - notify", "wh_no_notify": "Working hours - no notification", "prearranged": "Pre-arranged" }[form.visit_requirement] || form.visit_requirement}
              </span>
            )}
          </p>
          {openSections.visit && <div className="card-stack">
            <div className={cardClass("sched_proto", !vr ? " field-block--unset" : "")} style={{ backgroundColor: vr ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.visit_requirement) }}>
              {cardLabel("sched_proto", "Client's site visit protocol")}
              <div className="edit-field d-flex gap-4 flex-wrap">
                {[{ value: "24h_notify", label: "24 Hours - notify in advance" }, { value: "24h_no_notify", label: "24 Hours - no notification" }, { value: "wh_notify", label: "Working hours - notify in advance" }, { value: "wh_no_notify", label: "Working hours - no notification" }, { value: "prearranged", label: "Pre-arranged visits only" }].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="visit_requirement" value={value}
                      checked={vr === value}
                      onChange={() => {
                        const newVr = value;
                        const newSs = newVr !== "prearranged" ? "self_scheduled" : "";
                        setForm({ ...form, visit_requirement: newVr, schedule_status: newSs });
                      }}
                    />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={cardClass("site_avail")} style={{ backgroundColor: (Object.values(windowDays).some(d => d.on) || form.visit_time) ? "#f0ece4" : "#f5f5f7" }}>
              {cardLabel("site_avail", "Site availability")}
              <div className={`field-block${!form.visit_time ? " field-block--unset" : ""}`} style={{ backgroundColor: form.visit_time ? "#e8e2d8" : "#f5f5f7", width: "fit-content", marginLeft: "1rem", ...fieldBorder(fieldComplete.visit_time) }}>
                <div className="field-label">Survey Window</div>
                <div className="edit-field d-flex gap-4">
                  {[{ value: "anytime", label: "Open" }, { value: "window", label: "Window" }].map(({ value, label }) => (
                    <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                      <input type="radio" name="visit_time" value={value}
                        checked={form.visit_time === value}
                        onChange={() => setForm({ ...form, visit_time: value })}
                      />
                      <span style={{ fontSize: "0.9rem" }}>{label}</span>
                    </label>
                  ))}
                </div>
                {isWindow && (
                <div className={cardClass("window")} style={{ backgroundColor: "#d8d2c8", marginLeft: "1rem", paddingBottom: "0.75rem" }}>
                  {cardLabel("window", "Window")}
                  {(form.scheduled_for || form.window_end_date || form.window_start_end_time || form.window_end_time) && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
                      <button type="button" className="btn btn-outline-secondary" style={{ fontSize: "0.65rem", padding: "2px 8px", lineHeight: 1.2 }}
                        onClick={(e) => { e.stopPropagation(); setForm({ ...form, scheduled_for: "", window_end_date: "", window_start_end_time: "", window_end_time: "" }); }}>
                        Clear all
                      </button>
                    </div>
                  )}
                <div style={{ display: "flex", justifyContent: "flex-start", gap: 6, alignItems: "flex-start", marginBottom: 0 }}>
                  {[
                    {
                      title: "Start", showStart: true, showEnd: false,
                      dateVal: form.scheduled_for ? form.scheduled_for.slice(0, 10) : "",
                      onDate: (date) => setForm({ ...form, scheduled_for: date ? `${date}T${form.scheduled_for ? form.scheduled_for.slice(11, 16) : "09:00"}` : "", schedule_status: !date && isPrearranged ? "" : form.schedule_status }),
                      bgColor: "#f5f5f7",
                      endTimeVal: form.window_start_end_time,
                      onEndTime: (v) => setForm({ ...form, window_start_end_time: v }),
                    },
                    {
                      title: "End", showStart: false, showEnd: true,
                      dateVal: form.window_end_date,
                      onDate: (date) => setForm({ ...form, window_end_date: date }),
                      bgColor: "#f5f5f7",
                      minDate: form.scheduled_for ? form.scheduled_for.slice(0, 10) : "",
                      endTimeVal: form.window_end_time,
                      onEndTime: (v) => setForm({ ...form, window_end_time: v }),
                    },
                  ].map(({ title, showStart, showEnd, dateVal, onDate, bgColor, minDate, endTimeVal, onEndTime }) => (
                    <div key={title} className="field-block" style={{ backgroundColor: bgColor, width: "auto", flex: "0 0 auto" }}>
                      <div className="field-label">{title}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Date</span>
                        <div className="date-btn" onClick={(e) => { const inp = e.currentTarget.querySelector("input"); if (!inp) return; const now = Date.now(); const last = parseInt(inp.dataset.lastOpen || "0"); if (now - last < 500) { inp.blur(); inp.dataset.lastOpen = "0"; } else { inp.showPicker(); inp.dataset.lastOpen = String(now); } }}>
                          <span style={{ fontSize: "0.78rem" }}>{formatDate(dateVal)}</span>
                          <input type="date" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", zIndex: 1 }}
                            value={dateVal} min={minDate || undefined} onChange={(e) => onDate(e.target.value)} />
                        </div>
                      </div>
                      {showStart && (
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 0 }}>
                          <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Start</span>
                          <select className="time-btn"
                            value={form.scheduled_for ? form.scheduled_for.slice(11, 16) : ""}
                            onChange={(e) => { const t = e.target.value; const d = form.scheduled_for ? form.scheduled_for.slice(0, 10) : ""; if (d) setForm({ ...form, scheduled_for: `${d}T${t}` }); }}>
                            <option value="">—</option>
                            {TIME_OPTIONS.filter(({ value }) => value >= "09:00").map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </div>
                      )}
                      {showEnd && (
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 0 }}>
                          <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>End</span>
                          <select className="time-btn"
                            value={endTimeVal}
                            onChange={(e) => onEndTime(e.target.value)}>
                            <option value="">—</option>
                            {TIME_OPTIONS.filter(({ value }) => value >= "09:00").map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                </div>
                )}
              </div>
              <div style={{ marginTop: 8, ...fieldBorder(fieldComplete.working_hours), borderRadius: 4, padding: fieldComplete.working_hours ? 0 : "0 0 0 0" }}>
              <div className="site-avail-sublabel" style={{ marginLeft: "1rem", fontWeight: 700, fontSize: "0.85rem", color: "#1F2A33" }}>Client's Working Hours</div>
              {Object.values(windowDays).some(d => d.on) && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
                  <button type="button" className="btn btn-outline-secondary" style={{ fontSize: "0.65rem", padding: "2px 8px", lineHeight: 1.2 }}
                    onClick={(e) => { e.stopPropagation(); setWindowDays({ ...EMPTY_WINDOW_DAYS }); }}>
                    Clear all
                  </button>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "flex-start" }}>
                {WINDOW_DAYS.map(({ key, label }) => {
                  const day = windowDays[key] || { ...EMPTY_DAY };
                  return (
                    <div key={key} onClick={() => setWindowDays({ ...windowDays, [key]: { ...day, on: !day.on, timeStart: day.on ? "" : (day.timeStart || "09:00"), timeEnd: day.on ? "" : (day.timeEnd || "17:00") } })}
                      style={{ border: "1px solid #c8c2b8", borderRadius: 6, padding: "6px 6px 8px", backgroundColor: day.on ? "#e8e2d8" : "#f5f5f7", width: "calc(14.28% - 6px)", cursor: "pointer", userSelect: "none" }}>
                      <div style={{ display: "flex", alignItems: "baseline", marginBottom: day.on ? 6 : 0 }}>
                        <span style={{ flex: 1, fontSize: "0.7rem", color: "#888" }}>Day</span>
                        <span style={{ flex: 1, textAlign: "center", fontSize: "0.85rem", fontWeight: 700 }}>{label}</span>
                        <span style={{ flex: 1 }} />
                      </div>
                      {day.on && (
                        <>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                            <span style={{ fontSize: "0.7rem", color: "#888", flexShrink: 0, minWidth: "1.8rem" }}>Start</span>
                            <TimePicker value={day.timeStart} defaultValue="09:00"
                              className="time-btn" style={{ marginLeft: "auto" }}
                              onChange={(v) => setWindowDays({ ...windowDays, [key]: { ...day, timeStart: v } })} />
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                            <span style={{ fontSize: "0.7rem", color: "#888", flexShrink: 0, minWidth: "1.8rem" }}>End</span>
                            <TimePicker value={day.timeEnd} defaultValue="09:00"
                              className="time-btn" style={{ marginLeft: "auto" }}
                              onChange={(v) => setWindowDays({ ...windowDays, [key]: { ...day, timeEnd: v } })} />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            </div>

            <div className={cardClass("site_req", !form.site_requirements ? " field-block--unset" : "")} style={{ backgroundColor: form.site_requirements ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.site_requirements) }}>
              {cardLabel("site_req", "Site Requirements")}
              <div className="edit-field d-flex gap-4 flex-wrap">
                {[{ value: "full_ppe", label: "Full PPE" }, { value: "hazard_vest", label: "High Viz" }, { value: "none", label: "None" }].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="site_requirements" value={value}
                      checked={form.site_requirements === value}
                      onChange={() => setForm({ ...form, site_requirements: value })}
                    />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={cardClass("procedures")} style={{ backgroundColor: (form.arrival_action && form.arrival_action !== "none") ? "#f0ece4" : "#f5f5f7", width: "fit-content", gap: 8, ...fieldBorder(fieldComplete.arrival_action) }}>
              {cardLabel("procedures", "Site procedures")}
              <div className="edit-field d-flex gap-4">
                {[
                  { value: "reception", label: "Arrival - reception" },
                  { value: "security", label: "Arrival - security" },
                  { value: "none", label: "None" },
                ].map(({ value, label }) => {
                  const selected = value === "none"
                    ? form.arrival_action === "none" || !form.arrival_action
                    : (form.arrival_action || "").split(",").includes(value);
                  return (
                    <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                      <input
                        type={value === "none" ? "radio" : "checkbox"}
                        name="site_procedures"
                        checked={selected}
                        onChange={() => {
                          if (value === "none") {
                            setForm({ ...form, arrival_action: "none", departure_action: "" });
                          } else {
                            const current = (form.arrival_action && form.arrival_action !== "none") ? form.arrival_action.split(",") : [];
                            const updated = current.includes(value)
                              ? current.filter(v => v !== value)
                              : [...current, value];
                            setForm({ ...form, arrival_action: updated.length > 0 ? updated.join(",") : "none", departure_action: "" });
                          }
                        }}
                        style={value !== "none" ? { appearance: "none", width: 16, height: 16, borderRadius: "50%", border: "2px solid #888", backgroundColor: selected ? "#0d6efd" : "#fff", cursor: "pointer", position: "relative" } : {}}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Survey Date ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("schedule")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.schedule ? " section-chevron--open" : ""}`}></span>
            <span>Survey Date</span>
            {form.survey_date && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {formatDate(form.survey_date)}{form.survey_time ? ` ${(() => { const [h, m] = form.survey_time.split(":").map(Number); const p = h >= 12 ? "pm" : "am"; return `${h % 12 || 12}:${String(m).padStart(2, "0")}${p}`; })()}` : ""}{form.schedule_status ? `, ${{ self_scheduled: "self-set", provisional: "provisional", confirmed: "confirmed", booked: "confirmed" }[form.schedule_status] || form.schedule_status}` : ""}
              </span>
            )}
          </p>
          {openSections.schedule && <div className="card-stack">
            <div style={{ display: "flex", justifyContent: "flex-start", gap: 6, alignItems: "flex-start" }}>
              <div className="field-block" style={{ backgroundColor: "#f5f5f7", width: "auto", flex: "0 0 auto" }}>
                {(form.survey_date || form.survey_time) && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" className="btn btn-outline-secondary" style={{ fontSize: "0.65rem", padding: "2px 8px", lineHeight: 1.2 }}
                      onClick={() => setForm({ ...form, survey_date: "", survey_time: "" })}>
                      Clear
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Date</span>
                  <div className="date-btn" onClick={(e) => { const inp = e.currentTarget.querySelector("input"); if (!inp) return; const now = Date.now(); const last = parseInt(inp.dataset.lastOpen || "0"); if (now - last < 500) { inp.blur(); inp.dataset.lastOpen = "0"; } else { inp.showPicker(); inp.dataset.lastOpen = String(now); } }}>
                    <span style={{ fontSize: "0.78rem" }}>{formatDate(form.survey_date)}</span>
                    <input type="date" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", zIndex: 1 }}
                      value={form.survey_date}
                      onChange={(e) => {
                        const date = e.target.value;
                        if (!date) {
                          setForm({ ...form, survey_date: "", survey_time: "", schedule_status: "" });
                          return;
                        }
                        if (isSurveyor) {
                          const updates = { survey_date: date, schedule_status: "self_scheduled" };
                          if (!form.assigned_to) {
                            updates.assigned_to = String(userId);
                          } else if (String(form.assigned_to) !== String(userId)) {
                            setPendingDate(date);
                            setShowSurveyorConfirmModal(true);
                            return;
                          }
                          setForm({ ...form, ...updates });
                        } else if (form.visit_requirement === "prearranged") {
                          setPendingDate(date);
                          setShowDateConfirmModal(true);
                        } else {
                          setForm({ ...form, survey_date: date, schedule_status: "provisional" });
                        }
                      }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 0, opacity: form.survey_date ? 1 : 0.4 }}>
                  <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Time</span>
                  <select className="time-btn"
                    value={form.survey_time}
                    disabled={!form.survey_date}
                    onChange={(e) => setForm({ ...form, survey_time: e.target.value })}>
                    <option value="">—</option>
                    {TIME_OPTIONS.filter(({ value }) => value >= "09:00").map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Attendees ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("attendees") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("attendees")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.attendees ? " section-chevron--open" : ""}`}></span>
            <span>Attendees</span>
            {(() => {
              const parts = [];
              if (form.assigned_to) {
                const name = team.find(m => String(m.id) === String(form.assigned_to))?.name;
                if (name) parts.push(name);
              }
              (form.other_attendees || []).filter(v => v !== "none").forEach(v => parts.push(v.charAt(0).toUpperCase() + v.slice(1)));
              return parts.length > 0 ? (
                <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                  {parts.join(", ")}
                </span>
              ) : null;
            })()}
          </p>
          {openSections.attendees && <div className="card-stack">
            <div className={cardClass("surveyor")} style={{ backgroundColor: form.assigned_to ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              {cardLabel("surveyor", "Surveyor")}
              <button type="button" className="edit-field" onClick={() => setPickerOpen("surveyor")}
                style={{ textAlign: "left", cursor: "pointer", background: "transparent", border: "1px solid #c8c2b8", borderRadius: 6, padding: "6px 12px" }}>
                {form.assigned_to ? (team.find(m => String(m.id) === String(form.assigned_to))?.name || "Unassigned") : "Unassigned"}
              </button>
              {pickerOpen === "surveyor" && (
                <SearchPickerModal
                  title="Select Surveyor"
                  value={form.assigned_to}
                  onClose={() => setPickerOpen(null)}
                  onChange={(val) => setForm({ ...form, assigned_to: val })}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...team.filter((m) => m.role === "surveyor").map((m) => ({
                      value: String(m.id), label: m.name,
                    })),
                  ]}
                />
              )}
            </div>
            <div className={cardClass("attendees_other")} style={{ backgroundColor: form.other_attendees.length > 0 ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.other_attendees) }}>
              {cardLabel("attendees_other", "Other attendees")}
              <div className="edit-field d-flex gap-4 flex-wrap">
                {["client", "roofer", "specialist"].map((val) => (
                  <label key={val} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio"
                      checked={form.other_attendees.includes(val)}
                      onChange={() => {
                        const has = form.other_attendees.includes(val);
                        setForm({ ...form, other_attendees: has ? form.other_attendees.filter(v => v !== val) : [...form.other_attendees, val] });
                      }}
                    />
                    <span style={{ fontSize: "0.9rem", textTransform: "capitalize" }}>{val}</span>
                  </label>
                ))}
                <label className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                  <input type="radio" name="other_attendees_none"
                    checked={form.other_attendees.length === 1 && form.other_attendees[0] === "none"}
                    onChange={() => setForm({ ...form, other_attendees: ["none"] })}
                  />
                  <span style={{ fontSize: "0.9rem" }}>None</span>
                </label>
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Deadlines ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("requirements") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("requirements")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.requirements ? " section-chevron--open" : ""}`}></span>
            <span>Deadlines</span>
            {(form.urgent === "yes" || form.urgent === "critical" || form.due_by) && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {form.urgent === "critical" ? "\uD83D\uDD25 " : form.urgent === "yes" ? "\u26A0\uFE0F " : ""}{form.due_by ? formatDate(form.due_by) : ""}
              </span>
            )}
          </p>
          {openSections.requirements && <div className="card-stack">
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <div className="field-block" style={{ backgroundColor: "#f5f5f7", width: "auto", flex: "0 0 auto" }}>
                <div className="field-label">Due date</div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 0 }}>
                  <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Date</span>
                  <div className="date-btn" onClick={(e) => { const inp = e.currentTarget.querySelector("input"); if (!inp) return; const now = Date.now(); const last = parseInt(inp.dataset.lastOpen || "0"); if (now - last < 500) { inp.blur(); inp.dataset.lastOpen = "0"; } else { inp.showPicker(); inp.dataset.lastOpen = String(now); } }}>
                    <span style={{ fontSize: "0.78rem" }}>{formatDate(form.due_by)}</span>
                    <input type="date" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", zIndex: 1 }}
                      value={form.due_by} min={form.survey_date || undefined} onChange={(e) => setForm({ ...form, due_by: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className={`field-block${form.urgent === "" ? " field-block--unset" : ""}`} style={{ backgroundColor: form.urgent !== "" ? "#f0ece4" : "#f5f5f7", width: "auto", flex: "0 0 auto", ...fieldBorder(fieldComplete.urgent) }}>
                <div className="field-label">Priority</div>
                <div className="edit-field d-flex gap-4">
                  {[{ value: "no", label: "Standard" }, { value: "yes", label: "Urgent" }, { value: "critical", label: "Critical" }].map(({ value, label }) => (
                    <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                      <input type="radio" name="urgent" value={value}
                        checked={form.urgent === value}
                        onChange={() => setForm({ ...form, urgent: value })}
                      />
                      <span style={{ fontSize: "0.9rem" }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Notes ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("notes")}>
            <span className={`section-chevron${openSections.notes ? " section-chevron--open" : ""}`}></span>
            Notes
          </p>
          {openSections.notes && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.notes.trim() ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Notes</div>
              <textarea
                className="edit-field"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={160}
                placeholder="e.g. Drainage follow-up"
                rows={2}
                style={{ resize: "none", overflowWrap: "break-word", wordBreak: "normal" }}
              />
            </div>
          </div>}
        </div>

        {/* ---- Actions ---- */}
        <div className="d-flex justify-content-center gap-3 mt-3 flex-wrap">
          <button type="button" onClick={handleDraft} disabled={saving || !canDraft}
            className="btn btn-outline-secondary btn-sm px-3" style={{ opacity: canDraft ? 1 : 0.45 }}>
            Save Draft
          </button>
          <button type="button" disabled={saving || !canActivate}
            className="btn btn-success btn-sm px-3" style={{ opacity: canActivate ? 1 : 0.45 }}
            onClick={async (e) => {
              e.preventDefault();
              if (!canActivate) return;
              setSaving(true);
              setError("");
              try {
                let surveyId = savedId;
                if (!surveyId) {
                  const res = await api.post("/api/surveys/", buildPayload());
                  surveyId = res.data.id;
                  setSavedId(surveyId);
                } else {
                  await api.patch(`/api/surveys/${surveyId}/`, buildPayload());
                }
                await api.patch(`/api/surveys/${surveyId}/`, { status: "open" });
                navigate(`/surveys/${surveyId}`);
              } catch (err) {
                console.error("Activate error:", err.response?.status, err.response?.data);
                const errors = err.response?.data;
                if (errors && typeof errors === "object") {
                  const msgs = Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
                  setError(`Failed to activate survey:\n${msgs}`);
                } else {
                  setError("Failed to activate survey.");
                }
              } finally {
                setSaving(false);
              }
            }}>
            Activate Survey
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="btn btn-outline-secondary btn-sm px-3">
            Cancel
          </button>
        </div>
      </form>

      {showDateConfirmModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => { setShowDateConfirmModal(false); setPendingDate(null); }} />
          <div style={{ position: "relative", backgroundColor: "#fff", borderRadius: 8, padding: "24px 28px", maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8, color: "#1F2A33" }}>
              Has this date been confirmed by the client?
            </p>
            <div className="d-flex justify-content-center gap-3 mt-3">
              <button type="button" className="btn btn-success btn-sm px-4" onClick={() => {
                setForm({ ...form, survey_date: pendingDate, schedule_status: "confirmed" });
                setShowDateConfirmModal(false);
                setPendingDate(null);
              }}>Yes</button>
              <button type="button" className="btn btn-outline-secondary btn-sm px-4" onClick={() => {
                setForm({ ...form, survey_date: pendingDate, schedule_status: "provisional" });
                setShowDateConfirmModal(false);
                setPendingDate(null);
              }}>No</button>
            </div>
          </div>
        </div>
      )}

      {showSurveyorConfirmModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => { setShowSurveyorConfirmModal(false); setPendingDate(null); }} />
          <div style={{ position: "relative", backgroundColor: "#fff", borderRadius: 8, padding: "24px 28px", maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8, color: "#1F2A33" }}>
              Will you be conducting the survey?
            </p>
            <div className="d-flex justify-content-center gap-3 mt-3">
              <button type="button" className="btn btn-success btn-sm px-4" onClick={() => {
                setForm({ ...form, survey_date: pendingDate, schedule_status: "self_scheduled", assigned_to: String(userId) });
                setShowSurveyorConfirmModal(false);
                setPendingDate(null);
              }}>Yes</button>
              <button type="button" className="btn btn-outline-secondary btn-sm px-4" onClick={() => {
                setForm({ ...form, survey_date: pendingDate, schedule_status: "self_scheduled" });
                setShowSurveyorConfirmModal(false);
                setPendingDate(null);
              }}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyCreateForm;
