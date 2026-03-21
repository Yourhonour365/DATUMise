import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";

function SiteEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [originalStatus, setOriginalStatus] = useState("");
  const [activeSurveys, setActiveSurveys] = useState([]);
  const [archivePrompt, setArchivePrompt] = useState(false);
  const [openSections, setOpenSections] = useState({
    details: true, address: true, contact: true, status: true,
  });
  const toggle = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    const fetchSite = async () => {
      try {
        const [response, surveysRes] = await Promise.all([
          api.get(`/api/sites/${id}/`),
          api.get(`/api/surveys/?site=${id}`),
        ]);
        const s = response.data;
        const surveys = surveysRes.data.results || surveysRes.data;
        setActiveSurveys(Array.isArray(surveys) ? surveys.filter((sv) => !["completed", "archived"].includes(sv.status)) : []);
        setOriginalStatus(s.status || "active");
        setClientId(s.client);
        setClientName(s.client_name || "");
        setForm({
          name: s.name || "",
          site_type: s.site_type || "",
          address_line_1: s.address_line_1 || "",
          address_line_2: s.address_line_2 || "",
          city: s.city || "",
          county: s.county || "",
          postcode: s.postcode || "",
          contact_name: s.contact_name || "",
          contact_phone: s.contact_phone || "",
          contact_email: s.contact_email || "",
          access_notes: s.access_notes || "",
          status: s.status || "active",
        });
      } catch (err) {
        console.error("Failed to fetch site:", err);
        setError("Failed to load site.");
      } finally {
        setLoading(false);
      }
    };
    fetchSite();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.status === "archived" && originalStatus !== "archived" && activeSurveys.length > 0 && !archivePrompt) {
      setArchivePrompt(true);
      return;
    }
    await doSave(form.status === "archived" && originalStatus !== "archived" && activeSurveys.length > 0);
  };

  const doSave = async (cancelSurveys) => {
    setSaving(true);
    setError("");
    try {
      if (cancelSurveys) {
        await Promise.all(activeSurveys.map((sv) =>
          api.patch(`/api/surveys/${sv.id}/`, { status: "archived", closure_reason: "cancelled" })
        ));
      }
      await api.patch(`/api/sites/${id}/`, form);
      navigate(`/sites/${id}`);
    } catch (err) {
      console.error("Failed to update site:", err);
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
        <p className="text-danger">{error || "Site not found."}</p>
        <ReturnButton to="/clients" />
      </div>
    );
  }

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to={`/sites/${id}`} className="text-decoration-none">
          &larr; Back to Site
        </Link>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3 d-none d-md-flex">
        <h5 className="fw-bold mb-0">Edit Site</h5>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ details: true, address: true, contact: true, status: true })}>Open all</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpenSections({ details: false, address: false, contact: false, status: false })}>Close all</button>
        </div>
      </div>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* ---- Site Details ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("details")}>
            <span className={`section-chevron${openSections.details ? " section-chevron--open" : ""}`}></span>
            Site Details
          </p>
          {openSections.details && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: "#f0ece4", width: "fit-content" }}>
              <div className="field-label">Client</div>
              <span className="edit-field" style={{ color: "#555" }}>{clientName}</span>
            </div>
            <div className="field-block" style={{ backgroundColor: form.name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Site Name</div>
              <input type="text" className="edit-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field-block" style={{ backgroundColor: form.site_type ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Site type</div>
              <div className="edit-field d-flex gap-4 flex-wrap">
                {[{ value: "car_park", label: "Car park" }, { value: "retail_park", label: "Retail park" }, { value: "industrial_estate", label: "Industrial estate" }, { value: "school", label: "School" }, { value: "office_campus", label: "Office campus" }].map(({ value, label }) => (
                  <label key={value} className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                    <input type="radio" name="site_type" value={value} checked={form.site_type === value} onChange={() => setForm({ ...form, site_type: value })} />
                    <span style={{ fontSize: "0.9rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field-block" style={{ backgroundColor: form.access_notes.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Site notes</div>
              <textarea className="edit-field" rows="3" value={form.access_notes} onChange={(e) => setForm({ ...form, access_notes: e.target.value })} />
            </div>
          </div>}
        </div>

        {/* ---- Site Address ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("address")}>
            <span className={`section-chevron${openSections.address ? " section-chevron--open" : ""}`}></span>
            Site Address
          </p>
          {openSections.address && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: "#f5f5f7", width: "fit-content" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>Line 1</div>
                <input type="text" className="edit-field" value={form.address_line_1} onChange={(e) => setForm({ ...form, address_line_1: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>Line 2</div>
                <input type="text" className="edit-field" value={form.address_line_2} onChange={(e) => setForm({ ...form, address_line_2: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>City</div>
                <input type="text" className="edit-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>County</div>
                <input type="text" className="edit-field" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="field-label" style={{ minWidth: "4.5rem" }}>Post code</div>
                <input type="text" className="edit-field" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
              </div>
            </div>
          </div>}
        </div>

        {/* ---- Site Contact ---- */}
        <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
          <p className="edit-legend section-toggle" onClick={() => toggle("contact")}>
            <span className={`section-chevron${openSections.contact ? " section-chevron--open" : ""}`}></span>
            Site Contact
          </p>
          {openSections.contact && <div className="card-stack">
            <div className="field-block" style={{ backgroundColor: form.contact_name.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Contact name</div>
              <input type="text" className="edit-field" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.contact_phone.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Contact phone</div>
              <input type="text" className="edit-field" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
            <div className="field-block" style={{ backgroundColor: form.contact_email.trim() ? "#f0ece4" : "#f5f5f7", width: "fit-content" }}>
              <div className="field-label">Contact email</div>
              <input type="email" className="edit-field" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
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
            onClick={() => navigate(`/sites/${id}`)}
            className="capture-action-btn"
            aria-label="Cancel"
            style={{ background: "#dce7fa", border: "none" }}
          >
            <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
          </button>
        </div>
      </form>

      <ReturnButton to={`/sites/${id}`} />

      {archivePrompt && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: "1.5rem 2rem", maxWidth: 420, textAlign: "center" }}>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#c0392b" }}>This site has active surveys</p>
            <p style={{ fontSize: "0.88rem", color: "#555", marginBottom: "1.25rem" }}>
              {activeSurveys.length} active survey{activeSurveys.length !== 1 ? "s" : ""} will be cancelled if you archive this site.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setArchivePrompt(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => { setArchivePrompt(false); doSave(true); }}>
                Archive &amp; cancel surveys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SiteEditForm;
