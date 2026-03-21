import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "./api/api";

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

function DayTimeRow({ dayKey, label, checked, time, onToggle, onTime }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-1">
      <label className="d-flex align-items-center gap-2" style={{ cursor: "pointer", minWidth: 110 }}>
        <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
        <span style={{ fontSize: "0.88rem" }}>{label}</span>
      </label>
      {checked && (
        <select
          className="edit-field"
          style={{ flex: "0 0 auto", fontSize: "0.85rem" }}
          value={time}
          onChange={(e) => onTime(e.target.value)}
        >
          <option value="">Any time</option>
          {TIME_OPTIONS.map(({ value, label: tLabel }) => (
            <option key={value} value={value}>{tLabel}</option>
          ))}
        </select>
      )}
    </div>
  );
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
    window_end_date: "",
    window_end_time: "",
    window_start_end_time: "",
    due_by: "",
    schedule_status: "",
    visit_time: "",
    arrival_action: "",
    departure_action: "",
    urgent: "",
    notify_required: "",
    client_present: false,
    notes: "",
  });

  const [windowDays, setWindowDays] = useState({ ...EMPTY_WINDOW_DAYS });

  useEffect(() => {
    document.body.style.backgroundColor = "#E2DDD3";
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
  const isUnrestricted = vr === "unrestricted";
  const isPrearranged = vr === "prearranged";
  const showScheduling = isUnrestricted || isPrearranged;
  const showBookingStatus = isPrearranged && !!form.scheduled_for;
  const isWindow = form.visit_time === "window";

  const visitTimeOptions = [
    { value: "anytime", label: "Anytime", disabled: isPrearranged },
    { value: "window", label: "Appointment Window", disabled: false },
  ];

  const canDraft = !!form.site;

  const canLaunch = !!(
    form.site &&
    form.visit_requirement &&
    form.visit_time &&
    form.arrival_action &&
    form.departure_action &&
    form.urgent !== "" &&
    (form.visit_time !== "window" || form.scheduled_for)
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
    if (form.visit_requirement) p.visit_requirement = form.visit_requirement;
    if (form.scheduled_for) p.scheduled_for = form.scheduled_for;
    if (form.window_end_date) p.window_end_date = form.window_end_date;
    if (form.window_end_time) p.window_end_time = form.window_end_time;
    if (form.window_start_end_time) p.window_start_end_time = form.window_start_end_time;
    if (form.due_by) p.due_by = form.due_by;
    if (form.schedule_status) p.schedule_status = form.schedule_status;
    if (form.visit_time) p.visit_time = form.visit_time;
    if (form.arrival_action) p.arrival_action = form.arrival_action;
    if (form.departure_action) p.departure_action = form.departure_action;
    if (form.urgent === "yes") p.urgent = true;
    else if (form.urgent === "no") p.urgent = false;
    if (form.notify_required === "yes") p.notify_required = true;
    else if (form.notify_required === "no") p.notify_required = false;
    p.client_present = form.client_present;
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

  const unset = (val) => !val;
  const fbClass = (val, mb = "mb-2") => `field-block ${mb}${unset(val) ? " field-block--unset" : ""}`;
  const fsBg = (val) => ({ backgroundColor: val ? "#f0ece4" : "#f5f5f7" });
  const fieldClass = (val) => `edit-field${unset(val) ? " edit-field--unset" : ""}`;

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/surveys" className="text-decoration-none">&larr; Back to Surveys</Link>
      </div>
      <h5 className="fw-bold mb-3 d-none d-md-block">New Survey</h5>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem", whiteSpace: "pre-line" }}>{error}</p>}

      <form>
        {/* ---- Client Details ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#FAF8F3", padding: "0 0 0.35rem" }}>
          <p className="edit-legend">Client details</p>
          <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: clientFilter ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Client</div>
              <select className="edit-field" value={clientFilter} onChange={(e) => { setClientFilter(e.target.value); setForm({ ...form, site: "" }); }}>
                <option value="">All clients</option>
                {clients.map((c) => {
                  const selectable = isClientSelectable(c);
                  return (
                    <option key={c.id} value={c.id} disabled={!selectable}
                      style={{ color: selectable ? undefined : "#c0392b", fontStyle: selectable ? undefined : "italic" }}>
                      {c.name}{c.status !== "active" ? " (archived)" : !clientHasActiveSite(c.id) ? " (no sites)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="field-block" style={{ backgroundColor: form.site ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Site</div>
              <select className="edit-field" value={form.site} onChange={(e) => {
                const s = sites.find((x) => x.id === parseInt(e.target.value));
                if (s) setClientFilter(String(s.client));
                setForm({ ...form, site: e.target.value });
              }}>
                <option value="">-- Select site --</option>
                {filteredSites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ---- Visit Controls ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#FAF8F3", padding: "0 0 0.35rem" }}>
          <p className="edit-legend">Visit controls</p>
          <div className="card-stack">
            <div className={`field-block${!vr ? " field-block--unset" : ""}`} style={{ backgroundColor: vr ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Visit requirement</div>
              <div className="edit-field d-flex gap-4">
                {[{ value: "unrestricted", label: "Unrestricted" }, { value: "prearranged", label: "Pre-arranged" }].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="visit_requirement" value={value}
                      checked={vr === value}
                      onChange={() => {
                        const newVr = value;
                        const newSs = newVr === "unrestricted" ? "self_scheduled" : "";
                        const badTime = (newVr === "unrestricted" && form.visit_time === "appointment") || (newVr === "prearranged" && form.visit_time === "anytime");
                        setForm({ ...form, visit_requirement: newVr, schedule_status: newSs, visit_time: badTime ? "" : form.visit_time });
                      }}
                    />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={`field-block${!form.visit_time ? " field-block--unset" : ""} mb-0`} style={{ backgroundColor: form.visit_time ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Visit pattern</div>
              <div className="edit-field d-flex gap-4 flex-wrap">
                {visitTimeOptions.map(({ value, label, disabled }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1 }}>
                    <input type="radio" name="visit_time" value={value}
                      checked={form.visit_time === value}
                      disabled={disabled}
                      onChange={() => setForm({ ...form, visit_time: value })}
                    />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
              {isWindow && (
              <div className="field-block" style={{ backgroundColor: "#e8e2d8", marginLeft: "1rem", paddingBottom: "0.75rem" }}>
                <div className="field-label">Appointment Window</div>
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
                  <div key={title} className="field-block" style={{ backgroundColor: bgColor, minWidth: "11.5rem" }}>
                    <div className="field-label">{title}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Date</span>
                      <div style={{ position: "relative", cursor: "pointer", width: "5.4rem", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M0 7.33l2.829-2.83 9.175 9.339 9.167-9.339 2.829 2.83-11.996 12.17z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.1rem center", backgroundSize: "10px", paddingRight: "1.2rem", textAlign: "right" }}>
                        <span style={{ fontSize: "0.78rem" }}>{formatDate(dateVal)}</span>
                        <input type="date" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
                          value={dateVal} min={minDate || undefined} onChange={(e) => onDate(e.target.value)} />
                      </div>
                    </div>
                    {showStart && (
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Start</span>
                        <div style={{ display: "inline-flex", alignItems: "baseline" }}>
                          <select className="edit-field"
                            style={{ fontSize: "0.78rem", padding: "0 2px", marginBottom: 0, appearance: "none", textAlignLast: "right", width: "5.4rem", backgroundPosition: "right 0.1rem center", paddingRight: "1.2rem" }}
                            value={form.scheduled_for ? form.scheduled_for.slice(11, 16) : ""}
                            onChange={(e) => { const t = e.target.value; const d = form.scheduled_for ? form.scheduled_for.slice(0, 10) : ""; if (d) setForm({ ...form, scheduled_for: `${d}T${t}` }); }}>
                            <option value="">— no time</option>
                            {TIME_OPTIONS.filter(({ value }) => value >= "09:00").map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    {showEnd && (
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>End</span>
                        <div style={{ display: "inline-flex", alignItems: "baseline" }}>
                          <select className="edit-field"
                            style={{ fontSize: "0.78rem", padding: "0 2px", marginBottom: 0, appearance: "none", textAlignLast: "right", width: "5.4rem", backgroundPosition: "right 0.1rem center", paddingRight: "1.2rem" }}
                            value={endTimeVal}
                            onChange={(e) => onEndTime(e.target.value)}>
                            <option value="">— no time</option>
                            {TIME_OPTIONS.filter(({ value }) => value >= "09:00").map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
              ))}
              </div>
              </div>
              )}
            </div>
            <div className="field-block" style={{ backgroundColor: "#f0ece4" }}>
              <div className="field-label">Days of week</div>
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
                            <span style={{ fontSize: "0.7rem", color: "#888", flexShrink: 0 }}>Start</span>
                            <TimePicker value={day.timeStart} defaultValue="09:00"
                              className="edit-field" style={{ fontSize: "0.78rem", padding: "0 2px", marginBottom: 0, marginLeft: "auto", width: "5.2rem", marginRight: -3 }}
                              onChange={(v) => setWindowDays({ ...windowDays, [key]: { ...day, timeStart: v } })} />
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                            <span style={{ fontSize: "0.7rem", color: "#888", flexShrink: 0 }}>End</span>
                            <TimePicker value={day.timeEnd} defaultValue="09:00"
                              className="edit-field" style={{ fontSize: "0.78rem", padding: "0 2px", marginBottom: 0, marginLeft: "auto", width: "5.2rem", marginRight: -3 }}
                              onChange={(v) => setWindowDays({ ...windowDays, [key]: { ...day, timeEnd: v } })} />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={`field-block${!form.arrival_action ? " field-block--unset" : ""}`} style={{ backgroundColor: form.arrival_action ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Arrival action</div>
              <div className="edit-field d-flex gap-4">
                {["reception", "none"].map((val) => (
                  <label key={val} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="arrival_action" value={val}
                      checked={form.arrival_action === val}
                      onChange={() => setForm({ ...form, arrival_action: val })}
                    />
                    <span style={{ textTransform: "capitalize" }}>{val}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={`field-block${!form.departure_action ? " field-block--unset" : ""}`} style={{ backgroundColor: form.departure_action ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Departure action</div>
              <div className="edit-field d-flex gap-4">
                {["reception", "none"].map((val) => (
                  <label key={val} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="departure_action" value={val}
                      checked={form.departure_action === val}
                      onChange={() => setForm({ ...form, departure_action: val })}
                    />
                    <span style={{ textTransform: "capitalize" }}>{val}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={`field-block${form.notify_required === "" ? " field-block--unset" : ""}`} style={{ backgroundColor: form.notify_required !== "" ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Notify required</div>
              <div className="edit-field d-flex gap-4">
                {[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="notify_required" value={value}
                      checked={form.notify_required === value}
                      onChange={() => setForm({ ...form, notify_required: value })}
                    />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---- Survey Schedule ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#FAF8F3", padding: "0 0 0.35rem" }}>
          <p className="edit-legend">Survey Schedule</p>
          <div className="card-stack">
            <div style={{ display: "flex", justifyContent: "flex-start", gap: 6, alignItems: "flex-start" }}>
              <div className="field-block" style={{ backgroundColor: "#f5f5f7", minWidth: "11.5rem" }}>
                <div className="field-label">Survey Date</div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Date</span>
                  <div style={{ position: "relative", cursor: "pointer", width: "5.4rem", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M0 7.33l2.829-2.83 9.175 9.339 9.167-9.339 2.829 2.83-11.996 12.17z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.1rem center", backgroundSize: "10px", paddingRight: "1.2rem", textAlign: "right" }}>
                    <span style={{ fontSize: "0.78rem" }}>{formatDate(form.scheduled_for ? form.scheduled_for.slice(0, 10) : "")}</span>
                    <input type="date" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
                      value={form.scheduled_for ? form.scheduled_for.slice(0, 10) : ""}
                      onChange={(e) => {
                        const date = e.target.value;
                        const time = form.scheduled_for ? form.scheduled_for.slice(11, 16) : "09:00";
                        setForm({ ...form, scheduled_for: date ? `${date}T${time}` : "", schedule_status: !date && isPrearranged ? "" : form.schedule_status });
                      }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 0 }}>
                  <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Time</span>
                  <div style={{ display: "inline-flex", alignItems: "baseline" }}>
                    <select className="edit-field"
                      style={{ fontSize: "0.78rem", padding: "0 2px", marginBottom: 0, appearance: "none", textAlignLast: "right", width: "5.4rem", backgroundPosition: "right 0.1rem center", paddingRight: "1.2rem" }}
                      value={form.scheduled_for ? form.scheduled_for.slice(11, 16) : ""}
                      onChange={(e) => { const t = e.target.value; const d = form.scheduled_for ? form.scheduled_for.slice(0, 10) : ""; if (d) setForm({ ...form, scheduled_for: `${d}T${t}` }); }}>
                      <option value="">— no time</option>
                      {TIME_OPTIONS.filter(({ value }) => value >= "09:00").map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className={`field-block${!form.schedule_status ? " field-block--unset" : ""}`} style={{ backgroundColor: form.schedule_status ? "#f0ece4" : "#f5f5f7", minWidth: "11.5rem" }}>
                <div className="field-label">Booking status</div>
                <select className={`edit-field${!form.schedule_status ? " edit-field--unset" : ""}`} value={form.schedule_status} onChange={(e) => setForm({ ...form, schedule_status: e.target.value })}>
                  <option value="">Not confirmed</option>
                  <option value="provisional">Provisional</option>
                  <option value="booked">Booked</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Attendees ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#FAF8F3", padding: "0 0 0.35rem" }}>
          <p className="edit-legend">Attendees</p>
          <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.assigned_to ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Assigned to</div>
              <select className="edit-field" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">-- Select --</option>
                {team.filter((m) => m.role === "surveyor").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="field-block" style={{ backgroundColor: form.client_present ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Client attending</div>
              <label className="edit-field d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={form.client_present} onChange={(e) => setForm({ ...form, client_present: e.target.checked })} />
                <span>{form.client_present ? "Yes" : "No"}</span>
              </label>
            </div>
          </div>
        </div>

        {/* ---- Survey Requirements ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#FAF8F3", padding: "0 0 0.35rem" }}>
          <p className="edit-legend">Survey requirements</p>
          <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: "#f5f5f7", minWidth: "11.5rem" }}>
              <div className="field-label">Report due by</div>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 0 }}>
                <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "2.5rem" }}>Date</span>
                <div style={{ position: "relative", cursor: "pointer", width: "5.4rem", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M0 7.33l2.829-2.83 9.175 9.339 9.167-9.339 2.829 2.83-11.996 12.17z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.1rem center", backgroundSize: "10px", paddingRight: "1.2rem", textAlign: "right" }}>
                  <span style={{ fontSize: "0.78rem" }}>{formatDate(form.due_by)}</span>
                  <input type="date" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
                    value={form.due_by} onChange={(e) => setForm({ ...form, due_by: e.target.value })} />
                </div>
              </div>
            </div>
            <div className={`field-block${form.urgent === "" ? " field-block--unset" : ""}`} style={{ backgroundColor: form.urgent !== "" ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Urgent</div>
              <select className={`edit-field${form.urgent === "" ? " edit-field--unset" : ""}`} value={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.value })}>
                <option value="">Not confirmed</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="field-block" style={{ backgroundColor: form.notes.trim() ? "#f0ece4" : "#f5f5f7" }}>
              <div className="field-label">Notes</div>
              <input type="text" className="edit-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={160} placeholder="e.g. Drainage follow-up" />
            </div>
          </div>
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
