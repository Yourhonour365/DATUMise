import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import api from "./api/api";
import { thumbnailUrl } from "./imageUtils";
import ObservationCreateForm from "./ObservationCreateForm";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";


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
  const [observationSuccess, setObservationSuccess] = useState(false);
  const [observationFading, setObservationFading] = useState(false);
  const [observationCount, setObservationCount] = useState(0);
  const [durationTick, setDurationTick] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
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

    const archiveSurvey = async () => {
        const confirmed = window.confirm(
            "Archive this survey?\n\nAll history will be preserved but the survey will be closed."
        );
        if (!confirmed) return;
        try {
            await api.patch(`/api/surveys/${id}/`, {
                status: "archived",
                closure_reason: "cancelled",
            });
            fetchSurvey();
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to archive survey.";
            window.alert(msg);
        }
    };

    const reopenSurvey = async () => {
        // New-domain write: "assigned" moves the survey from completed back to
        // in-progress (no active session). No session lifecycle involved.
        try {
            await api.patch(`/api/surveys/${id}/`, { status: "assigned" });
            fetchSurvey();
        } catch (err) {
            console.log(err);
        }
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
          {/* ---- Row 1: schedule + status + actions ---- */}
          <div className="d-flex align-items-center justify-content-between mb-1 gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
              <span style={{ fontSize: "0.92rem", fontWeight: 600, lineHeight: 1.2, color: "#1A1D21" }}>
                {(() => {
                  const scheduled = survey.scheduled_for ? new Date(survey.scheduled_for) : null;
                  const visitReq = survey.visit_requirement;
                  const schedStatus = survey.schedule_status;
                  if (!visitReq) return scheduled ? scheduled.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "\u2014";
                  if (visitReq === "unrestricted") return "Self-scheduling";
                  if (!scheduled) return "Pre-arranged";
                  const dateStr = scheduled.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                  if (schedStatus === "provisional") return `${dateStr} \u00B7 Provisional`;
                  const hasTime = scheduled.getHours() !== 0 || scheduled.getMinutes() !== 0;
                  const timeStr = hasTime
                    ? scheduled.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                    : "";
                  return timeStr ? `${dateStr} \u00B7 ${timeStr}` : dateStr;
                })()}
              </span>
              {survey.current_session_status !== "paused" && (
                <span
                  className={`badge ${
                    (survey.status === "planned" || survey.status === "open") ? "bg-secondary" :
                    survey.current_session_status === "active" ? "bg-success" :
                    (survey.status === "submitted" || (survey.status === "assigned" && survey.current_session_status === null)) ? "bg-secondary" :
                    survey.status === "completed" ? "bg-dark" :
                    (survey.status === "missed" || (survey.status === "archived" && survey.closure_reason === "missed")) ? "bg-warning" :
                    (survey.status === "cancelled" || (survey.status === "archived" && survey.closure_reason !== "missed")) ? "bg-danger" :
                    "bg-secondary"
                  }`}
                  style={{ fontSize: "0.7rem" }}
                >
                  {survey.status_display}
                </span>
              )}
              {survey.session_count > 0 && (
                <span style={{ fontSize: "0.75rem", color: "#1A1D21" }}>
                  Session {survey.current_session_number ?? survey.session_count} of {survey.session_count}
                </span>
              )}
              {survey.current_session_status === "active" && (
                <span className="d-inline-flex align-items-center gap-1 text-muted" style={{ fontSize: "0.78rem" }}>
                  <img src="/datumise_timer.svg" alt="" width="11" height="11" style={{ opacity: 0.55 }} />
                  {formatSurveyDuration(survey.created_at, durationTick)}
                </span>
              )}
            </div>
            <div className="d-flex gap-2 flex-shrink-0 flex-wrap align-items-center">
              {survey.status === "draft" && survey.is_admin && (
                <button className="btn btn-success btn-sm" onClick={openSurvey}>Open Survey</button>
              )}
              {!survey.assigned_to && (survey.status === "planned" || survey.status === "open") && (
                <button className="btn btn-primary btn-sm" onClick={assignSurvey}>Assign to me</button>
              )}
              {(survey.status === "planned" || survey.status === "open") && survey.is_surveyor && survey.assigned_to && (
                <button className="btn btn-success btn-sm" onClick={startSurvey}>Start</button>
              )}
              {survey.current_session_status === "active" && survey.is_surveyor && (
                <>
                  <button className="btn btn-warning btn-sm" onClick={pauseSurvey}>Pause</button>
                  <button className="btn btn-secondary btn-sm" onClick={completeSession}>Complete Session</button>
                  <button
                    className="btn btn-outline-success btn-sm d-none d-lg-inline-block"
                    onClick={() => setShowObservationModal(true)}
                  >
                    + Observation
                  </button>
                  <Link
                    to={`/surveys/${id}/capture`}
                    className="btn btn-outline-success btn-sm d-lg-none"
                  >
                    + Observation
                  </Link>
                </>
              )}
              {survey.current_session_status === "paused" && survey.is_surveyor && survey.assigned_to && (
                <>
                  <button className="btn btn-success btn-sm" onClick={resumeSurvey}>Resume session</button>
                  <button className="btn btn-secondary btn-sm" onClick={completeSession}>Complete Session</button>
                </>
              )}
              {(survey.status === "submitted" || (survey.status === "assigned" && survey.current_session_status === null)) && survey.is_surveyor && (
                <>
                  <button className="btn btn-success btn-sm" onClick={startNewSession}>Start New Session</button>
                  <button className="btn btn-dark btn-sm" onClick={completeSurvey}>Complete Survey</button>
                </>
              )}
              {survey.status === "completed" && survey.is_surveyor && (
                <button className="btn btn-outline-secondary btn-sm" onClick={reopenSurvey}>Reopen</button>
              )}
              {survey.is_admin && survey.status !== "archived" && (
                <>
                  {survey.session_count === 0 && (survey.observations?.length ?? 0) === 0 && (
                    <button className="btn btn-outline-danger btn-sm" onClick={deleteSurvey}>Delete</button>
                  )}
                  <button className="btn btn-outline-secondary btn-sm" onClick={archiveSurvey}>Archive</button>
                </>
              )}
              <Link
                to={`/surveys/${id}/edit`}
                className="btn p-0 border-0 bg-transparent edit-icon-circle"
                onClick={(e) => e.stopPropagation()}
              >
                <img src="/datumise-edit.svg" alt="Edit" width="14" height="14" style={{ filter: "invert(22%) sepia(90%) saturate(1500%) hue-rotate(213deg) brightness(70%) contrast(95%)" }} />
              </Link>
              <button
                type="button"
                className="btn p-0 border-0 bg-transparent"
                onClick={() => setShowDetails((prev) => !prev)}
                aria-label={showDetails ? "Hide survey details" : "Show survey details"}
                style={{ opacity: 0.4 }}
              >
                <img src="/datumise-down-chev.svg" alt="" width="16" height="16" style={{ transform: showDetails ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", filter: "brightness(0) saturate(100%) invert(9%) sepia(10%) saturate(1000%) hue-rotate(180deg) brightness(95%)" }} />
              </button>
            </div>
          </div>

          {/* ---- Row 2: client / site ---- */}
          <div className="mb-0" style={{ fontSize: "0.82rem", fontWeight: 500, color: "#1A1D21" }}>
            {survey.client && survey.site
              ? `${survey.client} \u2013 ${survey.site}`
              : survey.client || survey.site || "No client / site"}
          </div>

          {/* ---- Row 3: due + surveyor + client present + urgent ---- */}
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap" style={{ fontSize: "0.78rem", color: "#1A1D21" }}>
            {survey.due_by && (
              <>
                <span>Due {new Date(survey.due_by).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span>{"\u00B7"}</span>
              </>
            )}
            <span>{survey.assigned_to || "Unassigned"}</span>
            <span>{"\u00B7"}</span>
            <span>{survey.client_present ? "Client attending" : "Client not attending"}</span>
            {!!(survey.is_urgent ?? survey.urgent) && (
              <>
                <span>{"\u00B7"}</span>
                <span className="badge bg-danger" style={{ fontSize: "0.65rem" }}>URGENT</span>
              </>
            )}
          </div>

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
                    <span>{survey.assigned_to || "Unassigned"}</span>
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
                  {survey.schedule_status && (
                    <div className="survey-detail-item">
                      <span className="survey-detail-label">Schedule status</span>
                      <span>{{ self_scheduled: "Self-scheduled", provisional: "Provisional", booked: "Booked" }[survey.schedule_status] || survey.schedule_status}</span>
                    </div>
                  )}
                  {survey.visit_time && (
                    <div className="survey-detail-item">
                      <span className="survey-detail-label">Visit time</span>
                      <span>{{ anytime: "Anytime", window: "Time window", appointment: "Appointment" }[survey.visit_time] || survey.visit_time}</span>
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
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0">
              Observations
              <span className="text-muted fw-normal ms-1" style={{ fontSize: "0.85rem" }}>
                ({survey.observations?.length || 0})
              </span>
            </h6>
            <div className="d-flex align-items-center gap-2">
              {useMode && selectedObs.size > 0 && (
                <>
                  <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                    style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#2E5E3E", color: "#fefdfc", border: "none", borderRadius: 4 }}
                    onClick={async () => {
                      try {
                        const obsTexts = (survey.observations || []).filter(o => selectedObs.has(o.id)).map(o => o.title);
                        await Promise.all(obsTexts.map(title => api.post("/api/observations/", { survey: survey.id, title, is_draft: true })));
                        setUseMode(false);
                        setSelectedObs(new Set());
                        fetchSurvey();
                        alert(`${obsTexts.length} draft observation${obsTexts.length !== 1 ? "s" : ""} created.`);
                      } catch (err) {
                        console.error(err);
                        alert("Failed to create draft observations.");
                      }
                    }}>
                    <img src="/draft.svg" alt="" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} />
                    Create drafts ({selectedObs.size})
                  </button>
                  <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                    style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#0006b1", color: "#fefdfc", border: "none", borderRadius: 4 }}
                    onClick={async () => {
                      const withImages = (survey.observations || []).filter(o => selectedObs.has(o.id) && o.image);
                      if (withImages.length === 0) {
                        alert("No selected observations have images.");
                        return;
                      }
                      try {
                        await Promise.all(withImages.map(o => api.post("/api/observations/", { survey: survey.id, title: "", image: o.image, is_draft: true })));
                        setUseMode(false);
                        setSelectedObs(new Set());
                        fetchSurvey();
                        alert(`${withImages.length} photo draft${withImages.length !== 1 ? "s" : ""} created.`);
                      } catch (err) {
                        console.error(err);
                        alert("Failed to create photo drafts.");
                      }
                    }}>
                    <img src="/clipboard.svg" alt="" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} />
                    Copy photo ({(survey.observations || []).filter(o => selectedObs.has(o.id) && o.image).length})
                  </button>
                  <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                    style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: "#c0392b", color: "#fefdfc", border: "none", borderRadius: 4 }}
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
                    Delete ({selectedObs.size})
                  </button>
                </>
              )}
              <button type="button" className="btn btn-sm d-flex align-items-center gap-1"
                style={{ fontSize: "0.75rem", padding: "3px 12px", backgroundColor: useMode ? "#0006b1" : "#db440a", color: "#fefdfc", border: "none", borderRadius: 4 }}
                onClick={() => { setUseMode(!useMode); if (useMode) setSelectedObs(new Set()); }}>
                <img src="/use.svg" alt="" width="14" height="14" style={{ filter: "brightness(0) invert(1)" }} />
                {useMode ? `Select (${selectedObs.size})` : "Select"}
              </button>
            </div>
          </div>

          {/* ---- Observation list ---- */}
          {survey.observations?.length === 0 && (
            <p className="text-muted" style={{ fontSize: "0.85rem" }}>
              No observations have been added to this survey yet.
            </p>
          )}

          <div id="observations-list" style={{ opacity: scrollReady ? 1 : 0 }}>
            {survey?.observations?.map((observation, index) => (
              <div
                key={observation.id}
                id={`obs-${observation.id}`}
                className="text-decoration-none text-dark"
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  if (useMode) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    if (clickX > rect.width * 0.8) {
                      setSelectedObs(prev => { const next = new Set(prev); if (next.has(observation.id)) next.delete(observation.id); else next.add(observation.id); return next; });
                      return;
                    }
                  }
                  const obsIds = survey.observations.map((o) => o.id);
                  navigate(`/observations/${observation.id}`, { state: { fromSurvey: true, surveyId: id, returnHighlight: observation.id, observationIds: obsIds, observationIndex: obsIds.indexOf(observation.id), obsCreatedAt: observation.created_at, obsOwner: observation.owner } });
                }}
              >
                <div
                  className={`observation-row${highlightedObs === observation.id ? " observation-row-highlight" : ""}`}
                  onMouseEnter={() => { if (highlightedObs && highlightedObs !== observation.id) setHighlightedObs(null); }}
                  style={{ padding: 0, alignItems: "stretch", overflow: "hidden", gap: 0, height: "80px", background: "#FAF8F3", borderRadius: "3px", border: "1px solid transparent", borderBottom: "1px solid #e2ddd3", position: "relative" }}
                >
                  {observation.image ? (
                    <img
                      src={thumbnailUrl(observation)}
                      alt=""
                      loading="lazy"
                      style={{ width: "80px", minHeight: "100%", objectFit: "cover", borderRadius: "3px 0 0 3px", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: "80px", minHeight: "100%", borderRadius: "3px 0 0 3px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#e9ecef" }}>
                      <span style={{ fontSize: "0.65rem", color: "#2c3e50" }}>No img</span>
                    </div>
                  )}
                  <div className="observation-row-content d-flex flex-column justify-content-between" style={{ padding: "0.3rem 0.4rem", overflow: "hidden" }}>
                    <div className="observation-row-title" style={{ lineHeight: 1.2 }}>
                      {observation.is_draft && (
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, background: "#db440a", color: "#fff", borderRadius: "3px", padding: "1px 4px", marginRight: "5px", verticalAlign: "middle" }}>DRAFT</span>
                      )}
                      {observation.title}
                    </div>
                    <div className="observation-row-meta d-flex align-items-center justify-content-start gap-2" style={{ lineHeight: 1, marginTop: "0.1rem", flexShrink: 0, color: "#1A1D21" }}>
                  <span style={{ fontStyle: "normal" }}>{new Date(observation.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span style={{ fontStyle: "normal" }}>{survey.observations.length - index} of {survey.observations.length}</span>
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
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/observations/${observation.id}`, { state: { fromSurvey: true, surveyId: id, openComment: true } }); }}
                  >
                    <img src="/datumise-comment.svg" alt="" width="11" height="11" style={{ opacity: 0.5 }} />
                    {observation.comment_count || 0}
                  </button>
                  <span>{new Date(observation.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  {useMode && (
                    <div onClick={(e) => { e.stopPropagation(); setSelectedObs(prev => { const next = new Set(prev); if (next.has(observation.id)) next.delete(observation.id); else next.add(observation.id); return next; }); }}
                      style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "2px solid #0006b1", backgroundColor: selectedObs.has(observation.id) ? "#0006b1" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      {selectedObs.has(observation.id) && <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
}

export default SurveyDetail;
