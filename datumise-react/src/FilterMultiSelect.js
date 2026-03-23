import { useState, useRef, useEffect } from "react";

/**
 * Multi-select dropdown with search for filter bars.
 * Props:
 *   label     — placeholder text (e.g. "Surveyor")
 *   options   — [{ id, name }]
 *   selected  — Set of selected ids
 *   onChange  — (newSet) => void
 */
function FilterMultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const active = selected.size > 0;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ fontSize: "0.72rem", padding: "2px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: active ? "#25d366" : "transparent", color: "#fefdfc", cursor: "pointer", whiteSpace: "nowrap", height: 24 }}>
        {label}{active ? ` (${selected.size})` : ""}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 20, backgroundColor: "#fff", border: "1px solid #c8c2b8", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: 200, maxHeight: 260, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #e0dcd6" }}>
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
              style={{ width: "100%", padding: "4px 6px", border: "1px solid #c8c2b8", borderRadius: 4, fontSize: "0.78rem", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 && <div style={{ padding: "8px", color: "#888", fontSize: "0.78rem", textAlign: "center" }}>No results</div>}
            {filtered.map(o => (
              <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", cursor: "pointer", fontSize: "0.8rem", color: "#1F2A33" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f7"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                <input type="checkbox" checked={selected.has(String(o.id))}
                  onChange={() => {
                    const next = new Set(selected);
                    const key = String(o.id);
                    next.has(key) ? next.delete(key) : next.add(key);
                    onChange(next);
                  }} />
                {o.name}
              </label>
            ))}
          </div>
          {selected.size > 0 && (
            <div style={{ borderTop: "1px solid #e0dcd6", padding: "4px 8px" }}>
              <button type="button" onClick={() => onChange(new Set())}
                style={{ border: "none", background: "none", fontSize: "0.72rem", color: "#c0392b", cursor: "pointer", padding: 0 }}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterMultiSelect;
