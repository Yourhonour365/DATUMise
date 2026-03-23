import { Link } from "react-router-dom";

function AddButton({ to }) {
  return (
    <Link to={to} className="add-button mobile-fab mobile-fab--add" aria-label="Add">
      <img
        src="/datumise-add.svg"
        alt=""
        width="22"
        height="22"
        style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0) brightness(1.06)" }}
      />
    </Link>
  );
}

export default AddButton;
