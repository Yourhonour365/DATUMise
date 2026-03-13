import { Link } from "react-router-dom";

function EditButton({ to }) {
  return (
    <Link to={to} className="edit-button" aria-label="Edit">
      <img
        src="/datumise-edit.svg"
        alt=""
        width="20"
        height="20"
        style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0) brightness(1.06)" }}
      />
    </Link>
  );
}

export default EditButton;
