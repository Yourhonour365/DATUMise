import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";

function SurveyEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [team, setTeam] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    notes: "",
    client: "",
    site: "",
    assigned_to: "",
    schedule_type: "pending",
    scheduled_for: "",
    due_by: "",
    client_present: false,
    urgent: false,
  });

  useEffect(() => {
    Promise.all([
      api.get(`/api/surveys/${id}/`),
      api.get("/api/clients/"),
      api.get("/api/sites/"),
      api.get("/api/team/"),
    ])
      .then(([surveyRes, clientsRes, sitesRes, teamRes]) => {
        const s = surveyRes.data;
        setClients(clientsRes.data.results || clientsRes.data);
        setSites(sitesRes.data.results || sitesRes.data);
        setTeam(teamRes.data.results || teamRes.data);
        setForm({
          notes: s.notes || "",
          client: s.client_id || "",
          site: s.site_id || "",
          assigned_to: s.assigned_to_id || "",
          schedule_type: s.schedule_type || "pending",
          scheduled_for: s.scheduled_for ? s.scheduled_for.slice(0, 16) : "",
          due_by: s.due_by ? s.due_by.slice(0, 16) : "",
          client_present: s.client_present || false,
          urgent: s.urgent || false,
        });
      })
      .catch((err) => {
        console.error("Failed to load survey:", err);
        setError("Failed to load survey.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const activeClients = clients.filter((c) => c.status === "active");
  const activeSites = sites.filter((s) => s.status === "active");
  const filteredSites = form.client
    ? activeSites.filter((s) => s.client === parseInt(form.client))
    : [];

  const clientOptions = form.client && !activeClients.some((c) => c.id === parseInt(form.client))
    ? [...activeClients, ...clients.filter((c) => c.id === parseInt(form.client))]
    : activeClients;
  const siteOptions = form.site && !filteredSites.some((s) => s.id === parseInt(form.site))
    ? [...filteredSites, ...sites.filter((s) => s.id === parseInt(form.site))]
    : filteredSites;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    if ((form.schedule_type === "scheduled" || form.schedule_type === "provisional") && !form.scheduled_for) {
      setError("A planned date is required when scheduling status is scheduled or provisional.");
      setSaving(false);
      return;
    }
    try {
      const payload = { ...form };
      if (!payload.client) payload.client = null;
      if (!payload.site) payload.site = null;
      if (!payload.assigned_to) payload.assigned_to = null;
      if (!payload.scheduled_for) payload.scheduled_for = null;
      if (!payload.due_by) payload.due_by = null;
      await api.patch(`/api/surveys/${id}/`, payload);
      navigate(`/surveys/${id}`);
    } catch (err) {
      console.error("Failed to update survey:", err);
      setError("Failed to update survey.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <p className="text-muted">Loading survey...</p>
      </div>
    );
  }

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3">
        <Link to="/surveys" className="text-decoration-none">
          &larr; Back to Surveys
        </Link>
      </div>
      <h5 className="fw-bold mb-3 d-none d-md-block">Edit Survey</h5>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.client ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Client</legend>
          <select className="edit-field" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value, site: "" })}>
            <option value="">-- Select --</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.status !== "active" ? " (archived)" : ""}</option>
            ))}
          </select>
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.site ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Site</legend>
          <select className="edit-field" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })}>
            <option value="">-- Select --</option>
            {siteOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.status !== "active" ? " (archived)" : ""}</option>
            ))}
          </select>
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.assigned_to ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Assigned to</legend>
          <select className="edit-field" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
            <option value="">-- Select --</option>
            {team.filter((m) => m.role === "surveyor").map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: "#f0ece4" }}>
          <legend className="edit-legend">Schedule type</legend>
          <select className="edit-field" value={form.schedule_type} onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="provisional">Provisional</option>
            <option value="self_scheduling">Self-scheduling</option>
          </select>
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.scheduled_for ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Scheduled for</legend>
          <input type={form.schedule_type === "pending" ? "date" : "datetime-local"} className="edit-field" value={form.schedule_type === "pending" ? form.scheduled_for.slice(0, 10) : form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.due_by ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Due by</legend>
          <input type={form.schedule_type === "pending" ? "date" : "datetime-local"} className="edit-field" value={form.schedule_type === "pending" ? form.due_by.slice(0, 10) : form.due_by} onChange={(e) => setForm({ ...form, due_by: e.target.value })} />
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.notes.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Notes</legend>
          <input type="text" className="edit-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={160} placeholder="e.g. Drainage follow-up" />
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.client_present ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Client attending</legend>
          <label className="edit-field d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={form.client_present} onChange={(e) => setForm({ ...form, client_present: e.target.checked })} />
            <span>{form.client_present ? "Yes" : "No"}</span>
          </label>
        </fieldset>

        <fieldset className="edit-fieldset mb-3" style={{ backgroundColor: form.urgent ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Urgent</legend>
          <label className="edit-field d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} />
            <span>{form.urgent ? "Yes" : "No"}</span>
          </label>
        </fieldset>

        <div className="d-flex justify-content-center gap-4 mt-3">
          <button
            type="submit"
            disabled={saving}
            className="capture-action-btn"
            aria-label="Save"
            style={{ background: "#008000", border: "none" }}
          >
            <img src="/datumise-confirm.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/surveys/${id}`)}
            className="capture-action-btn"
            aria-label="Cancel"
            style={{ background: "#dce7fa", border: "none" }}
          >
            <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
          </button>
        </div>
      </form>

    </div>
  );
}

export default SurveyEditForm;
