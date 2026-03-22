import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [team, setTeam] = useState([]);
  const [clientFilter, setClientFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    site: "",
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
  const [openSections, setOpenSections] = useState({
    client: true, visit: true, schedule: true, attendees: true, requirements: true, notes: true,
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
    ])
      .then(([clientsRes, sitesRes, teamRes]) => {
        setClients(clientsRes.data.results || clientsRes.data);
        setSites(sitesRes.data.results || sitesRes.data);
        setTeam(teamRes.data.results || teamRes.data);
      })
      .catch((err) => console.error("Failed to load options:", err));
  }, []);

  const vr = form.visit_requirement;
  const isUnrestricted = vr === "unrestricted" || vr === "unrestricted_notify";
  const isPrearranged = vr === "prearranged";
  const isWindow = vr === "prearranged";

  const canDraft = !!form.site;

  const canLaunch = !!(
    form.site &&
    form.visit_requirement &&
    form.arrival_action &&
    form.urgent !== "" &&
    (vr !== "prearranged" || form.scheduled_for)
  );

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
    if (form.schedule_status) p.schedule_status = form.schedule_status;
    p.visit_time = form.visit_time || null;
    p.arrival_action = form.arrival_action || null;
    p.departure_action = form.departure_action || null;
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
    try {
      const res = await api.post("/api/surveys/", buildPayload());
      navigate(`/surveys/${res.data.id}`);
    } catch (err) {
      setError("Failed to save survey.");
      setSaving(false);
    }
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!canLaunch) {
      setError("Complete required setup fields to launch survey.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const createRes = await api.post("/api/surveys/", buildPayload());
      await api.patch(`/api/surveys/${createRes.data.id}/`, { status: "open" });
      navigate(`/surveys/${createRes.data.id}`);
    } catch (err) {
      const errors = err.response?.data;
      if (errors && typeof errors === "object") {
        const msgs = Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
        setError(`Failed to launch survey:\n${msgs}`);
      } else {
        setError("Failed to launch survey.");
      }
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

      {error && <p className="text-danger" style={{ fontSize: "0.85rem", whiteSpace: "pre-line" }}>{error}</p>}

      <form>
        {/* ---- Client Details ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("client")}>
            <span className={`section-chevron${openSections.client ? " section-chevron--open" : ""}`}></span>
            Client details
          </p>
          {openSections.client && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: clientFilter ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
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
            <div className="field-block" style={{ backgroundColor: form.site ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
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
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("visit")}>
            <span className={`section-chevron${openSections.visit ? " section-chevron--open" : ""}`}></span>
            Visit Protocols
          </p>
          {openSections.visit && <div className="card-stack">
            <div className={cardClass("sched_proto", !vr ? " field-block--unset" : "")} style={{ backgroundColor: vr ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              {cardLabel("sched_proto", "Scheduling protocols")}
              <div className="edit-field d-flex gap-4">
                {[{ value: "unrestricted_notify", label: "Unrestricted - notify in advance" }, { value: "unrestricted", label: "Unrestricted - no notification" }, { value: "prearranged", label: "Pre-arrange" }].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="visit_requirement" value={value}
                      checked={vr === value}
                      onChange={() => {
                        const newVr = value;
                        const newSs = (newVr === "unrestricted" || newVr === "unrestricted_notify") ? "self_scheduled" : "";
                        const newVt = newVr === "prearranged" ? "window" : (form.visit_time === "window" ? "" : form.visit_time);
                        setForm({ ...form, visit_requirement: newVr, schedule_status: newSs, visit_time: newVt });
                      }}
                    />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
              {isWindow && (
              <div className={cardClass("window")} style={{ backgroundColor: "#e8e2d8", marginLeft: "1rem", paddingBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {cardLabel("window", "Window")}
                  {(form.scheduled_for || form.window_end_date || form.window_start_end_time || form.window_end_time) && (
                    <button type="button" className="btn btn-outline-secondary" style={{ fontSize: "0.65rem", padding: "2px 8px", lineHeight: 1.2 }}
                      onClick={(e) => { e.stopPropagation(); setForm({ ...form, scheduled_for: "", window_end_date: "", window_start_end_time: "", window_end_time: "" }); }}>
                      Clear all
                    </button>
                  )}
                </div>
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
            <div className={cardClass("site_avail")} style={{ backgroundColor: Object.values(windowDays).some(d => d.on) ? "#f0ece4" : "#f5f5f7" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {cardLabel("site_avail", "Site availability")}
                {Object.values(windowDays).some(d => d.on) && (
                  <button type="button" className="btn btn-outline-secondary" style={{ fontSize: "0.65rem", padding: "2px 8px", lineHeight: 1.2 }}
                    onClick={(e) => { e.stopPropagation(); setWindowDays({ ...EMPTY_WINDOW_DAYS }); }}>
                    Clear all
                  </button>
                )}
              </div>
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

            <div className={cardClass("site_req", !form.site_requirements ? " field-block--unset" : "")} style={{ backgroundColor: form.site_requirements ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
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
            <div className={cardClass("procedures")} style={{ backgroundColor: (form.arrival_action && form.arrival_action !== "none") ? "#f0ece4" : "#f5f5f7", width: "fit-content", gap: 8 }}>
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
          <p className="edit-legend section-toggle" onClick={() => toggle("schedule")}>
            <span className={`section-chevron${openSections.schedule ? " section-chevron--open" : ""}`}></span>
            Survey Date
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
                      onChange={(e) => setForm({ ...form, survey_date: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 0 }}>
                  <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Time</span>
                  <select className="time-btn"
                    value={form.survey_time}
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
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("attendees")}>
            <span className={`section-chevron${openSections.attendees ? " section-chevron--open" : ""}`}></span>
            Attendees
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
            <div className={cardClass("attendees_other")} style={{ backgroundColor: form.other_attendees.length > 0 ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
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
                    checked={form.other_attendees.length === 0}
                    onChange={() => setForm({ ...form, other_attendees: [] })}
                  />
                  <span style={{ fontSize: "0.9rem" }}>None</span>
                </label>
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Deadlines ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("requirements")}>
            <span className={`section-chevron${openSections.requirements ? " section-chevron--open" : ""}`}></span>
            Deadlines
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
              <div className={`field-block${form.urgent === "" ? " field-block--unset" : ""}`} style={{ backgroundColor: form.urgent !== "" ? "#f0ece4" : "#f5f5f7", width: "auto", flex: "0 0 auto" }}>
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
            Save as Draft
          </button>
          <button type="button" onClick={handleLaunch} disabled={saving}
            className="btn btn-success btn-sm px-3" style={{ opacity: canLaunch ? 1 : 0.45 }}>
            Launch Survey
          </button>
          <button type="button" onClick={() => navigate(-1)} className="capture-action-btn" aria-label="Cancel" style={{ background: "#dce7fa", border: "none" }}>
            <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
          </button>
        </div>
      </form>
    </div>
  );
}

export default SurveyCreateForm;
