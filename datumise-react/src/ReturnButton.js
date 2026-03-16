import { useNavigate } from "react-router-dom";

function ReturnButton({ to, state }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="d-md-none"
      onClick={() => navigate(to, { state })}
      aria-label="Return to list"
      style={{
        position: "fixed",
        bottom: "4.5rem",
        right: "1.5rem",
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        border: "none",
        background: "#dce7fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <img src="/datumise-return.svg" alt="" width="20" height="20" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
    </button>
  );
}

export default ReturnButton;
