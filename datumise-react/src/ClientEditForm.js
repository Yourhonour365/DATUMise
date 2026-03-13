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

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await api.get(`/api/clients/${id}/`);
        const c = response.data;
        setForm({
          name: c.name || "",
          client_type: c.client_type || "",
          account_manager: c.account_manager || "",
          contact_name: c.contact_name || "",
          contact_email: c.contact_email || "",
          contact_phone: c.contact_phone || "",
          billing_address: c.billing_address || "",
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
      await api.put(`/api/clients/${id}/`, form);
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
      <h5 className="fw-bold mb-3 d-none d-md-block">Edit Client</h5>

      {error && <p className="text-danger" style={{ fontSize: "0.85rem" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.name.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Name</legend>
          <input type="text" className="edit-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.client_type ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Client type</legend>
          <select className="edit-field" value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })}>
            <option value="">-- Select --</option>
            <option value="commercial">Commercial</option>
            <option value="local_authority">Local authority</option>
            <option value="education">Education</option>
            <option value="retail">Retail</option>
            <option value="residential">Residential portfolio</option>
          </select>
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.account_manager.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Account manager</legend>
          <input type="text" className="edit-field" value={form.account_manager} onChange={(e) => setForm({ ...form, account_manager: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.contact_name.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Contact name</legend>
          <input type="text" className="edit-field" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.contact_email.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Contact email</legend>
          <input type="email" className="edit-field" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.contact_phone.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Contact phone</legend>
          <input type="text" className="edit-field" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
        </fieldset>
        <fieldset className="edit-fieldset mb-2" style={{ backgroundColor: form.billing_address.trim() ? "#f0ece4" : "#ecf0f1" }}>
          <legend className="edit-legend">Billing address</legend>
          <textarea className="edit-field" rows="3" value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} />
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
            onClick={() => navigate(`/clients/${id}`)}
            className="capture-action-btn"
            aria-label="Cancel"
            style={{ background: "#dce7fa", border: "none" }}
          >
            <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
          </button>
        </div>
      </form>

      <ReturnButton to={`/clients/${id}`} />
    </div>
  );
}

export default ClientEditForm;
