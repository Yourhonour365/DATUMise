import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import EditButton from "./EditButton";
import OverviewBlock from "./OverviewBlock";
import { SurveyCardGrid, surveyCardStyle } from "./SurveyCard";

function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [surveysOpen, setSurveysOpen] = useState(false);
  const [surveyFilter, setSurveyFilter] = useState("active");
  const [surveysListOpen, setSurveysListOpen] = useState(false);
  const [siblingIds, setSiblingIds] = useState({ prev: null, next: null });

  useEffect(() => {
    setSurveysOpen(false);
    setSurveysListOpen(false);
    setSurveyFilter("active");
    window.scrollTo(0, 0);
    const fetchMember = async () => {
      try {
        const [response, surveysRes, allRes] = await Promise.all([
          api.get(`/api/team/${id}/`),
          api.get(`/api/surveys/?assigned_to=${id}`),
          api.get("/api/team/"),
        ]);
        setMember(response.data);
        setSurveys(surveysRes.data.results || surveysRes.data);
        const all = allRes.data.results || allRes.data;
        const idx = all.findIndex(m => String(m.id) === String(id));
        setSiblingIds({
          prev: idx > 0 ? all[idx - 1].id : null,
          next: idx < all.length - 1 ? all[idx + 1].id : null,
          current: idx + 1,
          total: all.length,
        });
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
      <OverviewBlock
        name={member.name}
        subtitle={member.role_display}
        stats={member.username}
        status={member.status}
        statusLabel={member.status_display || "Active"}
        contact={{ phone: member.phone, email: member.email }}
        position={siblingIds.total > 0 ? { current: `Member ${siblingIds.current}`, total: siblingIds.total } : null}
      />
      <div className="d-flex gap-2 align-items-center mt-2 mb-2">
        <Link to={`/team/${id}/edit`} className="btn btn-secondary btn-sm d-inline-flex align-items-center" style={{ borderRadius: 2, height: 24, fontSize: "0.75rem", padding: "3px 12px", textDecoration: "none" }}>Edit</Link>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="d-flex gap-2 mb-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!siblingIds.prev}
            style={{ opacity: siblingIds.prev ? 1 : 0.4 }}
            onClick={() => siblingIds.prev && navigate(`/team/${siblingIds.prev}`)}>
            &larr; Previous
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!siblingIds.next}
            style={{ opacity: siblingIds.next ? 1 : 0.4 }}
            onClick={() => siblingIds.next && navigate(`/team/${siblingIds.next}`)}>
            Next &rarr;
          </button>
        </div>
      </div>

      <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
        <p className="edit-legend section-toggle" onClick={() => setSurveysOpen(!surveysOpen)}>
          <span className={`section-chevron${surveysOpen ? " section-chevron--open" : ""}`}></span>
          Survey Filters{surveys.length > 0 ? ` (${surveys.length})` : ""}
        </p>
        {surveysOpen && <div className="card-stack">
          <div className="d-flex gap-2 flex-wrap filter-btn-row" style={{ marginLeft: "1rem" }}>
            {[
              { value: "active", label: "Active", count: surveys.filter(s => (s.survey_status || s.status) === "active" || ["draft", "open", "assigned"].includes(s.status)).length },
              { value: "completed", label: "Completed", count: surveys.filter(s => (s.survey_status || s.status) === "completed").length },
              { value: "archived", label: "Archived", count: surveys.filter(s => s.survey_record_status === "archived" || (s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned")).length },
              { value: "cancelled", label: "Cancelled", count: surveys.filter(s => (s.survey_status || (s.status === "archived" && s.closure_reason)) === "cancelled").length },
              { value: "abandoned", label: "Abandoned", count: surveys.filter(s => (s.survey_status || (s.status === "archived" && s.closure_reason)) === "abandoned").length },
            ].map(({ value, label, count }) => (
              <button key={value} type="button"
                className={`btn btn-sm ${surveyFilter === value ? "btn-secondary" : "btn-outline-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem" }}
                onClick={() => setSurveyFilter(value)}>
                {label} <span className="filter-count">({count})</span>
              </button>
            ))}
          </div>
        </div>}
      </div>

      <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
        <p className="edit-legend section-toggle" onClick={() => setSurveysListOpen(!surveysListOpen)}>
          <span className={`section-chevron${surveysListOpen ? " section-chevron--open" : ""}`}></span>
          Surveys ({surveys.length})
        </p>
        {surveysListOpen && <div className="card-stack">
          {(() => {
            const filtered = surveys.filter((s) => {
              const ss = s.survey_status || s.status;
              if (surveyFilter === "active") return ss === "active" || ["draft", "open", "assigned"].includes(s.status);
              if (surveyFilter === "completed") return ss === "completed";
              if (surveyFilter === "archived") return s.survey_record_status === "archived" || (s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned");
              if (surveyFilter === "cancelled") return ss === "cancelled" || (s.status === "archived" && s.closure_reason === "cancelled");
              if (surveyFilter === "abandoned") return ss === "abandoned" || (s.status === "archived" && s.closure_reason === "abandoned");
              return true;
            });
            return filtered.length === 0 ? null : (
            filtered.map((s) => (
                <div key={s.id} className="survey-queue-card" style={surveyCardStyle(s)} onClick={() => navigate(`/surveys/${s.id}`)}>
                  <SurveyCardGrid survey={s} />
                </div>
              ))
          );
          })()}
        </div>}
      </div>

      <div className="d-md-none">
        <EditButton to={`/team/${id}/edit`} />
      </div>
      <ReturnButton to="/team" />
    </div>
  );
}

export default TeamDetail;
