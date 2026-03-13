import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import AddButton from "./AddButton";

function TeamList() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await api.get("/api/team/");
        setMembers(response.data.results || response.data);
      } catch (err) {
        console.error("Failed to fetch team:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <p className="text-muted">Loading team...</p>
      </div>
    );
  }

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
      <div className="d-none d-md-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0 fw-bold">Team</h5>
        <AddButton to="/team/create" />
      </div>

      {members.length === 0 ? (
        <p className="text-muted text-center mt-4">No team members yet.</p>
      ) : (
        members.map((member) => (
          <div key={member.id} className="survey-queue-card" style={{ position: "relative" }}>
            <Link to={`/team/${member.id}`} className="text-decoration-none" style={{ display: "block" }}>
              <div className="survey-queue-line2">
                {member.name}
                <span className="text-muted" style={{ fontSize: "0.78rem", marginLeft: "0.4rem" }}>
                  {member.role_display}
                </span>
                {member.status === "archived" && (
                  <span className="badge bg-secondary ms-1" style={{ fontSize: "0.62rem" }}>
                    Archived
                  </span>
                )}
              </div>
              <div className="survey-queue-line3" style={{ marginTop: 0 }}>
                <span className="survey-queue-surveyor">
                  {member.email || "No email"}
                </span>
              </div>
            </Link>
            <Link
              to={`/team/${member.id}/edit`}
              className="text-decoration-none"
              style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src="/datumise-edit.svg" alt="Edit" width="16" height="16" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
            </Link>
          </div>
        ))
      )}

      <div className="d-md-none">
        <AddButton to="/team/create" />
      </div>
      <ReturnButton to="/" />
    </div>
  );
}

export default TeamList;
