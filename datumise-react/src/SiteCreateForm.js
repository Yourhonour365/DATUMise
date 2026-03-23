import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "./api/api";

function SiteCreateForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClient = searchParams.get("client") || "";
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState({ details: true, address: false, contact: false, status: false });
  const toggle = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const [form, setForm] = useState({
    name: "",
    client: preselectedClient,
    site_type: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    county: "",
    postcode: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    access_notes: "",
    status: "active",
  });

  useEffect(() => {
    document.body.style.backgroundColor = "#f5f5f7";
    return () => { document.body.style.backgroundColor = ""; };
  }, []);

  useEffect(() => {
    api.get("/api/clients/")
      .then((res) => setClients(res.data.results || res.data))
      .catch((err) => console.error("Failed to load clients:", err));
  }, []);

  const fieldComplete = {
    name: !!form.name.trim(),
    city: !!form.city.trim(),
    postcode: !!form.postcode.trim(),
    client: !!form.client,
  };
  const canSave = fieldComplete.name && fieldComplete.city && fieldComplete.postcode && fieldComplete.client;
  const incompleteBorder = { borderLeft: "4px solid #db440a" };
  const fieldBorder = (complete) => complete ? {} : incompleteBorder;

  const sectionBorder = (key) => {
    if (key === "details") return (fieldComplete.name && fieldComplete.client) ? {} : incompleteBorder;
    if (key === "address") return (fieldComplete.city && fieldComplete.postcode) ? {} : incompleteBorder;
    return {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.site_type) delete payload.site_type;
      if (!payload.address_line_1) delete payload.address_line_1;
      if (!payload.address_line_2) delete payload.address_line_2;
      if (!payload.city) delete payload.city;
      if (!payload.county) delete payload.county;
      if (!payload.postcode) delete payload.postcode;
      if (!payload.contact_name) delete payload.contact_name;
      if (!payload.contact_phone) delete payload.contact_phone;
      if (!payload.contact_email) delete payload.contact_email;
      if (!payload.access_notes) delete payload.access_notes;
      const response = await api.post("/api/sites/", payload);
      navigate(`/sites/${response.data.id}`);
    } catch (err) {
      console.error("Failed to create site:", err);
      const errors = err.response?.data;
      if (errors && typeof errors === "object") {
        const msgs = Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
        setError(`Failed to create site:\n${msgs}`);
      } else {
        setError("Failed to create site.");
      }
      setSaving(false);
    }
  };

  return (
    <div className="container mt-3 px-3" style={{ paddingBottom: "50vh" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to="/sites" className="text-decoration-none">&larr; Back to Sites</Link>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3 d-none d-md-flex">
        <h5 className="fw-bold mb-0">New Site</h5>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ details: true, address: true, contact: true, status: true })}>Open all</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ details: false, address: false, contact: false, status: false })}>Close all</button>
        </div>
      </div>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem", whiteSpace: "pre-line" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* ---- Site Details ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("details") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("details")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.details ? " section-chevron--open" : ""}`}></span>
            <span>Site Details</span>
            {!openSections.details && form.name && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {form.name}
              </span>
            )}
          </p>
          {openSections.details && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.client ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.client) }}>
              <div className="field-label">Client</div>
              <select className="edit-field" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} disabled={!!preselectedClient}>
                <option value="">-- Select --</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field-block" style={{ backgroundColor: form.name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.name) }}>
              <div className="field-label">Site Name</div>
              <input type="text" className="edit-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.site_type ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Site type</div>
              <div className="edit-field d-flex gap-4 flex-wrap">
                {[
                  { value: "car_park", label: "Car park" },
                  { value: "retail_park", label: "Retail park" },
                  { value: "industrial_estate", label: "Industrial estate" },
                  { value: "school", label: "School" },
                  { value: "office_campus", label: "Office campus" },
                ].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="site_type" value={value} checked={form.site_type === value} onChange={() => setForm({ ...form, site_type: value })} />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Site Address ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb", ...sectionBorder("address") }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("address")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.address ? " section-chevron--open" : ""}`}></span>
            <span>Site Address</span>
            {!openSections.address && (form.city || form.postcode) && (
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {[form.city, form.postcode].filter(Boolean).join(", ")}
              </span>
            )}
          </p>
          {openSections.address && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.address_line_1.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Line 1</div>
              <input type="text" className="edit-field" value={form.address_line_1} onChange={(e) => setForm({ ...form, address_line_1: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.address_line_2.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Line 2</div>
              <input type="text" className="edit-field" value={form.address_line_2} onChange={(e) => setForm({ ...form, address_line_2: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.city.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.city) }}>
              <div className="field-label">City</div>
              <input type="text" className="edit-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.county.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">County</div>
              <input type="text" className="edit-field" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.postcode.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content", ...fieldBorder(fieldComplete.postcode) }}>
              <div className="field-label">Post code</div>
              <input type="text" className="edit-field" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
            </div>
          </div>}
        </div>

        {/* ---- Site Contact ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("contact")} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span className={`section-chevron${openSections.contact ? " section-chevron--open" : ""}`}></span>
            <span>Site Contact</span>
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
            <div className="field-block" style={{ backgroundColor: form.access_notes.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Site notes</div>
              <textarea className="edit-field" rows="2" value={form.access_notes} onChange={(e) => setForm({ ...form, access_notes: e.target.value })} style={{ resize: "none" }} />
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

export default SiteCreateForm;
