import { useState, useEffect, useRef } from "react";

function SearchPickerModal({ title, options, value, onChange, onClose }) {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", backgroundColor: "#fff", borderRadius: 8, width: "90%", maxWidth: 400, maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e0dcd6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "#1F2A33" }}>{title}</span>
            <button type="button" onClick={onClose}
              style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#888", lineHeight: 1, padding: 0 }}>
              &times;
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #c8c2b8", borderRadius: 6, fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }}
          />
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "16px", textAlign: "center", color: "#888", fontSize: "0.85rem" }}>No results</div>
          )}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={o.disabled}
              onClick={() => { if (!o.disabled) { onChange(o.value); onClose(); } }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 16px", border: "none", cursor: o.disabled ? "default" : "pointer",
                backgroundColor: String(o.value) === String(value) ? "#e8e2d8" : "transparent",
                color: o.disabled ? "#c0392b" : "#1F2A33",
                fontStyle: o.disabled ? "italic" : "normal",
                fontSize: "0.9rem", fontWeight: String(o.value) === String(value) ? 600 : 400,
                opacity: o.disabled ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!o.disabled) e.currentTarget.style.backgroundColor = String(o.value) === String(value) ? "#e8e2d8" : "#f5f5f7"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = String(o.value) === String(value) ? "#e8e2d8" : "transparent"; }}
            >
              {o.label}
              {o.subtitle && <span style={{ display: "block", fontSize: "0.75rem", color: "#888", marginTop: 2 }}>{o.subtitle}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SearchPickerModal;
