import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "./api/api";

function TeamCreateForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "surveyor",
    status: "active",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.first_name) delete payload.first_name;
      if (!payload.last_name) delete payload.last_name;
      if (!payload.email) delete payload.email;
      if (!payload.phone) delete payload.phone;
      const response = await api.post("/api/team/", payload);
      navigate(`/team/${response.data.id}`);
    } catch (err) {
      console.error("Failed to create team member:", err);
      if (err.response?.data?.username) {
        setError(err.response.data.username[0] || "Username already exists.");
      } else {
        setError("Failed to create team member.");
      }
      setSaving(false);
    }
  };

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/team" className="text-decoration-none">
          &larr; Back to Team
        </Link>
      </div>
      <h5 className="fw-bold mb-3 d-none d-md-block">New Team Member</h5>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.username.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Username</legend>
          <input type="text" className="edit-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </fieldset>
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
            onClick={() => navigate(-1)}
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

export default TeamCreateForm;
