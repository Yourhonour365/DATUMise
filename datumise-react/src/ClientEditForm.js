import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";

function ClientEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [siteCount, setSiteCount] = useState(null);
  const [sitePrompt, setSitePrompt] = useState(false);
  const [openSections, setOpenSections] = useState({ details: true, address: true, contact: true, status: true });
  const toggle = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const [response, sitesRes] = await Promise.all([
          api.get(`/api/clients/${id}/`),
          api.get(`/api/sites/?client=${id}`),
        ]);
        const sites = sitesRes.data.results || sitesRes.data;
        setSiteCount(Array.isArray(sites) ? sites.length : 0);
        const c = response.data;
        setForm({
          name: c.name || "",
          client_type: c.client_type || "",
          account_manager: c.account_manager || "",
          contact_name: c.contact_name || "",
          contact_email: c.contact_email || "",
          contact_phone: c.contact_phone || "",
          billing_line_1: (c.billing_address || "").split("\n")[0] || "",
          billing_line_2: (c.billing_address || "").split("\n")[1] || "",
          billing_city: (c.billing_address || "").split("\n")[2] || "",
          billing_county: (c.billing_address || "").split("\n")[3] || "",
          billing_postcode: (c.billing_address || "").split("\n")[4] || "",
          status: c.status || "active",
        });
      } catch (err) {
        console.error("Failed to fetch client:", err);
        setError("Failed to load client.");
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { billing_line_1, billing_line_2, billing_city, billing_county, billing_postcode, ...rest } = form;
      const billing_address = [billing_line_1, billing_line_2, billing_city, billing_county, billing_postcode].filter(Boolean).join("\n");
      await api.put(`/api/clients/${id}/`, { ...rest, billing_address });
      if (siteCount === 0) {
        setSitePrompt(true);
        setSaving(false);
        return;
      }
      navigate(`/clients/${id}`);
    } catch (err) {
      console.error("Failed to update client:", err);
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
        <p className="text-danger">{error || "Client not found."}</p>
        <ReturnButton to="/clients" />
      </div>
    );
  }

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/clients" className="text-decoration-none">
          &larr; Back to Clients
        </Link>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3 d-none d-md-flex">
        <h5 className="fw-bold mb-0">Edit Client</h5>
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
            onClick={() => { if (siteCount === 0) { setSitePrompt(true); } else { navigate(`/clients/${id}`); } }}
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
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`/clients/${id}`)}>
                Save without site
              </button>
              <button type="button" className="btn btn-success btn-sm" onClick={() => navigate(`/clients/${id}/sites/new`)}>
                Add site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientEditForm;
