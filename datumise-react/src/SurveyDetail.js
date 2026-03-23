import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import api from "./api/api";
import { thumbnailUrl } from "./imageUtils";
import ObservationCreateForm from "./ObservationCreateForm";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";
import { SurveyCardGrid, surveyCardStyle } from "./SurveyCard";


// Session-lifecycle PATCH values sent to views.py perform_update.
// These legacy strings are required because the backend session lifecycle
// branches on requested_status for exactly these values.
// PHASE 6B: Replace with dedicated session endpoints once the backend
//           exposes PATCH /api/sessions/:id/ for start/pause/end.
const PATCH_START_SESSION = "live";    // creates a new session, or resumes a paused one
const PATCH_PAUSE_SESSION = "paused";  // pauses the currently active session
const PATCH_END_SESSION = "submitted"; // ends session; survey stays in assigned state

function SurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [useMode, setUseMode] = useState(false);
  const [selectedObs, setSelectedObs] = useState(new Set());
  const [currentUserId, setCurrentUserId] = useState(null);
  const [observationSuccess, setObservationSuccess] = useState(false);
  const [observationFading, setObservationFading] = useState(false);
  const [observationCount, setObservationCount] = useState(0);
  const [durationTick, setDurationTick] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [visibleObsCount, setVisibleObsCount] = useState(25);
  const [obsFilterOpen, setObsFilterOpen] = useState(false);
  const [obsSearch, setObsSearch] = useState("");
  const [obsFilterType, setObsFilterType] = useState(""); // "" | "draft" | "real" | "photo" | "no_photo"
  const [obsSortOrder, setObsSortOrder] = useState("newest");
  const [pushModal, setPushModal] = useState(false);
  const [pushType, setPushType] = useState(""); // "text" | "photo" | "textphoto"
  const [pushSurveys, setPushSurveys] = useState([]);
  const [pushSelected, setPushSelected] = useState(new Set());
  const [pushSearch, setPushSearch] = useState("");
  const [pushNextPage, setPushNextPage] = useState(null);
  const observationsListRef = useRef(null);

const fetchSurvey = async () => {
  try {
    const response = await api.get(`/api/surveys/${id}/`);
    setSurvey(response.data);
    setObservationCount(response.data.observations?.length || 0);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

const handleObsLike = async (e, obsId) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    const response = await api.post(`/api/observations/${obsId}/like/`);
    setSurvey((prev) => ({
      ...prev,
      observations: prev.observations.map((obs) =>
        obs.id === obsId ? { ...obs, is_liked: response.data.liked, likes_count: response.data.likes_count } : obs
      ),
    }));
  } catch (err) {
    console.error("Failed to like:", err);
  }
};

useEffect(() => {
  document.body.style.backgroundColor = "#E2DDD3";
  return () => { document.body.style.backgroundColor = ""; };
}, []);

useEffect(() => {
  if (!localStorage.getItem("token")) {
    setLoading(false);
    return;
  }

  fetchSurvey();
  api.get("/api/auth/user/").then(res => setCurrentUserId(res.data.pk || res.data.id || null)).catch(() => {});
}, [id]);

const hasScrolledRef = useRef(false);
const scrollTarget = location.state?.scrollToObservation;
const returnHighlight = location.state?.highlightObs;
const [scrollReady, setScrollReady] = useState(!scrollTarget);
const [highlightedObs, setHighlightedObs] = useState(scrollTarget || returnHighlight || null);

useLayoutEffect(() => {
  if (scrollTarget && survey?.observations && !hasScrolledRef.current) {
    const el = document.getElementById(`obs-${scrollTarget}`);
    if (el) {
      hasScrolledRef.current = true;
      el.scrollIntoView({ block: "center", behavior: "instant" });
    }
    setHighlightedObs(scrollTarget);
    setScrollReady(true);
    window.history.replaceState({}, "");
    // Direct DOM highlight: set fill immediately, fade out after 1s
    const row = document.querySelector(`#obs-${scrollTarget} .observation-row`);
    if (row) {
      row.style.background = "#9a8255";
      row.style.transition = "none";
      setTimeout(() => {
        row.style.transition = "background 2s ease";
        row.style.background = "#f0ece4";
      }, 1000);
    }
  }
}, [survey?.observations, scrollTarget]);


