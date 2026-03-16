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
    api.get("/api/clients/")
      .then((res) => setClients(res.data.results || res.data))
      .catch((err) => console.error("Failed to load clients:", err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.client) {
        setError("A client is required.");
        setSaving(false);
        return;
      }
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
      setError("Failed to create site.");
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
      <h5 className="fw-bold mb-3 d-none d-md-block">New Site</h5>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.client ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Client</legend>
          <select className="edit-field" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} disabled={!!preselectedClient} required>
            <option value="">-- Select --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </fieldset>
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
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.address_line_1.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Address line 1</legend>
          <input type="text" className="edit-field" value={form.address_line_1} onChange={(e) => setForm({ ...form, address_line_1: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.address_line_2.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Address line 2</legend>
          <input type="text" className="edit-field" value={form.address_line_2} onChange={(e) => setForm({ ...form, address_line_2: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.city.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">City / Town</legend>
          <input type="text" className="edit-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.county.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">County</legend>
          <input type="text" className="edit-field" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.postcode.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Post code</legend>
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

export default SiteCreateForm;
