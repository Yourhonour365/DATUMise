import { Link } from "react-router-dom";

function EditButton({ to }) {
  return (
    <Link to={to} className="edit-button" aria-label="Edit">
      <img
        src="/datumise-edit.svg"
        alt=""
        width="20"
        height="20"
        style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }}
      />
    </Link>
  );
}

export default EditButton;
