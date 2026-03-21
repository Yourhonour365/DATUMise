import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "./api/api";

function ClientCreateForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sitePrompt, setSitePrompt] = useState(null);
  const [openSections, setOpenSections] = useState({ details: true, address: true, contact: true, status: true });
  const toggle = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const [form, setForm] = useState({
    name: "",
    client_type: "",
    account_manager: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    billing_line_1: "",
    billing_line_2: "",
    billing_city: "",
    billing_county: "",
    billing_postcode: "",
    status: "active",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { billing_line_1, billing_line_2, billing_city, billing_county, billing_postcode, ...rest } = form;
      const billing_address = [billing_line_1, billing_line_2, billing_city, billing_county, billing_postcode].filter(Boolean).join("\n");
      const payload = { ...rest, billing_address };
      if (!payload.client_type) delete payload.client_type;
      if (!payload.account_manager) delete payload.account_manager;
      if (!payload.contact_name) delete payload.contact_name;
      if (!payload.contact_email) delete payload.contact_email;
      if (!payload.contact_phone) delete payload.contact_phone;
      if (!payload.billing_address) delete payload.billing_address;
      const response = await api.post("/api/clients/", payload);
      setSitePrompt(response.data.id);
      setSaving(false);
    } catch (err) {
      console.error("Failed to create client:", err);
      setError("Failed to create client.");
      setSaving(false);
    }
  };

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/clients" className="text-decoration-none">
          &larr; Back to Clients
        </Link>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3 d-none d-md-flex">
        <h5 className="fw-bold mb-0">New Client</h5>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ details: true, address: true, contact: true, status: true })}>Open all</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ details: false, address: false, contact: false, status: false })}>Close all</button>
        </div>
      </div>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* ---- Client Details ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("details")}>
            <span className={`section-chevron${openSections.details ? " section-chevron--open" : ""}`}></span>
            Client Details
          </p>
          {openSections.details && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Name</div>
              <input type="text" className="edit-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field-block" style={{ backgroundColor: form.client_type ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Client type</div>
              <div className="edit-field d-flex gap-4 flex-wrap">
                {[{ value: "commercial", label: "Commercial" }, { value: "local_authority", label: "Local authority" }, { value: "education", label: "Education" }, { value: "retail", label: "Retail" }, { value: "residential", label: "Residential portfolio" }].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="client_type" value={value} checked={form.client_type === value} onChange={() => setForm({ ...form, client_type: value })} />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Client Address ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("address")}>
            <span className={`section-chevron${openSections.address ? " section-chevron--open" : ""}`}></span>
            Client Address
          </p>
          {openSections.address && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: (form.billing_line_1 || form.billing_city || form.billing_postcode) ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>Line 1</div>
                <input type="text" className="edit-field" value={form.billing_line_1} onChange={(e) => setForm({ ...form, billing_line_1: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>Line 2</div>
                <input type="text" className="edit-field" value={form.billing_line_2} onChange={(e) => setForm({ ...form, billing_line_2: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>City</div>
                <input type="text" className="edit-field" value={form.billing_city} onChange={(e) => setForm({ ...form, billing_city: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>County</div>
                <input type="text" className="edit-field" value={form.billing_county} onChange={(e) => setForm({ ...form, billing_county: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>Post code</div>
                <input type="text" className="edit-field" value={form.billing_postcode} onChange={(e) => setForm({ ...form, billing_postcode: e.target.value })} />
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Client Contact ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("contact")}>
            <span className={`section-chevron${openSections.contact ? " section-chevron--open" : ""}`}></span>
            Client Contact
          </p>
          {openSections.contact && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.contact_name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Name</div>
              <input type="text" className="edit-field" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.contact_email.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Email</div>
              <input type="email" className="edit-field" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.contact_phone.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Phone</div>
              <input type="text" className="edit-field" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
          </div>}
        </div>

        {/* ---- Client Status ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("status")}>
            <span className={`section-chevron${openSections.status ? " section-chevron--open" : ""}`}></span>
            Client Status
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

      {sitePrompt && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: "1.5rem 2rem", maxWidth: 400, textAlign: "center" }}>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No sites added</p>
            <p style={{ fontSize: "0.88rem", color: "#555", marginBottom: "1.25rem" }}>Please add at least one site to this client's portfolio.</p>
            <div className="d-flex justify-content-center gap-3">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`/clients/${sitePrompt}`)}>
                Save without site
              </button>
              <button type="button" className="btn btn-success btn-sm" onClick={() => navigate(`/clients/${sitePrompt}/sites/new`)}>
                Add site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientCreateForm;
