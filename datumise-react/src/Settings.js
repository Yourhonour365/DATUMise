import React from "react";
import { Link } from "react-router-dom";
import ReturnButton from "./ReturnButton";

function Settings() {
  return (
    <div className="container mt-3 px-3" style={{ maxWidth: "640px" }}>
      <div className="mb-3 d-none d-md-block">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
      <h5 className="mb-3 fw-bold d-none d-md-block">Settings</h5>

      {/* ---- Permissions ---- */}
      <section className="mb-4">
        <h6 className="fw-bold d-flex align-items-center gap-2 mb-3">
          <img src="/datumise-settings.svg" alt="" width="18" height="18" />
          Permissions
        </h6>

        {/* Admin */}
        <div className="settings-role-card mb-2">
          <div className="settings-role-title">Admin</div>
          <ul className="settings-role-list">
            <li>Full access to all features</li>
            <li>Manage team members</li>
            <li>Manage settings</li>
            <li>Manage demo / training data</li>
            <li>Assign roles to users</li>
          </ul>
        </div>

        {/* Office */}
        <div className="settings-role-card mb-2">
          <div className="settings-role-title">Office</div>
          <ul className="settings-role-list">
            <li>Create surveys</li>
            <li>View surveys</li>
            <li>View observations</li>
            <li>Cannot be assigned as surveyor unless given Surveyor role</li>
          </ul>
        </div>

        {/* Surveyor */}
        <div className="settings-role-card mb-2">
          <div className="settings-role-title">Surveyor</div>
          <ul className="settings-role-list">
            <li>Can be assigned to surveys</li>
            <li>Can assign an unassigned survey to themselves</li>
            <li>Can start surveys</li>
            <li>Can pause / resume surveys</li>
            <li>Can create observations</li>
            <li>Can submit surveys</li>
            <li>Can edit unsubmitted surveys</li>
          </ul>
        </div>

        {/* Survey Assignment Rules */}
        <div className="settings-role-card mb-2">
          <div className="settings-role-title">Survey Assignment Rules</div>
          <ol className="settings-role-list" style={{ paddingLeft: "1.2rem" }}>
            <li>If a survey has an assigned surveyor, only that surveyor can see Start / Resume</li>
            <li>If a survey is unassigned, users with the Surveyor role see "Assign to me"</li>
            <li>When "Assign to me" is clicked, the survey is assigned to the current user</li>
            <li>If a survey is assigned to someone else, no Start / Resume button is visible</li>
            <li>Office and Admin users do not see Start or Resume buttons</li>
          </ol>
        </div>
      </section>

      {/* ---- Training / Demo Data ---- */}
      <section className="mb-4">
        <h6 className="fw-bold mb-3">Training / Demo Data</h6>

        <div className="settings-role-card">
          <p className="mb-2" style={{ fontSize: "0.82rem" }}>
            Admin users will be able to manage training and demo data for onboarding or demonstrations.
          </p>
          <div className="d-flex flex-column gap-2" style={{ fontSize: "0.82rem" }}>
            <div className="d-flex align-items-center gap-2 text-muted">
              <img src="/datumise-load.svg" alt="" width="16" height="16" style={{ opacity: 0.5 }} />
              <span>Load demo data</span>
              <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>Coming soon</span>
            </div>
            <div className="d-flex align-items-center gap-2 text-muted">
              <img src="/datumise-delete.svg" alt="" width="16" height="16" style={{ opacity: 0.5 }} />
              <span>Delete demo data</span>
              <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>Coming soon</span>
            </div>
            <div className="d-flex align-items-center gap-2 text-muted">
              <img src="/datumise-confirm.svg" alt="" width="16" height="16" style={{ opacity: 0.5 }} />
              <span>Restore demo data</span>
              <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>Coming soon</span>
            </div>
          </div>
        </div>
      </section>

      <ReturnButton to={-1} />
    </div>
  );
}

export default Settings;
