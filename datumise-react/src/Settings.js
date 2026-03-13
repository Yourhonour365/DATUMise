import React from "react";
import { Link } from "react-router-dom";
import ReturnButton from "./ReturnButton";

function Settings() {
  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
      <h5 className="mb-3 fw-bold d-none d-md-block">Settings</h5>

      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        Settings options coming soon.
      </p>

      <ReturnButton to={-1} />
    </div>
  );
}

export default Settings;
