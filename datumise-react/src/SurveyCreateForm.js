import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";

function SurveyCreateForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [team, setTeam] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    notes: "",
    client: "",
    site: "",
    assigned_to: "",
    schedule_type: "pending",
    scheduled_for: "",
    due_by: "",
  });

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

  const filteredSites = form.client
    ? sites.filter((s) => s.client === parseInt(form.client))
    : sites;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.client) delete payload.client;
      if (!payload.site) delete payload.site;
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.scheduled_for) delete payload.scheduled_for;
      if (!payload.due_by) delete payload.due_by;
      const response = await api.post("/api/surveys/", payload);
      navigate(`/surveys/${response.data.id}`);
    } catch (err) {
      console.error("Failed to create survey:", err);
      setError("Failed to create survey.");
      setSaving(false);
    }
  };

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/surveys" className="text-decoration-none">
          &larr; Back to Surveys
        </Link>
      </div>
      <h5 className="fw-bold mb-3 d-none d-md-block">New Survey</h5>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.client ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Client</legend>
          <select className="edit-field" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value, site: "" })}>
            <option value="">-- Select --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.site ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Site</legend>
          <select className="edit-field" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })}>
            <option value="">-- Select --</option>
            {filteredSites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.assigned_to ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Assigned to</legend>
          <select className="edit-field" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
            <option value="">-- Select --</option>
            {team.map((m) => (
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
          <input type="datetime-local" className="edit-field" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
        </fieldset>

        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.due_by ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Due by</legend>
          <input type="datetime-local" className="edit-field" value={form.due_by} onChange={(e) => setForm({ ...form, due_by: e.target.value })} />
        </fieldset>

        <fieldset className="edit-fieldset mb-3" style={{ backgroundColor: form.notes.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Notes</legend>
          <input type="text" className="edit-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={160} placeholder="e.g. Drainage follow-up" />
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
            onClick={() => navigate("/surveys")}
            className="capture-action-btn"
            aria-label="Cancel"
            style={{ background: "#dce7fa", border: "none" }}
          >
            <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
          </button>
        </div>
      </form>

      <ReturnButton to="/surveys" />
    </div>
  );
}

export default SurveyCreateForm;
