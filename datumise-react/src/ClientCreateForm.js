import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "./api/api";

function ClientCreateForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sitePrompt, setSitePrompt] = useState(null);
  const [openSections, setOpenSections] = useState({ details: true, address: false, contact: false, status: false });
  const toggle = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const [form, setForm] = useState({
    name: "",
    client_type: "",
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

  useEffect(() => {
    document.body.style.backgroundColor = "#f5f5f7";
    return () => { document.body.style.backgroundColor = ""; };
  }, []);

  const fieldComplete = {
    name: !!form.name.trim(),
    billing_line_1: !!form.billing_line_1.trim(),
    billing_postcode: !!form.billing_postcode.trim(),
  };
  const canSave = fieldComplete.name && fieldComplete.billing_line_1 && fieldComplete.billing_postcode;
  const incompleteBorder = { borderLeft: "4px solid #db440a" };
  const fieldBorder = (complete) => complete ? {} : incompleteBorder;

  const sectionBorder = (key) => {
    if (key === "details") return fieldComplete.name ? {} : incompleteBorder;
    if (key === "address") return (fieldComplete.billing_line_1 && fieldComplete.billing_postcode) ? {} : incompleteBorder;
    return {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const { billing_line_1, billing_line_2, billing_city, billing_county, billing_postcode, ...rest } = form;
      const billing_address = [billing_line_1, billing_line_2, billing_city, billing_county, billing_postcode].filter(Boolean).join("\n");
      const payload = { ...rest, billing_address };
      if (!payload.client_type) delete payload.client_type;
      if (!payload.contact_name) delete payload.contact_name;
      if (!payload.contact_email) delete payload.contact_email;
      if (!payload.contact_phone) delete payload.contact_phone;
      if (!payload.billing_address) delete payload.billing_address;
      const response = await api.post("/api/clients/", payload);
      setSitePrompt(response.data.id);
      setSaving(false);
    } catch (err) {
      console.error("Failed to create client:", err);
      const errors = err.response?.data;
      if (errors && typeof errors === "object") {
        const msgs = Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
        setError(`Failed to create client:\n${msgs}`);
      } else {
        setError("Failed to create client.");
      }
      setSaving(false);
    }
  };

  return (
    <div className="container mt-3 px-3" style={{ paddingBottom: "50vh" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to="/clients" className="text-decoration-none">&larr; Back to Clients</Link>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3 d-none d-md-flex">
        <h5 className="fw-bold mb-0">New Client</h5>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ details: true, address: true, contact: true, status: true })}>Open all</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ details: false, address: false, contact: false, status: false })}>Close all</button>
        </div>
      </div>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem", whiteSpace: "pre-line" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* ---- Client Details ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("details") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("details")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.details ? " section-chevron--open" : ""}`}></span>
            <span>Client Details</span>
            {!openSections.details && form.name && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {form.name}
              </span>
            )}
          </p>
          {openSections.details && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.name) }}>
              <div className="field-label">Client Name</div>
              <input type="text" className="edit-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("address") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("address")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.address ? " section-chevron--open" : ""}`}></span>
            <span>Client Address</span>
            {!openSections.address && (form.billing_line_1 || form.billing_postcode) && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {[form.billing_line_1, form.billing_postcode].filter(Boolean).join(", ")}
              </span>
            )}
          </p>
          {openSections.address && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.billing_line_1.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.billing_line_1) }}>
              <div className="field-label">Line 1</div>
              <input type="text" className="edit-field" value={form.billing_line_1} onChange={(e) => setForm({ ...form, billing_line_1: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.billing_line_2.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Line 2</div>
              <input type="text" className="edit-field" value={form.billing_line_2} onChange={(e) => setForm({ ...form, billing_line_2: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.billing_city.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">City</div>
              <input type="text" className="edit-field" value={form.billing_city} onChange={(e) => setForm({ ...form, billing_city: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.billing_county.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">County</div>
              <input type="text" className="edit-field" value={form.billing_county} onChange={(e) => setForm({ ...form, billing_county: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.billing_postcode.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.billing_postcode) }}>
              <div className="field-label">Post code</div>
              <input type="text" className="edit-field" value={form.billing_postcode} onChange={(e) => setForm({ ...form, billing_postcode: e.target.value })} />
            </div>
          </div>}
        </div>

        {/* ---- Client Contact ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("contact")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.contact ? " section-chevron--open" : ""}`}></span>
            <span>Client Contact</span>
            {!openSections.contact && form.contact_name && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {form.contact_name}
              </span>
            )}
          </p>
          {openSections.contact && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.contact_name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Name</div>
              <input type="text" className="edit-field" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.contact_phone.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Phone</div>
              <input type="text" className="edit-field" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.contact_email.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Email</div>
              <input type="email" className="edit-field" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
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
