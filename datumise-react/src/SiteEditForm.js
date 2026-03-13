import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";

function SiteEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSite = async () => {
      try {
        const response = await api.get(`/api/sites/${id}/`);
        const s = response.data;
        setClientId(s.client);
        setForm({
          name: s.name || "",
          site_type: s.site_type || "",
          address: s.address || "",
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
    setSaving(true);
    setError("");
    try {
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
      <h5 className="fw-bold mb-3 d-none d-md-block">Edit Site</h5>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.name.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Name</legend>
          <input type="text" className="edit-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.site_type ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Site type</legend>
          <select className="edit-field" value={form.site_type} onChange={(e) => setForm({ ...form, site_type: e.target.value })}>
            <option value="">-- Select --</option>
            <option value="car_park">Car park</option>
            <option value="retail_park">Retail park</option>
            <option value="industrial_estate">Industrial estate</option>
            <option value="school">School</option>
            <option value="office_campus">Office campus</option>
          </select>
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.address.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Address</legend>
          <textarea className="edit-field" rows="2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.postcode.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Postcode</legend>
          <input type="text" className="edit-field" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.contact_name.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Contact name</legend>
          <input type="text" className="edit-field" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.contact_phone.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Contact phone</legend>
          <input type="text" className="edit-field" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.contact_email.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Contact email</legend>
          <input type="email" className="edit-field" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.access_notes.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Access notes</legend>
          <textarea className="edit-field" rows="3" value={form.access_notes} onChange={(e) => setForm({ ...form, access_notes: e.target.value })} />
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
    </div>
  );
}

export default SiteEditForm;