// Restore highlight when returning from observation detail
useLayoutEffect(() => {
  if (returnHighlight && survey?.observations && !loading) {
    const el = document.getElementById(`obs-${returnHighlight}`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const rowDiv = el.querySelector(".observation-row") || el;
      rowDiv.style.background = "#9a8255";
      rowDiv.style.transition = "none";
      setTimeout(() => {
        rowDiv.style.transition = "background 2s ease";
        rowDiv.style.background = "";
      }, 600);
    }
    window.history.replaceState({}, "");
  }
}, [returnHighlight, survey?.observations, loading]);

    const startSurvey = async () => {
        if (!survey.assigned_to || !survey.is_surveyor) return;
        try {
            await api.patch(`/api/surveys/${id}/`, { status: PATCH_START_SESSION });
            navigate(`/surveys/${id}/capture`);
        } catch (err) {
            console.log(err);
        }
    };

    const pauseSurvey = async () => {
        try {
            await api.patch(`/api/surveys/${id}/`, { status: PATCH_PAUSE_SESSION });
            fetchSurvey();
        } catch (err) {
            console.log(err);
        }
    };

    const resumeSurvey = async () => {
        if (!survey.assigned_to || !survey.is_surveyor) return;
        try {
            await api.patch(`/api/surveys/${id}/`, { status: PATCH_START_SESSION });
            navigate(`/surveys/${id}/capture`);
        } catch (err) {
            console.log(err);
        }
    };

    const startNewSession = async () => {
        if (!survey.assigned_to || !survey.is_surveyor) return;
        try {
            await api.patch(`/api/surveys/${id}/`, { status: PATCH_START_SESSION });
            navigate(`/surveys/${id}/capture`);
        } catch (err) {
            console.log(err);
        }
    };

    const completeSurvey = async () => {
        const confirmed = window.confirm(
            "Mark survey as complete?\n\nNo further observations can be added."
        );
        if (!confirmed) return;
        try {
            await api.patch(`/api/surveys/${id}/`, { status: "completed" });
            fetchSurvey();
        } catch (err) {
            console.log(err);
        }
    };

    const deleteSurvey = async () => {
        const confirmed = window.confirm(
            "Permanently delete this survey?\n\nThis cannot be undone."
        );
        if (!confirmed) return;
        try {
            await api.delete(`/api/surveys/${id}/`);
            navigate("/surveys");
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to delete survey.";
            window.alert(msg);
        }
    };

    // Rule 000016: status transitions
    const cancelSurvey = async () => {
        if (!window.confirm("Cancel this survey?")) return;
        try {
            await api.patch(`/api/surveys/${id}/`, { status: "archived", closure_reason: "cancelled" });
            fetchSurvey();
        } catch (err) { window.alert(err.response?.data?.detail || "Failed to cancel survey."); }
    };

    const abandonSurvey = async () => {
        if (!window.confirm("Abandon this survey? This means the survey could not be completed.")) return;
        try {
            await api.patch(`/api/surveys/${id}/`, { status: "archived", closure_reason: "abandoned" });
            fetchSurvey();
        } catch (err) { window.alert(err.response?.data?.detail || "Failed to abandon survey."); }
    };

    const archiveSurvey = async () => {
        if (!window.confirm("Archive this survey?")) return;
        try {
            await api.patch(`/api/surveys/${id}/`, { status: "archived" });
            fetchSurvey();
        } catch (err) { window.alert(err.response?.data?.detail || "Failed to archive survey."); }
    };

    const unarchiveSurvey = async () => {
        if (!window.confirm("Unarchive this survey? It will return to active status.")) return;
        try {
            await api.patch(`/api/surveys/${id}/`, { status: "open" });
            fetchSurvey();
        } catch (err) { window.alert(err.response?.data?.detail || "Failed to unarchive survey."); }
    };

    const assignSurvey = async () => {
        if ((survey.status !== "planned" && survey.status !== "open") || survey.assigned_to) return;
        try {
            await api.post(`/api/surveys/${id}/assign/`);
            fetchSurvey();
        } catch (err) {
            console.log(err);
        }
    };

    const openSurvey = async () => {
        const missing = [];
        if (!survey.site) missing.push("Site");
        if (!survey.client) missing.push("Client");
        if (!survey.visit_requirement) missing.push("Visit requirement");
        if (survey.notify_required === null || survey.notify_required === undefined) missing.push("Notify required (confirm yes or no)");
        if (!survey.arrival_action) missing.push("Arrival action");
        if (!survey.departure_action) missing.push("Departure action");
        if (missing.length > 0) {
            window.alert(
                `Cannot open survey. Missing required fields:\n\n${missing.map((f) => `\u2022 ${f}`).join("\n")}\n\nPlease edit the survey to complete these fields.`
            );
            return;
        }
        try {
            await api.patch(`/api/surveys/${id}/`, { status: "open" });
            fetchSurvey();
        } catch (err) {
            const errors = err.response?.data;
            if (errors && typeof errors === "object") {
                const msgs = Object.entries(errors)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                    .join("\n");
                window.alert(`Failed to open survey:\n\n${msgs}`);
            } else {
                window.alert("Failed to open survey.");
            }
        }
    };

    const completeSession = async () => {
        const confirmed = window.confirm(
            "Complete this session?\n\nYou can start another session later, or mark the survey as complete."
        );
        if (!confirmed) return;
        try {
            await api.patch(`/api/surveys/${id}/`, { status: PATCH_END_SESSION });
            fetchSurvey();
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
    if (survey) {
      setObservationCount(survey.observations?.length || 0);
    }
    }, [survey]);

    useEffect(() => {
      const interval = setInterval(() => {
        setDurationTick((prev) => prev + 1);
      }, 60000);

      return () => clearInterval(interval);
    }, []);




