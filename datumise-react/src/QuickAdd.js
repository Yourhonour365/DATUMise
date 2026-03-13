import { Link } from "react-router-dom";
import ReturnButton from "./ReturnButton";

function QuickAdd() {
  return (
    <div className="container mt-3 px-3" style={{ maxWidth: "480px" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
      <h5 className="mb-3 fw-bold d-none d-md-block">Quick Add</h5>

      <div className="d-flex flex-column gap-2">
        <Link to="/surveys/create" className="quick-add-item">
          <img src="/datumise-surveys.svg" alt="" width="22" height="22" />
          <span>Create Survey</span>
        </Link>
        <Link to="/clients/create" className="quick-add-item">
          <img src="/datumise-clients.svg" alt="" width="22" height="22" />
          <span>Create Client</span>
        </Link>
        <Link to="/sites/create" className="quick-add-item">
          <img src="/datumise-sites.svg" alt="" width="22" height="22" />
          <span>Create Site</span>
        </Link>
        <Link to="/team/create" className="quick-add-item">
          <img src="/datumise-surveyors.svg" alt="" width="22" height="22" />
          <span>Create Team Member</span>
        </Link>
      </div>

      <ReturnButton to="/" />
    </div>
  );
}

export default QuickAdd;
