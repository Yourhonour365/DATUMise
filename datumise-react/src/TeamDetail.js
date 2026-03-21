import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "./api/api";
import ReturnButton from "./ReturnButton";
import EditButton from "./EditButton";

function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [surveysOpen, setSurveysOpen] = useState(false);
  const [surveyFilter, setSurveyFilter] = useState("assigned");
  const [surveysListOpen, setSurveysListOpen] = useState(true);
  const [siblingIds, setSiblingIds] = useState({ prev: null, next: null });

  useEffect(() => {
    setSurveysOpen(false);
    setSurveysListOpen(false);
    setSurveyFilter("assigned");
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
      <div className="d-none d-md-flex align-items-center justify-content-between" style={{ marginBottom: 0 }}>
        <div className="profile-header">
          <div className="profile-header__name-row">
            <span className="profile-header__name">{member.name}</span>
            <span className="profile-header__role">{member.role_display}</span>
          </div>
          <div className="profile-header__meta-row">
            <span className="profile-header__username">{member.username}</span>
            <span className={member.status === "active" ? "profile-header__status--active" : "profile-header__status--archived"}>{member.status_display || "Active"}</span>
          </div>
          <div className="profile-header__contact-row">
            <span>{member.phone ? <a href={`tel:${member.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{member.phone}</a> : "—"}</span>
            <span className="profile-header__separator">|</span>
            <span>{member.email ? <a href={`mailto:${member.email}`} style={{ color: "inherit", textDecoration: "none" }}>{member.email}</a> : "—"}</span>
          </div>
        </div>
        <EditButton to={`/team/${id}/edit`} />
      </div>
      <div className="d-md-none">
        <div className="profile-header">
          <div className="profile-header__name-row">
            <span className="profile-header__name">{member.name}</span>
            <span className="profile-header__role">{member.role_display}</span>
          </div>
          <div className="profile-header__meta-row">
            <span className="profile-header__username">{member.username}</span>
            <span className={member.status === "active" ? "profile-header__status--active" : "profile-header__status--archived"}>{member.status_display || "Active"}</span>
          </div>
          <div className="profile-header__contact-row">
            <span>{member.phone ? <a href={`tel:${member.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{member.phone}</a> : "—"}</span>
            <span className="profile-header__separator">|</span>
            <span>{member.email ? <a href={`mailto:${member.email}`} style={{ color: "inherit", textDecoration: "none" }}>{member.email}</a> : "—"}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {siblingIds.total > 0 && <div style={{ fontSize: "0.78rem", color: "#999", fontStyle: "italic", marginBottom: 4 }}>Member {siblingIds.current} of {siblingIds.total}</div>}
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
          <div className="d-flex gap-2" style={{ marginLeft: "1rem" }}>
            {[
              { value: "assigned", label: "Assigned", count: surveys.filter(s => ["draft", "open", "assigned"].includes(s.status)).length },
              { value: "completed", label: "Completed", count: surveys.filter(s => s.status === "completed").length },
              { value: "archived", label: "Archived", count: surveys.filter(s => s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned").length },
              { value: "cancelled", label: "Cancelled", count: surveys.filter(s => s.status === "archived" && s.closure_reason === "cancelled").length },
              { value: "abandoned", label: "Abandoned", count: surveys.filter(s => s.status === "archived" && s.closure_reason === "abandoned").length },
            ].map(({ value, label, count }) => (
              <button key={value} type="button"
                className={`btn btn-sm ${surveyFilter === value ? "btn-secondary" : "btn-outline-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "3px 16px", minWidth: "5.5rem" }}
                onClick={() => setSurveyFilter(value)}>
                {label} ({count})
              </button>
            ))}
          </div>
        </div>}
      </div>

      <div className="edit-fieldset mb-2" style={{ backgroundColor: "#cec7bb" }}>
        <p className="edit-legend section-toggle" onClick={() => setSurveysListOpen(!surveysListOpen)}>
          <span className={`section-chevron${surveysListOpen ? " section-chevron--open" : ""}`}></span>
          Surveys
        </p>
        {surveysListOpen && <div className="card-stack">
          {(() => {
            const filtered = surveys.filter((s) => {
              if (surveyFilter === "assigned") return ["draft", "open", "assigned"].includes(s.status);
              if (surveyFilter === "completed") return s.status === "completed";
              if (surveyFilter === "archived") return s.status === "archived" && s.closure_reason !== "cancelled" && s.closure_reason !== "abandoned";
              if (surveyFilter === "cancelled") return s.status === "archived" && s.closure_reason === "cancelled";
              if (surveyFilter === "abandoned") return s.status === "archived" && s.closure_reason === "abandoned";
              return true;
            });
            return filtered.length === 0 ? null : (
            filtered.map((s) => {
              const scheduled = s.scheduled_for ? new Date(s.scheduled_for) : null;
              let dateStr = "—";
              let timeStr = "";
              if (scheduled) {
                const d = scheduled.getDate();
                const m = scheduled.toLocaleDateString("en-GB", { month: "short" });
                const y = String(scheduled.getFullYear()).slice(2);
                dateStr = `${d} ${m} '${y}`;
                const h = scheduled.getHours();
                const min = scheduled.getMinutes();
                if (h !== 0 || min !== 0) {
                  const period = h >= 12 ? "pm" : "am";
                  const h12 = h % 12 || 12;
                  timeStr = `${h12}:${min.toString().padStart(2, "0")}${period}`;
                }
              }
              return (
                <div key={s.id} className="survey-queue-card" onClick={() => navigate(`/surveys/${s.id}`)}>
                  <div className="survey-queue-grid">
                    <span>{dateStr}</span>
                    <span>{s.status === "completed" ? "Completed" : s.status === "archived" ? (s.closure_reason === "cancelled" ? "Cancelled" : s.closure_reason === "abandoned" ? "Abandoned" : "Archived") : ""}</span>
                    <span style={{ justifySelf: "end" }}>{s.observation_count != null ? `${s.observation_count} obs` : ""}</span>

                    <span style={{ color: "#6c757d" }}>{timeStr}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.site_name || "No site"}{s.site_postcode ? ` ${s.site_postcode}` : ""}
                    </span>
                    <span style={{ justifySelf: "end", display: "flex", gap: 8, color: "#6c757d" }}>
                      {s.comment_count != null && <span>{s.comment_count} comments</span>}
                      {s.likes_count != null && <span>{s.likes_count} likes</span>}
                    </span>
                  </div>
                </div>
              );
            })
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
