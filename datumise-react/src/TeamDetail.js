import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import EditButton from "./EditButton";

function TeamDetail() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const response = await api.get(`/api/team/${id}/`);
        setMember(response.data);
      } catch (err) {
        console.error("Failed to fetch team member:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [id]);

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <p className="text-muted">Loading team member...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="container mt-4">
        <p className="text-danger">Team member not found.</p>
        <ReturnButton to="/team" />
      </div>
    );
  }

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/team" className="text-decoration-none">
          &larr; Back to Team
        </Link>
      </div>
      <div className="d-none d-md-flex align-items-center justify-content-between mb-1">
        <h5 className="fw-bold mb-0">{member.name}</h5>
        <EditButton to={`/team/${id}/edit`} />
      </div>
      <h5 className="fw-bold mb-1 d-md-none">{member.name}</h5>
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap" style={{ fontSize: "0.82rem" }}>
        {member.role_display && <span>{member.role_display}</span>}
        {member.status === "archived" && (
          <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>Archived</span>
        )}
      </div>

      <div className="survey-details-grid mb-3">
        <div className="survey-detail-item">
          <span className="survey-detail-label">Username</span>
          <span>{member.username}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Email</span>
          <span>{member.email || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Phone</span>
          <span>{member.phone || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Role</span>
          <span>{member.role_display || "Not set"}</span>
        </div>
        <div className="survey-detail-item">
          <span className="survey-detail-label">Status</span>
          <span>{member.status_display || "Active"}</span>
        </div>
      </div>

      <div className="d-md-none">
        <EditButton to={`/team/${id}/edit`} />
      </div>
      <ReturnButton to="/team" />
    </div>
  );
}

export default TeamDetail;
