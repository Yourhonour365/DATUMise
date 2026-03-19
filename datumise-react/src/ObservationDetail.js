import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Form, Alert, Modal } from "react-bootstrap";
import api from "./api/api";
import { thumbnailUrl, lightboxUrl } from "./imageUtils";
import BackToTop from "./BackToTop";
import ReturnButton from "./ReturnButton";

function ObservationDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [observation, setObservation] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState("");
  const [commentError, setCommentError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [replyToCommentId, setReplyToCommentId] = useState(null);

  const fetchComments = async () => {
    try {
      const response = await api.get(`/api/comments/?observation=${id}`);
      setComments(response.data.results);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  useEffect(() => {
    const fetchObservation = async () => {
      try {
        const response = await api.get(`/api/observations/${id}/`);
        setObservation(response.data);
      } catch (err) {
        console.error("Error fetching observation:", err);
      }
    };

    fetchObservation();
    fetchComments();

    if (window.location.hash === "#comment-form" || location.state?.openComment) {
      setShowCommentInput(true);
      setTimeout(() => {
        const input = document.getElementById("comment-input");
        if (input) input.focus();
      }, 200);
    }
  }, [id, location.state?.openComment]);

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this observation?");
    if (!confirmed) return;
    try {
      await api.delete(`/api/observations/${id}/`);
      navigate("/observations");
    } catch (err) {
      console.error("Error deleting observation:", err);
    }
  };

  const handleCommentSubmit = async (e, parentId = null) => {
    e.preventDefault();
    setCommentError("");
    try {
      const payload = { observation: id, content: commentContent };
      if (parentId) payload.parent = parentId;
      await api.post("/api/comments/", payload);
      setCommentContent("");
      fetchComments();
    } catch (err) {
      console.error("Error creating comment:", err);
      setCommentError("Failed to post comment. Please try again.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;
    try {
      await api.delete(`/api/comments/${commentId}/`);
      fetchComments();
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  const handleImageReplace = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("title", observation.title);
    formData.append("description", observation.description);
    formData.append("image", selectedFile);
    try {
      await api.put(`/api/observations/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const response = await api.get(`/api/observations/${id}/`);
      setObservation(response.data);
      event.target.value = null;
    } catch (err) {
      console.error("Error replacing image:", err);
    }
  };

  const handleEditClick = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentContent("");
  };

  const handleUpdateComment = async (commentId) => {
    try {
      await api.put(`/api/comments/${commentId}/`, { observation: id, content: editCommentContent });
      setEditingCommentId(null);
      setEditCommentContent("");
      fetchComments();
    } catch (err) {
      console.error("Error updating comment:", err);
    }
  };

  const handleLike = async () => {
    try {
      const response = await api.post(`/api/observations/${id}/like/`);
      setObservation((prev) => ({ ...prev, is_liked: response.data.liked, likes_count: response.data.likes_count }));
    } catch (err) {
      console.log(err);
    }
  };

  const handleCommentLike = async (commentId) => {
    try {
      const response = await api.post(`/api/comments/${commentId}/like/`);
      setComments((prev) =>
        prev.map((c) => c.id === commentId ? { ...c, is_liked: response.data.liked, likes_count: response.data.likes_count } : c)
      );
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (location.state?.autoOpenImage && observation?.image) {
      setShowImageModal(true);
    }
  }, [observation, location.state?.autoOpenImage]);

  if (!observation) {
    return <p className="container mt-3">Loading observation...</p>;
  }

  const obsIds = location.state?.observationIds || [];
  const obsIdx = location.state?.observationIndex ?? obsIds.indexOf(Number(id));
  const prevObsId = obsIdx > 0 ? obsIds[obsIdx - 1] : null;
  const nextObsId = obsIdx < obsIds.length - 1 ? obsIds[obsIdx + 1] : null;

  const goToObs = (targetId, newIdx, openImage = false) => {
    if (window.__obsListCache) window.__obsListCache.highlightId = targetId;
    navigate(`/observations/${targetId}`, {
      replace: true,
      state: { ...location.state, returnHighlight: targetId, observationIndex: newIdx, autoOpenImage: openImage || false },
    });
  };

  const returnTo = location.state?.fromSurvey
    ? { path: `/surveys/${location.state.surveyId}`, state: { highlightObs: Number(id) } }
    : { path: "/observations", state: undefined };

  const handleLoadMore = async () => {
    const url = location.state?.nextPage;
    if (!url) return;
    try {
      const response = await api.get(url);
      const newObs = response.data.results;
      const updatedIds = [...obsIds, ...newObs.map(o => o.id)];
      if (window.__obsListCache) {
        window.__obsListCache.observations = [...(window.__obsListCache.observations || []), ...newObs];
        window.__obsListCache.nextPage = response.data.next;
      }
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, observationIds: updatedIds, nextPage: response.data.next },
      });
    } catch (err) {
      console.error("Failed to load more observations:", err);
    }
  };

  return (
    <div style={{ overflow: "hidden", paddingBottom: obsIds.length > 0 ? "80px" : undefined, backgroundColor: "#E2DDD3", minHeight: "100vh" }}>
      <div className="container px-3 mt-3 mb-3 d-none d-md-block">
        {location.state?.fromSurvey ? (
          <Link to={`/surveys/${location.state.surveyId}`} state={{ highlightObs: Number(id) }} className="text-decoration-none">
            &larr; Back to Survey
          </Link>
        ) : (
          <Link to="/observations" className="text-decoration-none">
            &larr; Back to Observations
          </Link>
        )}
      </div>

      {/* ---- Two-column on desktop, stacked on mobile ---- */}
      <div className="obs-detail-main">

      {/* ---- Image ---- */}
      <div style={{ position: "relative" }}>
        {observation.image ? (
          <img
            src={thumbnailUrl(observation)}
            alt={observation.title}
            className="obs-detail-img"
            onClick={() => setShowImageModal(true)}
          />
        ) : (
          <div
            className="obs-detail-img-placeholder"
            onClick={() => observation.can_edit && fileInputRef.current?.click()}
          >
            <span className="text-muted text-center">
              {observation.can_edit ? <>Add image<br /><strong>+</strong></> : "No image"}
            </span>
          </div>
        )}
        {location.state?.fromSurvey && observation.survey_status === "paused" && observation.is_owner && (
          <button
            type="button"
            className="w-100"
            style={{ position: "absolute", bottom: 0, left: 0, background: "rgba(219, 68, 10, 0.9)", color: "#faf6ef", border: "none", padding: "0.6rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
            onClick={async () => {
              try {
                await api.patch(`/api/surveys/${location.state.surveyId}/`, { status: "live" });
                navigate(`/surveys/${location.state.surveyId}/capture`);
              } catch (err) {
                console.error("Failed to resume survey:", err);
              }
            }}
          >
            Resume session
          </button>
        )}
      </div>

      {/* ---- Content (right column on desktop) ---- */}
      <div>

      {/* ---- Observation fieldset ---- */}
      <div className="pt-0 pb-0 mb-0" style={{ background: "#FAF8F3" }}>
        <div className="obs-detail-desc" style={{ paddingLeft: "0.4rem", paddingRight: "0.4rem" }}>
          {observation.title}
        </div>
        <div className="d-flex align-items-center justify-content-between" style={{ height: "24px", flexShrink: 0, background: "#FAF8F3", paddingLeft: "0.4rem", paddingRight: "0.4rem" }}>
          <div className="d-flex align-items-center gap-3" style={{ fontSize: "0.75rem" }}>
            {!observation.is_owner && localStorage.getItem("token") ? (
              <button
                className="btn btn-sm d-flex align-items-center gap-1 p-0 border-0 bg-transparent"
                onClick={handleLike}
                style={{ fontSize: "0.75rem" }}
              >
                <img src="/datumise-like.svg" alt="" width="14" height="14" style={{ opacity: observation.is_liked ? 1 : 0.4, filter: observation.is_liked ? "invert(20%) sepia(90%) saturate(3000%) hue-rotate(120deg) brightness(0.5)" : "none" }} />
                <span className="text-muted" style={{ display: "inline-block", minWidth: "2em", textAlign: "right" }}>{observation.likes_count || 0}</span>
              </button>
            ) : (
              <div className="d-flex align-items-center gap-1 text-muted">
                <img src="/datumise-like.svg" alt="" width="14" height="14" style={{ opacity: 0.4 }} />
                <span style={{ display: "inline-block", minWidth: "2em", textAlign: "right" }}>{observation.likes_count || 0}</span>
              </div>
            )}
            <button
              className="btn btn-sm d-flex align-items-center gap-1 p-0 border-0 bg-transparent text-muted"
              onClick={() => {
                setReplyToCommentId(null);
                setShowCommentInput((prev) => !prev);
              }}
              style={{ fontSize: "0.75rem" }}
            >
              <img src="/datumise-comment.svg" alt="" width="12" height="12" style={{ opacity: showCommentInput ? 1 : 0.5 }} />
              <span style={{ display: "inline-block", minWidth: "2em", textAlign: "right" }}>{comments.length}</span>
            </button>
            <button
              className="btn btn-sm d-flex align-items-center p-0 border-0 bg-transparent"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: observation.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              style={{ fontSize: "0.75rem" }}
            >
              <img src="/share.svg" alt="Share" width="14" height="14" />
            </button>
          </div>
          <div className="fst-italic text-muted" style={{ fontSize: "0.68rem", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%" }}>
            {[observation.site_name, observation.owner].filter(Boolean).join(" \u00B7 ")}
          </div>
        </div>
      </div>

      {/* ---- Internal note (survey context + owner/admin only) ---- */}
      {location.state?.fromSurvey && observation.internal_note && (
        <fieldset className="border rounded pt-0 pb-1 px-2 mb-2" style={{ margin: 0 }}>
          <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
            Internal Note
          </legend>
          <div className="p-1 text-muted fst-italic" style={{ fontSize: "0.85rem", overflowWrap: "anywhere" }}>
            {observation.internal_note}
          </div>
        </fieldset>
      )}


      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageReplace}
      />

      {/* ---- Comments fieldset ---- */}
      <div className="mb-3" style={{ background: "#E2DDD3", paddingLeft: "0.5rem", paddingRight: "0.5rem" }}>
        <div className="px-2 py-1 fs-6 fw-bold text-dark" style={{ background: "#E2DDD3" }}>
          Comments
        </div>

        {showCommentInput && !replyToCommentId && localStorage.getItem("token") && (
          <>
            {commentError && <Alert variant="danger" className="py-1 px-2 mb-1" style={{ fontSize: "0.8rem" }}>{commentError}</Alert>}
            <div className="d-flex gap-1 mt-1 mb-2">
              <input
                id="comment-input"
                type="text"
                className="form-control form-control-sm"
                style={{ fontSize: "0.78rem" }}
                placeholder="Write a comment..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCommentSubmit(e); } }}
              />
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: "#DB440A", color: "#faf6ef", border: "1px solid #faf6ef", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}
                onClick={handleCommentSubmit}
                disabled={!commentContent.trim()}
              >
                Send
              </button>
            </div>
          </>
        )}

        {(() => {
          const topLevel = comments.filter((c) => !c.parent);
          const repliesMap = {};
          comments.filter((c) => c.parent).forEach((c) => {
            if (!repliesMap[c.parent]) repliesMap[c.parent] = [];
            repliesMap[c.parent].push(c);
          });

          const renderComment = (comment, isReply = false) => (
            <div key={comment.id} style={{ background: isReply ? "#FEFDFD" : "#F7F4EE", marginLeft: isReply ? "1.5rem" : 0, marginBottom: "0.4rem", borderRadius: "6px", padding: "0.4rem 0.6rem", overflow: "hidden", minWidth: 0 }}>
              {editingCommentId === comment.id ? (
                <>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editCommentContent}
                    onChange={(e) => setEditCommentContent(e.target.value)}
                    className="mb-2"
                    style={{ fontSize: "0.85rem" }}
                  />
                  <div className="d-flex gap-2">
                    <button className="btn btn-success btn-sm" style={{ fontSize: "0.75rem" }} onClick={() => handleUpdateComment(comment.id)}>Save</button>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem" }} onClick={handleCancelEdit}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: isReply ? "0.8rem" : "0.85rem", overflowWrap: "anywhere", color: "#1a2332" }}>{comment.content}</div>
                  <div className="d-flex align-items-center justify-content-start gap-2 flex-wrap mt-1" style={{ fontSize: "0.6rem", color: "#95a5a6" }}>
                      <span>{new Date(comment.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>{new Date(comment.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      <span style={{ fontStyle: "italic" }}>{comment.owner}</span>
                      {!isReply && (
                        <button
                          className="btn btn-link btn-sm p-0 text-muted"
                          style={{ fontSize: "0.6rem", textDecoration: "none", fontWeight: replyToCommentId === comment.id ? 700 : 400 }}
                          onClick={() => { setReplyToCommentId(replyToCommentId === comment.id ? null : comment.id); setShowCommentInput(false); }}
                        >
                          Reply
                        </button>
                      )}
                      <div className="d-flex align-items-center gap-2 ms-auto">
                        {!comment.is_owner && (
                          <button
                            className="btn btn-link btn-sm p-0 text-muted d-inline-flex align-items-center gap-1"
                            style={{ fontSize: "0.6rem", textDecoration: "none" }}
                            onClick={() => handleCommentLike(comment.id)}
                          >
                            <img src="/datumise-like.svg" alt="" width="12" height="12" style={{ opacity: comment.is_liked ? 1 : 0.4, filter: comment.is_liked ? "invert(20%) sepia(90%) saturate(3000%) hue-rotate(120deg) brightness(0.5)" : "none" }} />
                            {comment.likes_count || 0}
                          </button>
                        )}
                        {comment.is_owner && (
                          <button className="btn btn-link btn-sm p-0 border-0 bg-transparent d-inline-flex align-items-center" style={{ textDecoration: "none" }} onClick={() => handleEditClick(comment)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#0013de" opacity="0.45"><path d="M7.127 22.564l-7.126 1.436 1.438-7.125 5.688 5.689zm-4.274-7.104l5.688 5.689 15.46-15.46-5.689-5.689-15.459 15.46z"/></svg>
                          </button>
                        )}
                        {(comment.is_owner || comment.is_observation_owner) && (
                          <button className="btn btn-link btn-sm p-0 border-0 bg-transparent d-inline-flex align-items-center" style={{ textDecoration: "none" }} onClick={() => handleDeleteComment(comment.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#d3212f" opacity="0.45"><path d="m20.015 6.506h-16v14.423c0 .591.448 1.071 1 1.071h14c.552 0 1-.48 1-1.071 0-3.905 0-14.423 0-14.423zm-5.75 2.494c.414 0 .75.336.75.75v8.5c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-8.5c0-.414.336-.75.75-.75zm-4.5 0c.414 0 .75.336.75.75v8.5c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-8.5c0-.414.336-.75.75-.75zm-.75-5v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-16.507c-.413 0-.747-.335-.747-.747s.334-.747.747-.747zm4.5 0v-.5h-3v.5z" fillRule="nonzero"/></svg>
                          </button>
                        )}
                      </div>
                  </div>
                </>
              )}
              {replyToCommentId === comment.id && localStorage.getItem("token") && (
                <div className="d-flex gap-1 mt-2 mb-1" style={{ marginLeft: "1.5rem" }}>
                  <input
                    id="comment-input"
                    type="text"
                    className="form-control form-control-sm"
                    style={{ fontSize: "0.78rem", backgroundColor: "#FEFDFD" }}
                    placeholder="Write a reply..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCommentSubmit(e, comment.id); setReplyToCommentId(null); } }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: "#DB440A", color: "#faf6ef", border: "1px solid #faf6ef", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}
                    onClick={(e) => { handleCommentSubmit(e, comment.id); setReplyToCommentId(null); }}
                    disabled={!commentContent.trim()}
                  >
                    Send
                  </button>
                </div>
              )}
              {repliesMap[comment.id] && <div style={{ marginTop: "0.4rem" }}>{repliesMap[comment.id].map((reply) => renderComment(reply, true))}</div>}
            </div>
          );

          return topLevel.length === 0 ? (
            <div className="p-1 text-muted fst-italic" style={{ fontSize: "0.85rem" }}>
              {!localStorage.getItem("token") ? "No comments yet. Login to comment." : "No comments yet, be the first to comment."}
            </div>
          ) : (
            topLevel.map((comment) => renderComment(comment))
          );
        })()}

      </div>

      </div>{/* end content column */}

      </div>{/* end obs-detail-main */}

      {/* ---- Image preview modal ---- */}
      {(() => {
        const d = new Date(observation.created_at);
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, "0");
        const timeStr = `${h % 12 || 12}:${m}${h < 12 ? "am" : "pm"}`;
        const dateStr = `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
        const siteStr = [observation.site_name, observation.site_postcode].filter(Boolean).join(", ");
        return (
          <Modal show={showImageModal} onHide={() => setShowImageModal(false)} fullscreen={true}>
            {obsIds.length > 0 && (
              <div style={{ position: "relative", background: "#1a2332", color: "#faf6ef", display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0.5rem 1rem", flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.3, display: "flex", alignItems: "center", gap: "0.5em" }}>
                    <span>{obsIdx + 1} of {obsIds.length}</span>
                    {observation.is_draft && <span style={{ fontWeight: 700, fontSize: "0.65rem", color: "#db440a", letterSpacing: "0.08em" }}>DRAFT</span>}
                  </div>
                  <div style={{ fontSize: "0.68rem", fontStyle: "italic", lineHeight: 1.3 }}>{dateStr}&nbsp;&nbsp;{timeStr}</div>
                </div>
                <div style={{ textAlign: "left", fontSize: "0.78rem", fontStyle: "italic", lineHeight: 1.3 }}>
                  {siteStr && <div>{siteStr}</div>}
                  <div>{observation.owner}</div>
                </div>
              </div>
            )}
            <Modal.Body className="text-center p-0" style={{ background: "#687374", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {observation.image ? (
                <img src={lightboxUrl(observation)} alt={observation.title} className="img-fluid" style={{ maxHeight: obsIds.length > 0 ? "calc(100vh - 128px)" : "calc(100vh - 80px)", objectFit: "contain", width: "100%" }} />
              ) : (
                <p className="text-muted fst-italic">No image yet.</p>
              )}
            </Modal.Body>
            <div className="survey-capture-actions">
              <div className="capture-footer-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                <div />
                <button
                  type="button"
                  className="capture-footer-btn"
                  aria-label="Previous observation"
                  disabled={!prevObsId}
                  onClick={() => prevObsId && goToObs(prevObsId, obsIdx - 1, true)}
                  style={{ background: prevObsId ? "#1a5bc4" : "#2c3e50" }}
                >
                  <img src="/datumise_back.svg" alt="" width="47" height="47" style={{ filter: prevObsId ? "brightness(0) invert(1)" : "none" }} />
                </button>
                <button
                  type="button"
                  className="capture-footer-btn"
                  aria-label="Next observation"
                  disabled={!nextObsId}
                  onClick={() => nextObsId && goToObs(nextObsId, obsIdx + 1, true)}
                  style={{ background: nextObsId ? "#1a5bc4" : "#2c3e50" }}
                >
                  <img src="/right.svg" alt="" width="47" height="47" style={{ filter: nextObsId ? "brightness(0) invert(1)" : "none" }} />
                </button>
                <button
                  type="button"
                  className="capture-footer-btn"
                  aria-label="Close"
                  onClick={() => setShowImageModal(false)}
                  style={{ background: "#95a5a6" }}
                >
                  <img src="/x.svg" alt="" width="75" height="75" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {obsIds.length > 0 ? (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <div className="survey-capture-actions">
          <div className="capture-footer-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {!nextObsId ? (
              location.state?.nextPage ? (
                <button
                  type="button"
                  className="capture-footer-btn"
                  aria-label="Load more observations"
                  onClick={handleLoadMore}
                  style={{ background: "#db440a" }}
                >
                  <img src="/datumise-load.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
                </button>
              ) : (
                <div className="capture-footer-btn" style={{ cursor: "default" }}>
                  <img src="/end.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)", opacity: 0.7 }} />
                </div>
              )
            ) : (
              <div />
            )}
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Previous observation"
              disabled={!prevObsId}
              onClick={() => prevObsId && goToObs(prevObsId, obsIdx - 1)}
              style={{ background: prevObsId ? "#1a5bc4" : "#2c3e50" }}
            >
              <img src="/datumise_back.svg" alt="" width="47" height="47" style={{ filter: prevObsId ? "brightness(0) invert(1)" : "none" }} />
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Next observation"
              disabled={!nextObsId}
              onClick={() => nextObsId && goToObs(nextObsId, obsIdx + 1)}
              style={{ background: nextObsId ? "#1a5bc4" : "#2c3e50" }}
            >
              <img src="/right.svg" alt="" width="47" height="47" style={{ filter: nextObsId ? "brightness(0) invert(1)" : "none" }} />
            </button>
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Close"
              onClick={() => navigate(returnTo.path, { state: returnTo.state })}
              style={{ background: "#95a5a6" }}
            >
              <img src="/x.svg" alt="" width="75" height="75" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
            </button>
          </div>
        </div>
        </div>
      ) : (
        <>
          <ReturnButton to={returnTo.path} state={returnTo.state} />
          <BackToTop />
        </>
      )}
    </div>
  );
}

export default ObservationDetail;
