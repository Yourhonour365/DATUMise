import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
function TeamEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const response = await api.get(`/api/team/${id}/`);
        const m = response.data;
        setForm({
          first_name: m.name.split(" ")[0] || "",
          last_name: m.name.split(" ").slice(1).join(" ") || "",
          email: m.email || "",
          phone: m.phone || "",
          role: m.role || "surveyor",
          status: m.status || "active",
        });
      } catch (err) {
        console.error("Failed to fetch team member:", err);
        setError("Failed to load team member.");
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/team/${id}/`, form);
      navigate(`/team/${id}`);
    } catch (err) {
      console.error("Failed to update team member:", err);
      setError("Failed to save changes.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mt-4">
        <p className="text-danger">{error || "Team member not found."}</p>
        <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => navigate("/team")}>Back to Team</button>
      </div>
    );
  }

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/team" className="text-decoration-none">
          &larr; Back to Team
        </Link>
      </div>
      <h5 className="fw-bold mb-3 d-none d-md-block">Edit Team Member</h5>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.first_name.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">First name</legend>
          <input type="text" className="edit-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.last_name.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Last name</legend>
          <input type="text" className="edit-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.email.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Email</legend>
          <input type="email" className="edit-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.phone.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Phone</legend>
          <input type="text" className="edit-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: "#f0ece4" }}>
          <legend className="edit-legend">Role</legend>
          <select className="edit-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="office">Office</option>
            <option value="surveyor">Surveyor</option>
          </select>
        </fieldset>
        <fieldset className="edit-fieldset mb-3" style={{ backgroundColor: "#f0ece4" }}>
          <legend className="edit-legend">Status</legend>
          <select className="edit-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
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
            onClick={() => navigate("/team")}
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

export default TeamEditForm;
