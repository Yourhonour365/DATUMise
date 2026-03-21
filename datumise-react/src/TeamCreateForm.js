import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "./api/api";

function TeamCreateForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState({ name: true, contact: false, status: false });
  const toggle = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

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
      const errors = err.response?.data;
      if (errors && typeof errors === "object") {
        const msgs = Object.entries(errors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\n");
        setError(`Failed to create team member:\n${msgs}`);
      } else {
        setError("Failed to create team member.");
      }
      setSaving(false);
    }
  };

  return (
    <div className="container mt-3 px-3" style={{ paddingBottom: "50vh" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to="/team" className="text-decoration-none">
          &larr; Back to Team
        </Link>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3 d-none d-md-flex">
        <h5 className="fw-bold mb-0">New Team Member</h5>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ name: true, contact: true, status: true })}>Open all</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ name: false, contact: false, status: false })}>Close all</button>
        </div>
      </div>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem", whiteSpace: "pre-line" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* ---- Name ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("name")}>
            <span className={`section-chevron${openSections.name ? " section-chevron--open" : ""}`}></span>
            Name
          </p>
          {openSections.name && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.username.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Username</div>
              <input type="text" className="edit-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div className="field-block" style={{ backgroundColor: form.first_name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">First name</div>
              <input type="text" className="edit-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.last_name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Last name</div>
              <input type="text" className="edit-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: "#f0ece4", width: "fit-content" }}>
              <div className="field-label">Role</div>
              <div className="edit-field d-flex gap-4">
                {[{ value: "admin", label: "Admin" }, { value: "office", label: "Office" }, { value: "surveyor", label: "Surveyor" }].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="role" value={value} checked={form.role === value} onChange={() => setForm({ ...form, role: value })} />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Contact Details ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("contact")}>
            <span className={`section-chevron${openSections.contact ? " section-chevron--open" : ""}`}></span>
            Contact Details
          </p>
          {openSections.contact && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.phone.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Phone</div>
              <input type="text" className="edit-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.email.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Email</div>
              <input type="email" className="edit-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>}
        </div>

        {/* ---- Status ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("status")}>
            <span className={`section-chevron${openSections.status ? " section-chevron--open" : ""}`}></span>
            Status
          </p>
          {openSections.status && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: "#f0ece4", width: "fit-content" }}>
              <div className="edit-field d-flex gap-4">
                {[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="status" value={value} checked={form.status === value} onChange={() => setForm({ ...form, status: value })} />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>}
        </div>

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
