import { Link } from "react-router-dom";
import ReturnButton from "./ReturnButton";

function TeamCreateForm() {
  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/team" className="text-decoration-none">
          &larr; Back to Team
        </Link>
      </div>
      <h5 className="mb-3 fw-bold d-none d-md-block">New Team Member</h5>

      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        Team member creation form coming soon.
      </p>

      <ReturnButton to="/team" />
    </div>
  );
}

export default TeamCreateForm;
