/**
 * OverviewBlock — consistent top section for detail pages.
 *
 * Props:
 *   name        — entity name (required)
 *   subtitle    — type/role text (optional)
 *   stats       — string like "3 sites · 5 surveys" (optional)
 *   status      — "active" | "archived" (optional)
 *   statusLabel — display text for status (optional, defaults from status)
 *   contact     — { name, phone, email } (optional)
 *   address     — string or array of lines (optional)
 *   postcode    — string (optional)
 *   position    — { current, total } for prev/next (optional)
 *   editTo      — link path for edit button (optional)
 *   actions     — array of { label, to, onClick } for inline action buttons (optional)
 *   children    — extra content below the block (optional)
 */
import { Link } from "react-router-dom";

const statusClass = (s) => s === "active" ? "profile-header__status--active" : "profile-header__status--archived";

function OverviewBlock({ name, subtitle, stats, status, statusLabel, contact, address, postcode, position, editTo, actions, children }) {
  const addressLines = Array.isArray(address) ? address.filter(Boolean) : (address ? [address] : []);

  const inner = (
    <div className="profile-header">
      <div className="profile-header__name-row">
        <span className="profile-header__name">{name}</span>
        {subtitle && <span className="profile-header__role">{subtitle}</span>}
        {actions && actions.map((a, i) => (
          a.to ? (
            <Link key={i} to={a.to} className="btn btn-outline-secondary btn-sm" style={{ fontSize: "0.72rem", padding: "2px 10px", marginLeft: i === 0 ? 12 : 4 }}>{a.label}</Link>
          ) : (
            <button key={i} type="button" className="btn btn-outline-secondary btn-sm" style={{ fontSize: "0.72rem", padding: "2px 10px", marginLeft: i === 0 ? 12 : 4 }} onClick={a.onClick}>{a.label}</button>
          )
        ))}
      </div>
      <div className="profile-header__meta-row">
        <span className="profile-header__username">{stats || "\u00A0"}</span>
        {status && <span className={statusClass(status)}>{statusLabel || (status === "active" ? "Active" : "Archived")}</span>}
      </div>
      <div className="profile-header__meta-row">
        <span>{contact?.name || "\u00A0"}</span>
      </div>
      <div className="profile-header__contact-row">
        <span>{contact?.phone ? <a href={`tel:${contact.phone}`} className="overview-link">{contact.phone}</a> : "\u00A0"}</span>
        <span className="profile-header__separator">{(contact?.phone || contact?.email) ? "|" : "\u00A0"}</span>
        <span>{contact?.email ? <a href={`mailto:${contact.email}`} className="overview-link">{contact.email}</a> : "\u00A0"}</span>
      </div>
      <div className="profile-header__meta-row">
        <span style={{ color: "#bbb" }}>{addressLines.length > 0 ? addressLines.join(", ") : "\u00A0"}</span>
      </div>
      <div className="profile-header__meta-row">
        <span style={{ color: "#bbb" }}>{postcode || "\u00A0"}</span>
      </div>
      {position && position.total >= 1 && (
        <div className="profile-header__meta-row">
          <span style={{ color: "#aaa", fontStyle: "italic", fontSize: "0.78rem" }}>{position.current} of {position.total}</span>
        </div>
      )}
      {children}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="d-none d-md-flex align-items-center justify-content-between" style={{ marginBottom: 0, minHeight: 160, backgroundColor: "#1f0e05", color: "#fff", borderRadius: 2, padding: "12px 16px" }}>
        {inner}
      </div>
      {/* Mobile — same content, edit button below */}
      <div className="d-md-none" style={{ backgroundColor: "#1f0e05", color: "#fff", borderRadius: 2, padding: "12px 16px", minHeight: 120 }}>
        {inner}
      </div>
    </>
  );
}

export default OverviewBlock;
