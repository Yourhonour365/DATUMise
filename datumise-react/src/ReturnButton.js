import { useNavigate } from "react-router-dom";

function ReturnButton({ to, state }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="d-md-none mobile-fab mobile-fab--return"
      onClick={() => navigate(to, { state })}
      aria-label="Return to list"
    >
      <span style={{ color: "#fff", fontSize: "1.4rem", fontWeight: 700, lineHeight: 1 }}>&times;</span>
    </button>
  );
}

export default ReturnButton;
