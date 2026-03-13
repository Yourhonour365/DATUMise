import { useState } from "react";

function FilterAppliedCard({ totalChips, onClear, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="survey-queue-card" style={{ cursor: "default" }}>
      <div
        className="d-flex align-items-center justify-content-between"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((p) => !p)}
      >
        <div className="d-flex align-items-center gap-1">
          <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>
            Applied filters ({totalChips})
          </span>
          <img src="/datumise-down-chev.svg" alt="" width="14" height="14" style={{ opacity: 0.4, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
        </div>
        <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="filter-chip filter-chip-clear" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClear(); }}>
            Clear all &times;
          </button>
        </div>
      </div>
      {open && children}
    </div>
  );
}

export default FilterAppliedCard;
