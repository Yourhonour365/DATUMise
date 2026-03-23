import { useState, useEffect } from "react";
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
    role: "",
    status: "active",
  });

  useEffect(() => {
    document.body.style.backgroundColor = "#f5f5f7";
    return () => { document.body.style.backgroundColor = ""; };
  }, []);

  // Mandatory fields
  const fieldComplete = {
    username: !!form.username.trim(),
    first_name: !!form.first_name.trim(),
    last_name: !!form.last_name.trim(),
    email: !!form.email.trim(),
  };
  const canSave = fieldComplete.username && fieldComplete.first_name && fieldComplete.last_name && fieldComplete.email;
  const incompleteBorder = { borderLeft: "4px solid #db440a" };
  const fieldBorder = (complete) => complete ? {} : incompleteBorder;

  const sectionBorder = (key) => {
    if (key === "name") return (fieldComplete.username && fieldComplete.first_name && fieldComplete.last_name) ? {} : incompleteBorder;
    if (key === "contact") return fieldComplete.email ? {} : incompleteBorder;
    return {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.phone) delete payload.phone;
      if (!payload.role) delete payload.role;
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
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("name") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("name")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.name ? " section-chevron--open" : ""}`}></span>
            <span>Name</span>
            {!openSections.name && (form.first_name || form.last_name) && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {[form.first_name, form.last_name].filter(Boolean).join(" ")}
              </span>
            )}
          </p>
          {openSections.name && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.username.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.username) }}>
              <div className="field-label">Username</div>
              <input type="text" className="edit-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.first_name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.first_name) }}>
              <div className="field-label">First name</div>
              <input type="text" className="edit-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.last_name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.last_name) }}>
              <div className="field-label">Last name</div>
              <input type="text" className="edit-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.role ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
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
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("contact") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("contact")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.contact ? " section-chevron--open" : ""}`}></span>
            <span>Contact Details</span>
            {!openSections.contact && form.email && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {form.email}
              </span>
            )}
          </p>
          {openSections.contact && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.phone.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Phone</div>
              <input type="text" className="edit-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.email.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.email) }}>
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

        {/* ---- Actions ---- */}
        <div className="d-flex justify-content-center gap-3 mt-3 flex-wrap">
          <button type="submit" disabled={saving || !canSave}
            className="btn btn-outline-secondary btn-sm px-3" style={{ opacity: canSave ? 1 : 0.45 }}>
            Save
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="btn btn-outline-secondary btn-sm px-3">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default TeamCreateForm;
