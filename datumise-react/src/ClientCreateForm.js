import { Link } from "react-router-dom";
import ReturnButton from "./ReturnButton";

function ClientCreateForm() {
  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/clients" className="text-decoration-none">
          &larr; Back to Clients
        </Link>
      </div>
      <h5 className="mb-3 fw-bold d-none d-md-block">New Client</h5>

      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        Client creation form coming soon.
      </p>

      <ReturnButton to="/clients" />
    </div>
  );
}

export default ClientCreateForm;
