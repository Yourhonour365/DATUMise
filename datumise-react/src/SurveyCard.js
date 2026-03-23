import { Link } from "react-router-dom";

export function formatScheduleLine(survey) {
  const now = new Date();
  const scheduled = survey.scheduled_for ? new Date(survey.scheduled_for) : null;
  const due = survey.due_by ? new Date(survey.due_by) : null;
  const visitReq = survey.visit_requirement;
  const schedStatus = survey.schedule_status;

  const ss = survey.survey_status || survey.status;
  const isFinished = (
    ["completed", "cancelled", "abandoned"].includes(ss) ||
    survey.survey_record_status === "archived" ||
    ["submitted", "completed", "missed", "cancelled", "archived"].includes(survey.status) ||
    (survey.status === "assigned" && survey.current_session_status === null)
  );
  const isOverdue = due && due < now && !isFinished;

  let date = "-";
  let time = "";

  if (isOverdue) {
    date = "Overdue";
  } else if (scheduled) {
    const d = scheduled.getDate();
    const m = scheduled.toLocaleDateString("en-GB", { month: "short" });
    const y = String(scheduled.getFullYear()).slice(2);
    date = `${d} ${m} '${y}`;
    const h = scheduled.getHours();
    const min = scheduled.getMinutes();
    if (h !== 0 || min !== 0) {
      const period = h >= 12 ? "pm" : "am";
      const h12 = h % 12 || 12;
      time = `${h12}:${min.toString().padStart(2, "0")}${period}`;
    }
  }

  let scheduleLabel = "";
  const sched = survey.scheduled_status || schedStatus;
  if (sched === "self_scheduled") {
    scheduleLabel = "Self-set";
  } else if (sched === "provisional") {
    scheduleLabel = "Provisional";
  } else if (sched === "confirmed" || sched === "booked") {
    scheduleLabel = "Confirmed";
  } else if (visitReq === "prearranged") {
    scheduleLabel = "Pre-arranged";
  }

  const urgent = !!(survey.is_urgent ?? survey.urgent);

  return { date, time, scheduleLabel, urgent, overdue: isOverdue };
}

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

export function SurveyCardGrid({ survey }) {
  const schedule = formatScheduleLine(survey);
  const ss = survey.survey_status || survey.status;
  const obs = survey.observation_count || 0;
  const drafts = (survey.observations || []).filter(o => o.is_draft).length || 0;

  return (
    <div className="survey-queue-grid">
      {/* Row 1 */}
      <span style={{ color: schedule.overdue ? "#d3212f" : undefined, gridColumn: "1 / 3" }}>
        <span style={{ display: "inline-block", width: "5em" }}>{schedule.date}</span>{schedule.scheduleLabel ? <span style={{ fontSize: "0.68rem", fontStyle: "italic" }}>{schedule.scheduleLabel}</span> : ""}
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
        {survey.site_name || "No site"}{survey.site_postcode ? `, ${survey.site_postcode}` : ""}
      </span>
      <span>{schedule.urgent && <span style={{ color: "#ffff00", fontWeight: 700 }}>!</span>}</span>
      <span>{survey.client_present && <span style={{ color: "#ffff00" }}>&#9733;</span>}</span>

      {/* Row 2 */}
      <span style={{ gridColumn: "1 / 3" }}>{schedule.time || "-"}</span>
      <span style={{ gridColumn: "3 / -1", fontStyle: "italic", fontSize: "0.68rem" }}>
        {survey.session_count > 0 && <>{survey.session_count} Session{survey.session_count !== 1 ? "s" : ""}{survey.current_session_status === "active" ? " · 1 Live" : survey.current_session_status === "paused" ? " · 1 Paused" : ""}</>}
      </span>

      {/* Row 3 */}
      <span style={{ fontStyle: "italic", fontSize: "0.68rem", gridColumn: "1 / 3" }}>{(() => {
        if (ss === "completed") return "Completed";
        if (ss === "cancelled") return "Cancelled";
        if (ss === "abandoned") return "Abandoned";
        if (ss === "draft") return "Draft";
        if (ss === "active" || survey.status === "open" || survey.status === "assigned") return "Active";
        if (survey.survey_record_status === "archived") return "Archived";
        return survey.status_display || "";
      })()}</span>
      <span style={{ gridColumn: "3 / -1", display: "flex", gap: "0.3rem", alignItems: "baseline", overflow: "hidden", whiteSpace: "nowrap" }}>
        <span style={{ flexShrink: 0, fontStyle: "italic" }}>{fmt(obs)} Obs</span>
        <span style={{ flexShrink: 0, fontStyle: "italic" }}>{fmt(drafts)} Draft</span>
        <span style={{ fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, marginLeft: "0.5rem" }}>{survey.assigned_to_name || survey.assigned_to || "Unassigned"}</span>
      </span>
    </div>
  );
}

export function surveyCardStyle(survey) {
  const ss = survey.survey_status || survey.status;
  return ss === "draft" ? { borderLeft: "4px solid #FFA500", borderRight: "4px solid #FFA500" } : undefined;
}