const formatSurveyDuration = (startTime, _tick) => {
  if (!startTime) return "";

  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now - start;

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

  // Rule 000015: component-level status derivation
  const detailStatus = survey ? (survey.survey_status || survey.status) : "";
  const detailRecordStatus = survey?.survey_record_status || "";
  const isDetailReadOnly = ["completed", "cancelled", "abandoned"].includes(detailStatus) || detailRecordStatus === "archived" || survey?.status === "archived";
  const isDetailCompleted = detailStatus === "completed";
  const canDeleteObs = !isDetailCompleted && !isDetailReadOnly;

  return (
    <div className="container mt-3">
      <div className="mb-3 d-none d-md-block">
        <Link to="/surveys" className="text-decoration-none">
          &larr; Back to Surveys
        </Link>
      </div>

      {!localStorage.getItem("token") && (
        <p className="text-muted">Please log in to view survey details.</p>
      )}

      {loading && <p>Loading survey...</p>}

      {!loading && survey && (
        <>
          {survey.survey_record_status === "archived" && (
            <div style={{ backgroundColor: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: 6, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#721c24" }}>
              This survey record is archived and cannot be edited.
            </div>
          )}
          {/* ---- Survey card header ---- */}
          <div className="survey-queue-card mb-2" style={surveyCardStyle(survey)}>
            <SurveyCardGrid survey={survey} />
            {survey.visit_requirement && (
              <div style={{ fontSize: "0.78rem", fontStyle: "italic", marginTop: 4 }}>
                {{ "24h_notify": "24 Hours - notify in advance", "24h_no_notify": "24 Hours - no notification", "wh_notify": "Working hours - notify in advance", "wh_no_notify": "Working hours - no notification", "prearranged": "Pre-arranged visits only" }[survey.visit_requirement] || survey.visit_requirement}
                {survey.scheduled_for && survey.window_end_date && (() => {
                  const fmt = (d) => { const dt = new Date(d); return `${dt.getDate()} ${dt.toLocaleDateString("en-GB", { month: "short" })} '${String(dt.getFullYear()).slice(2)}`; };
                  return <><span style={{ marginLeft: "1rem" }}>Survey Window {fmt(survey.scheduled_for)} - {fmt(survey.window_end_date)}</span></>;
                })()}
              </div>
            )}
            {survey.window_days && (() => {
              const dayLabels = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
              const fmtTime = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };
              const entries = Object.entries(survey.window_days).filter(([, v]) => v && (typeof v === "object" ? true : !!v));
              if (!entries.length) return null;
              const rows = [];
              for (let i = 0; i < entries.length; i += 3) rows.push(entries.slice(i, i + 3));
              return (
                <div style={{ marginTop: 4 }}>
                  {rows.map((row, ri) => (
                    <div key={ri} style={{ display: "grid", gridTemplateColumns: `repeat(${row.length}, auto)`, gap: "0 16px", marginBottom: ri < rows.length - 1 ? 6 : 0, fontSize: "0.78rem", fontStyle: "italic" }}>
                      {row.map(([day]) => (
                        <div key={`h-${day}`} style={{ fontWeight: 600 }}>{dayLabels[day] || day}</div>
                      ))}
                      {row.map(([day, v]) => (
                        <div key={`s-${day}`} style={{ fontSize: "0.72rem" }}>{typeof v === "object" && v.start ? fmtTime(v.start) : ""}</div>
                      ))}
                      {row.map(([day, v]) => (
                        <div key={`e-${day}`} style={{ fontSize: "0.72rem" }}>{typeof v === "object" && v.end ? fmtTime(v.end) : ""}</div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* ---- Survey action buttons ---- */}
          <div className="d-flex gap-2 flex-wrap align-items-center mb-1" style={{ marginTop: 4 }}>
            {(() => {
              const ss = survey.survey_status || survey.status;
              const rs = survey.survey_record_status;
              const isDetailDraft = ss === "draft";
              const isDetailActive = ss === "active" || ["open", "assigned", "planned"].includes(survey.status);
              const isDetailCompleted = ss === "completed";
              const isDetailCancelled = ss === "cancelled";
              const isDetailAbandoned = ss === "abandoned";
              const isDetailArchived = rs === "archived" || survey.status === "archived";
              return (<>
                {isDetailDraft && survey.is_admin && (
                  <button className="btn btn-success btn-sm" onClick={openSurvey}>Start Survey</button>
                )}
                {isDetailDraft && survey.is_admin && (
                  <button className="btn btn-danger btn-sm" onClick={cancelSurvey}>Cancel Survey</button>
                )}
                {isDetailDraft && (survey.is_admin || survey.is_owner) && (
                  <Link to={`/surveys/${id}/edit`} className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>Edit Survey</Link>
                )}
                {isDetailActive && !isDetailArchived && (<>
                  {!survey.current_session_status && survey.is_surveyor && survey.session_count > 0 && (
                    <button className="btn btn-dark btn-sm" disabled={useMode} style={useMode ? { opacity: 0.4 } : {}} onClick={useMode ? undefined : completeSurvey}>Complete Survey</button>
                  )}
                  <button className="btn btn-danger btn-sm" disabled={useMode} style={useMode ? { opacity: 0.4 } : {}} onClick={useMode ? undefined : cancelSurvey}>Cancel Survey</button>
                  <button className="btn btn-sm" disabled={useMode} style={{ backgroundColor: "#000", color: "#fff", ...(useMode ? { opacity: 0.4 } : {}) }} onClick={useMode ? undefined : abandonSurvey}>Abandon Survey</button>
                  <Link to={`/surveys/${id}/edit`} className="btn btn-secondary btn-sm" disabled={useMode} style={{ textDecoration: "none", ...(useMode ? { opacity: 0.4, pointerEvents: "none" } : {}) }}>Edit Survey</Link>
                </>)}
                {isDetailCompleted && !isDetailArchived && (
                  <button className="btn btn-secondary btn-sm" onClick={archiveSurvey}>Archive</button>
                )}
                {(isDetailCancelled || isDetailAbandoned) && !isDetailArchived && (
                  <button className="btn btn-secondary btn-sm" onClick={archiveSurvey}>Archive</button>
                )}
                {isDetailArchived && (
                  <button className="btn btn-secondary btn-sm" onClick={unarchiveSurvey}>Unarchive</button>
                )}
                {isDetailDraft && (survey.is_admin || survey.is_owner) && (() => {
                  const hasRealObs = (survey.observations || []).some(o => !o.is_draft && o.image);
                  return hasRealObs ? (
                    <button className="btn btn-danger btn-sm" disabled style={{ opacity: 0.45, cursor: "not-allowed" }}
                      onClick={() => alert("This item contains survey data and cannot be deleted. Archive instead.")}>Delete</button>
                  ) : (
                    <button className="btn btn-danger btn-sm" disabled={useMode} style={useMode ? { opacity: 0.4 } : {}} onClick={useMode ? undefined : deleteSurvey}>Delete</button>
                  );
                })()}
              </>);
            })()}
          </div>

          {/* ---- Session action buttons ---- */}
          {(() => {
            const ss = survey.survey_status || survey.status;
            const isSessionActive = ss === "active" || ["open", "assigned", "planned"].includes(survey.status);
            const isSessionArchived = (survey.survey_record_status === "archived" || survey.status === "archived");
            if (!isSessionActive || isSessionArchived) return null;
            const hasSessionBtns = survey.is_surveyor && survey.assigned_to;
            if (!hasSessionBtns) return null;
            return (
              <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
                {!survey.current_session_status && (
                  <Link to={useMode ? "#" : `/surveys/${id}/capture`} className="btn btn-success btn-sm" style={useMode ? { opacity: 0.4, pointerEvents: "none" } : {}} onClick={useMode ? (e) => e.preventDefault() : undefined}>Start Session</Link>
                )}
                {survey.current_session_status === "active" && (<>
                  <button className="btn btn-warning btn-sm" disabled={useMode} style={useMode ? { opacity: 0.4 } : {}} onClick={useMode ? undefined : pauseSurvey}>Pause Session</button>
                  <button className="btn btn-secondary btn-sm" disabled={useMode} style={useMode ? { opacity: 0.4 } : {}} onClick={useMode ? undefined : completeSession}>Complete Session</button>
                </>)}
                {survey.current_session_status === "paused" && (<>
                  <Link to={useMode ? "#" : `/surveys/${id}/capture`} className="btn btn-success btn-sm" style={useMode ? { opacity: 0.4, pointerEvents: "none" } : {}} onClick={useMode ? (e) => e.preventDefault() : undefined}>Resume Session</Link>
                  <button className="btn btn-secondary btn-sm" disabled={useMode} style={useMode ? { opacity: 0.4 } : {}} onClick={useMode ? undefined : completeSession}>Complete Session</button>
                </>)}
              </div>
            );
          })()}

          {/* ---- Collapsible survey details ---- */}
          <div className="mb-3">
            {showDetails && (
              <>
                <div className="survey-details-grid mt-2">
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Client</span>
                    <span>{survey.client || "Not set"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Site</span>
                    <span>{survey.site || "Not set"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Surveyor</span>
                    <span>{survey.assigned_to_name || survey.assigned_to || "Unassigned"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Created by</span>
                    <span>{survey.created_by || "Unknown"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Client ID</span>
                    <span>{survey.client_id || "Not set"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Site ID</span>
                    <span>{survey.site_id || "Not set"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Client attending</span>
                    <span>{survey.client_present ? "Yes" : "No"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Site contact</span>
                    <span>{survey.site_contact_name || "Not set"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Site contact phone</span>
                    <span>{survey.site_contact_phone || "Not set"}</span>
                  </div>
                  <div className="survey-detail-item">
                    <span className="survey-detail-label">Site contact email</span>
                    <span>{survey.site_contact_email || "Not set"}</span>
                  </div>
                  {survey.visit_requirement && (
                    <div className="survey-detail-item">
                      <span className="survey-detail-label">Visit requirement</span>
                      <span>{{ unrestricted: "Unrestricted", prearranged: "Pre-arranged" }[survey.visit_requirement] || survey.visit_requirement}</span>
                    </div>
                  )}
                  {(survey.scheduled_status || survey.schedule_status) && (
                    <div className="survey-detail-item">
                      <span className="survey-detail-label">Schedule status</span>
                      <span>{{ self_scheduled: "Self-set", provisional: "Provisional", confirmed: "Confirmed", booked: "Confirmed" }[survey.scheduled_status || survey.schedule_status] || survey.scheduled_status || survey.schedule_status}</span>
                    </div>
                  )}
                  {survey.visit_time && (
                    <div className="survey-detail-item">
                      <span className="survey-detail-label">Visit time</span>
                      <span>{{ anytime: "Anytime", window: "Time window", appointment: "Appointment" }[survey.visit_time] || survey.visit_time}</span>
                    </div>
                  )}
                  {survey.attendance_status && survey.attendance_status !== "unknown" && (
                    <div className="survey-detail-item">
                      <span className="survey-detail-label">Attendance</span>
                      <span style={{ textTransform: "capitalize" }}>{survey.attendance_status}</span>
                    </div>
                  )}
                  {survey.closure_reason && (
                    <div className="survey-detail-item">
                      <span className="survey-detail-label">Closure</span>
                      <span style={{ textTransform: "capitalize" }}>{survey.closure_reason}</span>
                    </div>
                  )}
                  {survey.notes && (
                    <div className="survey-detail-item" style={{ gridColumn: "1 / -1" }}>
                      <span className="survey-detail-label">Notes</span>
                      <span>{survey.notes}</span>
                    </div>
                  )}
                  {survey.access_notes && (
                    <div className="survey-detail-item" style={{ gridColumn: "1 / -1" }}>
                      <span className="survey-detail-label">Access notes</span>
                      <span style={{ whiteSpace: "pre-line" }}>{survey.access_notes}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ---- Observations toolbar ---- */}
          <div className="section-header-row mb-2">
            <h6 className="mb-0">
              Observations
              <span className="text-muted fw-normal ms-1" style={{ fontSize: "0.85rem" }}>
                ({survey.observations?.length || 0})
              </span>
            </h6>
            <div className="section-header-actions">
              {useMode && selectedObs.size > 0 && (
                <>
                  <button type="button" className="btn btn-sm d-flex align-items-center"
                    style={{ fontSize: "0.75rem", padding: "2px 8px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
                    onClick={async () => {
                      setPushType("text");
                      setPushSearch("");
                      setPushSelected(new Set([String(survey.id)]));
                      try {
                        const res = await api.get(currentUserId ? `/api/surveys/?page_size=25&assigned_to=${currentUserId}` : "/api/surveys/?page_size=25");
                        setPushSurveys(res.data.results || res.data);
                        setPushNextPage(res.data.next || null);
                      } catch (e) { setPushSurveys([]); }
                      setPushModal(true);
                    }}>
                    Text
                  </button>
                  <button type="button" className="btn btn-sm d-flex align-items-center"
                    style={{ fontSize: "0.75rem", padding: "2px 8px", backgroundColor: "#db440a", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
                    onClick={async () => {
                      setPushType("photo");
                      setPushSearch("");
                      setPushSelected(new Set([String(survey.id)]));
                      try {
                        const res = await api.get(currentUserId ? `/api/surveys/?page_size=25&assigned_to=${currentUserId}` : "/api/surveys/?page_size=25");
                        setPushSurveys(res.data.results || res.data);
                        setPushNextPage(res.data.next || null);
                      } catch (e) { setPushSurveys([]); }
                      setPushModal(true);
                    }}>
                    Photo
                  </button>
                  {canDeleteObs && (
                  <button type="button" className="btn btn-sm d-flex align-items-center justify-content-center"
                    style={{ width: 24, height: 24, padding: 0, backgroundColor: "#c0392b", border: "none", borderRadius: 2 }}
                    onClick={async () => {
                      const confirmed = window.confirm(`Delete ${selectedObs.size} observation${selectedObs.size !== 1 ? "s" : ""}? This cannot be undone.`);
                      if (!confirmed) return;
                      try {
                        await Promise.all([...selectedObs].map(obsId => api.delete(`/api/observations/${obsId}/`)));
                        setUseMode(false);
                        setSelectedObs(new Set());
                        fetchSurvey();
                      } catch (err) {
                        console.error(err);
                        alert("Failed to delete observations.");
                      }
                    }}>
                    <img src="/datumise_delete.svg" alt="Delete" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} />
                  </button>
                  )}
                  <button type="button" className="btn btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#6c757d", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
                    onClick={() => setSelectedObs(new Set())}>Clear</button>
                </>
              )}
              {(survey.observations?.length > 0) && (
              <button type="button" className="btn btn-sm"
                style={{ fontSize: "0.75rem", padding: "2px 8px", backgroundColor: useMode ? "#fefdfc" : "#0006b1", color: useMode ? "#0006b1" : "#fefdfc", border: useMode ? "1px solid #0006b1" : "none", borderRadius: 2, height: 24 }}
                onClick={() => { setUseMode(!useMode); if (useMode) setSelectedObs(new Set()); }}>
                {useMode && selectedObs.size > 0 ? `${selectedObs.size}/10` : "Select"}
              </button>
              )}
            </div>
          </div>

          {/* ---- Observation filters ---- */}
          {survey.observations?.length > 0 && (
            <div className="edit-fieldset mb-2" style={{ backgroundColor: "#2E5E3E", borderRadius: 2, color: "#fefdfc" }}>
              <p className="edit-legend section-toggle" onClick={() => setObsFilterOpen(!obsFilterOpen)} style={{ color: "#fefdfc", fontSize: "0.82rem" }}>
                <span className={`section-chevron section-chevron--light${obsFilterOpen ? " section-chevron--open" : ""}`}></span>
                Filters
              </p>
              {obsFilterOpen && (<>
                <div style={{ marginLeft: "var(--section-gap, 16px)", marginBottom: 6 }}>
                  <input type="text" className="filter-search" placeholder="Search observations..." value={obsSearch} onChange={(e) => setObsSearch(e.target.value)}
                    style={{ fontSize: "0.75rem", padding: "3px 8px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: "transparent", color: "#fefdfc", outline: "none", width: "100%", maxWidth: 200 }} />
                </div>
                <div className="d-flex gap-2 flex-wrap" style={{ marginLeft: "var(--section-gap, 16px)", marginBottom: 6 }}>
                  {[{ v: "", l: "All" }, { v: "draft", l: "Draft" }, { v: "real", l: "Real" }, { v: "photo", l: "With Photo" }, { v: "no_photo", l: "No Photo" }].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setObsFilterType(v)}
                      style={{ fontSize: "0.68rem", padding: "2px 10px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: obsFilterType === v ? "#db440a" : "transparent", color: "#fefdfc", cursor: "pointer", height: 24 }}>
                      {l}
                    </button>
                  ))}
                </div>
                <div className="d-flex gap-2 flex-wrap" style={{ marginLeft: "var(--section-gap, 16px)", marginBottom: 6 }}>
                  {[{ v: "newest", l: "Newest" }, { v: "oldest", l: "Oldest" }, { v: "most_liked", l: "Most Liked" }, { v: "most_commented", l: "Most Commented" }].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setObsSortOrder(v)}
                      style={{ fontSize: "0.68rem", padding: "2px 10px", border: "1px solid #f5f5f7", borderRadius: 4, backgroundColor: obsSortOrder === v ? "#db440a" : "transparent", color: "#fefdfc", cursor: "pointer", height: 24 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </>)}
              {!obsFilterOpen && (obsSearch || obsFilterType) && (
                <div className="d-flex gap-2 flex-wrap" style={{ marginLeft: "var(--section-gap, 16px)", marginTop: 4 }}>
                  {obsSearch && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#2e5e3e", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>"{obsSearch}" <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#c0392b" }} onClick={() => setObsSearch("")}>&times;</button></span>}
                  {obsFilterType && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", backgroundColor: "#fcfaf7", color: "#2e5e3e", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>{{ draft: "Draft", real: "Real", photo: "With Photo", no_photo: "No Photo" }[obsFilterType]} <button type="button" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, color: "#c0392b" }} onClick={() => setObsFilterType("")}>&times;</button></span>}
                </div>
              )}
            </div>
          )}

          {/* ---- Observation list ---- */}
          {survey.observations?.length === 0 && (
            <p className="text-muted" style={{ fontSize: "0.85rem" }}>
              No observations have been added to this survey yet.
            </p>
          )}

          <div id="observations-list" style={{ opacity: scrollReady ? 1 : 0, paddingBottom: "80vh" }}>
            {(() => {
              let filtered = survey?.observations || [];
              if (obsSearch) { const q = obsSearch.toLowerCase(); filtered = filtered.filter(o => (o.title || "").toLowerCase().includes(q)); }
              if (obsFilterType === "draft") filtered = filtered.filter(o => o.is_draft);
              if (obsFilterType === "real") filtered = filtered.filter(o => !o.is_draft);
              if (obsFilterType === "photo") filtered = filtered.filter(o => !!o.image);
              if (obsFilterType === "no_photo") filtered = filtered.filter(o => !o.image);
              if (obsSortOrder === "oldest") filtered = [...filtered].reverse();
              if (obsSortOrder === "most_liked") filtered = [...filtered].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
              if (obsSortOrder === "most_commented") filtered = [...filtered].sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
              return filtered;
            })().slice(0, visibleObsCount).map((observation, index) => (
              <div
                key={observation.id}
                id={`obs-${observation.id}`}
                className={`observation-row${highlightedObs === observation.id ? " observation-row-highlight" : ""}`}
                style={{ cursor: "pointer", padding: 0, alignItems: "stretch", overflow: "hidden", gap: 0, height: "80px", position: "relative" }}
                onMouseEnter={() => { if (highlightedObs && highlightedObs !== observation.id) setHighlightedObs(null); }}
                onClick={(e) => {
                  if (useMode) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    if (clickX > rect.width * 0.8) {
                      setSelectedObs(prev => { const next = new Set(prev); if (next.has(observation.id)) next.delete(observation.id); else if (next.size < 10) next.add(observation.id); return next; });
                      return;
                    }
                  }
                  const obsIds = survey.observations.map((o) => o.id);
                  navigate(`/surveys/${id}/capture`, { state: { viewObservationId: observation.id } });
                }}
              >
                <div style={{ position: "relative", width: "80px", flexShrink: 0 }}>
                  {observation.image ? (
                    <img
                      src={thumbnailUrl(observation)}
                      alt=""
                      loading="lazy"
                      style={{ width: "80px", minHeight: "100%", objectFit: "cover", borderRadius: "2px 0 0 2px" }}
                    />
                  ) : (
                    <div style={{ width: "80px", minHeight: "100%", borderRadius: "2px 0 0 2px", display: "flex", alignItems: "center", justifyContent: "center", background: "#e9ecef" }}>
                      <span style={{ fontSize: "0.65rem", color: "#2c3e50" }}>No img</span>
                    </div>
                  )}
                  {observation.is_draft && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#db440a", color: "#fff", fontSize: "0.55rem", fontWeight: 700, textAlign: "center", borderRadius: 0, padding: "1px 0", letterSpacing: "0.05em" }}>DRAFT</div>
                  )}
                </div>
                <div className="observation-row-content d-flex flex-column" style={{ padding: "0.3rem 1rem 0.3rem 0.4rem", overflow: "hidden" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}><div className="observation-row-title" style={{ lineHeight: 1.2, maxWidth: "80ch", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-all" }}>
                    {isDetailReadOnly && (
                      <span style={{ fontSize: "0.65rem", marginRight: "4px", verticalAlign: "middle" }}>{"\uD83D\uDD12"}</span>
                    )}
                    {observation.title}
                  </div></div>
                  <div className="observation-row-meta d-flex align-items-center justify-content-start gap-2" style={{ lineHeight: 1.6, marginTop: "0.1rem", flexShrink: 0 }}>
                    <button
                      className="btn btn-link btn-sm p-0 border-0 bg-transparent d-inline-flex align-items-center gap-1"
                      style={{ fontSize: "0.6rem", textDecoration: "none", color: "#95a5a6" }}
                      onClick={(e) => handleObsLike(e, observation.id)}
                    >
                      <img src="/datumise-like.svg" alt="" width="11" height="11" style={{ opacity: observation.is_liked ? 1 : 0.4, filter: observation.is_liked ? "invert(20%) sepia(90%) saturate(3000%) hue-rotate(120deg) brightness(0.5)" : "none" }} />
                      {observation.likes_count || 0}
                    </button>
                    <button
                      className="btn btn-link btn-sm p-0 border-0 bg-transparent d-inline-flex align-items-center gap-1"
                      style={{ fontSize: "0.6rem", textDecoration: "none", color: "#95a5a6" }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/surveys/${id}/capture`, { state: { viewObservationId: observation.id } }); }}
                    >
                      <img src="/datumise-comment.svg" alt="" width="11" height="11" style={{ opacity: 0.5 }} />
                      {observation.comment_count || 0}
                    </button>
                    <span>
                      {new Date(observation.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {" \u00B7 "}{observation.owner_name || observation.owner || "Unassigned"}
                    </span>
                  </div>
                </div>
                {useMode && (
                  <div onClick={(e) => { e.stopPropagation(); setSelectedObs(prev => { const next = new Set(prev); if (next.has(observation.id)) next.delete(observation.id); else if (next.size < 10) next.add(observation.id); return next; }); }}
                    style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "2px solid #0006b1", backgroundColor: selectedObs.has(observation.id) ? "#0006b1" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    {selectedObs.has(observation.id) && <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
          {survey?.observations?.length > visibleObsCount && (
            <div className="text-center mt-3 mb-3">
              <button
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
                style={{ width: "44px", height: "44px", background: "#db440a", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
                onClick={() => setVisibleObsCount(prev => prev + 25)}
                aria-label="Load more"
              >
                <img src="/datumise-load.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
              </button>
            </div>
          )}
        </>
      )}
        <Modal
          show={showObservationModal}
          onHide={() => {
            const draft = localStorage.getItem("datumise-observation-draft");
            const image = localStorage.getItem("datumise-observation-image");

            const hasText =
              draft && JSON.parse(draft) && (
                JSON.parse(draft).title?.trim() ||
                JSON.parse(draft).description?.trim()
              );

            const hasImage = !!image;

            if (hasText || hasImage) {
              const confirmed = window.confirm(
                "Close observation?\n\nYour draft will be saved, but this observation has not been saved to the survey yet."
              );
              if (!confirmed) return;
            }

            setShowObservationModal(false);
          }}
          centered
          dialogClassName="observation-modal"
        >
          <Modal.Header closeButton className="px-3">
              <Modal.Title>
                <div className="fw-semibold">
                  Add Observation #{observationCount + 1}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    lineHeight: "1",
                    minHeight: "1rem",
                    position: "relative",
                    marginTop: "0.25rem",
                  }}
                >
                  <span
                    className="text-muted"
                    style={{
                      opacity: observationSuccess ? 0 : 1,
                      transition: "opacity 0.9s ease",
                      position: "absolute",
                      left: 0,
                      top: 0,
                    }}
                  >
                    Duration {formatSurveyDuration(survey?.created_at, durationTick)}
                  </span>
                  <span
                    className="text-success fw-light"
                    style={{
                      opacity: observationSuccess ? 1 : 0,
                      transition: "opacity 0.9s ease",
                      position: "absolute",
                      left: 0,
                      top: 0,
                    }}
                  >
                    Observation Added
                  </span>
                </div>
              </Modal.Title>
            </Modal.Header>
              <Modal.Body className="pt-2 pb-3">
                <ObservationCreateForm
                  surveyId={survey?.id}
                  onPauseSurvey={pauseSurvey}

                  onClose={() => {
                    setShowObservationModal(false);
                  }}




                  onSuccess={(newObservation) => {
                    setObservationCount((prev) => prev + 1);

                    setSurvey((prev) => ({
                      ...prev,
                      observations: [...(prev.observations || []), newObservation],
                    }));

                    fetchSurvey();

                    setObservationSuccess(false);

                    setTimeout(() => {
                      setObservationSuccess(true);
                    }, 300);
                    setObservationFading(false);

                    setTimeout(() => {
                      setObservationFading(true);
                    }, 1200);

                    setTimeout(() => {
                      setObservationSuccess(false);
                    }, 3200);
                  }}




                />
              </Modal.Body>

            </Modal>

      <ReturnButton to={-1} />
      <BackToTop />

      {/* Push to survey modal */}
      {pushModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 2, maxWidth: 520, width: "90%", maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="d-flex justify-content-between align-items-center" style={{ backgroundColor: "#db440a", padding: "0.5rem 1rem" }}>
              <span style={{ color: "#faf6ef", fontWeight: 700, fontSize: "1rem" }}>
                {pushType === "text" ? "Create draft observations in selected surveys from observation text?" : pushType === "photo" ? "Create draft observations in selected surveys from observation photos?" : "Create draft observations in selected surveys from observation photos and text?"}
              </span>
              <button type="button" style={{ border: "none", background: "none", fontSize: "1.3rem", cursor: "pointer", color: "#faf6ef", lineHeight: 1, padding: 0 }} onClick={() => setPushModal(false)}>&times;</button>
            </div>
            <div style={{ padding: "0.75rem 1rem 0.5rem" }}>
              <input type="text" className="filter-search" placeholder="Search surveys..." value={pushSearch} onChange={(e) => setPushSearch(e.target.value)}
                style={{ fontSize: "0.75rem", padding: "3px 8px", border: "1px solid #c8c2b8", borderRadius: 4, outline: "none", width: "100%", maxWidth: 200 }} />
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "0 1rem" }}>
              {(() => {
                const filtered = pushSurveys.filter(s => {
                  if (!pushSearch) return true;
                  const q = pushSearch.toLowerCase();
                  return (s.site_name || "").toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q) || (s.assigned_to_name || s.assigned_to || "").toLowerCase().includes(q);
                });
                // Put current survey first
                const sorted = [...filtered].sort((a, b) => (String(b.id) === String(survey.id) ? 1 : 0) - (String(a.id) === String(survey.id) ? 1 : 0));
                return sorted.length === 0 ? (
                  <p className="text-muted">No surveys found.</p>
                ) : (<>
                  {sorted.map(s => (
                    <div key={s.id} className="survey-queue-card" style={{ ...(surveyCardStyle(s) || {}), cursor: "pointer", position: "relative", outline: String(s.id) === String(survey.id) ? "2px solid #0d6efd" : "none" }}
                      onClick={() => { setPushSelected(prev => { const n = new Set(prev); n.has(String(s.id)) ? n.delete(String(s.id)) : n.add(String(s.id)); return n; }); }}>
                      <SurveyCardGrid survey={s} />
                      <div style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "2px solid #fff", backgroundColor: pushSelected.has(String(s.id)) ? "#0d6efd" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {pushSelected.has(String(s.id)) && <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                      </div>
                    </div>
                  ))}
                  {pushNextPage ? (
                    <div className="text-center my-2">
                      <button className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
                        style={{ width: 36, height: 36, background: "#db440a", border: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
                        onClick={async () => {
                          try { const res = await api.get(pushNextPage); setPushSurveys(prev => [...prev, ...(res.data.results || res.data)]); setPushNextPage(res.data.next || null); } catch (e) {}
                        }}>
                        <img src="/datumise-load.svg" alt="Load more" width="18" height="18" style={{ filter: "brightness(0) invert(1)" }} />
                      </button>
                    </div>
                  ) : (
                    <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#999", fontStyle: "italic", margin: "8px 0" }}>All surveys downloaded</p>
                  )}
                </>);
              })()}
            </div>
            <div className="d-flex justify-content-end gap-2" style={{ padding: "0.5rem 1rem 1rem" }}>
              {pushSelected.size > 0 && (
                <button type="button" className="btn btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#6c757d", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
                  onClick={() => setPushSelected(new Set())}>Clear</button>
              )}
              <button type="button" className="btn btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px", border: "1px solid #c8c2b8", borderRadius: 2, height: 24 }}
                onClick={() => setPushModal(false)}>Cancel</button>
              {pushSelected.size > 0 && (
                <button type="button" className="btn btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px", backgroundColor: "#0006b1", color: "#fefdfc", border: "none", borderRadius: 2, height: 24 }}
                  onClick={async () => {
                    try {
                      const selected = (survey.observations || []).filter(o => selectedObs.has(o.id));
                      let count = 0;
                      for (const surveyId of pushSelected) {
                        for (const obs of selected) {
                          if (pushType === "photo" && !obs.image) continue;
                          const needsImage = (pushType === "photo" || pushType === "textphoto") && obs.image;
                          if (needsImage) {
                            try {
                              const imgRes = await fetch(obs.image);
                              const blob = await imgRes.blob();
                              const fd = new FormData();
                              fd.append("survey", surveyId);
                              fd.append("is_draft", "true");
                              if (pushType === "textphoto" || pushType === "text") fd.append("title", obs.title || "");
                              fd.append("image", blob, "photo.jpg");
                              await api.post("/api/observations/", fd, { headers: { "Content-Type": "multipart/form-data" } });
                              count++;
                            } catch (e) { console.error("Image copy failed:", e); }
                          } else {
                            await api.post("/api/observations/", { survey: parseInt(surveyId), title: obs.title || "", is_draft: true });
                            count++;
                          }
                        }
                      }
                      setPushModal(false);
                      setUseMode(false);
                      setSelectedObs(new Set());
                      fetchSurvey();
                      alert(`${count} draft observation${count !== 1 ? "s" : ""} created.`);
                    } catch (err) { alert("Failed to create drafts."); }
                  }}>Add ({pushSelected.size} {pushSelected.size === 1 ? "survey" : "surveys"})</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyDetail;
