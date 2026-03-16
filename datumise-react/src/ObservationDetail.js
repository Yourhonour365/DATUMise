import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Form, Alert, Modal } from "react-bootstrap";
import api from "./api/api";
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

    if (window.location.hash === "#comment-form") {
      setTimeout(() => {
        const input = document.getElementById("comment-input");
        if (input) input.focus();
      }, 100);
    }
  }, [id]);

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

  if (!observation) {
    return <p className="container mt-3">Loading observation...</p>;
  }

  return (
    <div className="container mt-3 px-3">
      <div className="mb-3 d-none d-md-block">
        {location.state?.fromSurvey ? (
          <Link to={`/surveys/${location.state.surveyId}`} className="text-decoration-none">
            &larr; Back to Survey
          </Link>
        ) : (
          <Link to="/observations" className="text-decoration-none">
            &larr; Back to Observations
          </Link>
        )}
      </div>

      {/* ---- Image ---- */}
      {observation.image ? (
        <img
          src={observation.image}
          alt={observation.title}
          className="img-fluid rounded-top mb-0"
          style={{ width: "100%", maxHeight: "300px", objectFit: "cover", cursor: "pointer" }}
          onClick={() => setShowImageModal(true)}
        />
      ) : (
        <div
          className="d-flex align-items-center justify-content-center rounded-top mb-0"
          style={{ width: "100%", height: "140px", backgroundColor: "#ecf0f1", cursor: "pointer" }}
          onClick={() => observation.can_edit && fileInputRef.current?.click()}
        >
          <span className="text-muted text-center">
            {observation.can_edit ? <>Add image<br /><strong>+</strong></> : "No image"}
          </span>
        </div>
      )}

      {/* ---- Observation fieldset ---- */}
      <div className="rounded-bottom px-2 py-2 mb-2" style={{ background: "#f0ece4" }}>
        <div className="px-1 pb-2" style={{ overflowWrap: "anywhere" }}>
          {observation.title}
        </div>
        <div className="d-flex align-items-center justify-content-between px-1 pt-1" style={{ borderTop: "1px solid #e0dbd2" }}>
          <div className="d-flex align-items-center gap-3" style={{ fontSize: "0.75rem" }}>
            {!observation.is_owner && localStorage.getItem("token") ? (
              <button
                className="btn btn-sm d-flex align-items-center gap-1 p-0 border-0 bg-transparent"
                onClick={handleLike}
                style={{ fontSize: "0.75rem" }}
              >
                <img src="/datumise-like.svg" alt="" width="14" height="14" style={{ opacity: observation.is_liked ? 1 : 0.4, filter: observation.is_liked ? "invert(20%) sepia(90%) saturate(3000%) hue-rotate(120deg) brightness(0.5)" : "none" }} />
                <span className="text-muted">{observation.likes_count || 0}</span>
              </button>
            ) : (
              <div className="d-flex align-items-center gap-1 text-muted">
                <img src="/datumise-like.svg" alt="" width="14" height="14" style={{ opacity: 0.4 }} />
                {observation.likes_count || 0}
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
              {comments.length}
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
          <div className="fst-italic text-muted" style={{ fontSize: "0.68rem" }}>
            {new Date(observation.created_at).toLocaleString("en-GB", {
              day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
            })}
            {observation.site_name && ` \u00B7 ${observation.site_name}`}
            {observation.owner && ` \u00B7 ${observation.owner}`}
          </div>
        </div>
      </div>

      {/* ---- Internal note (survey context + owner/admin only) ---- */}
      {location.state?.fromSurvey && observation.internal_note && (
        <fieldset className="border rounded pt-0 pb-1 px-2 mb-2">
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
      <fieldset className="rounded pt-0 pb-1 px-2 mb-3" style={{ border: "none", background: "#faf6ef" }}>
        <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
          Comments
        </legend>

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
            <div key={comment.id} className="py-2 px-2 mb-1 rounded" style={{ background: isReply ? "#faf6ef" : "#f5f0e8", marginLeft: isReply ? "1.5rem" : 0 }}>
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
                  <div style={{ fontSize: isReply ? "0.8rem" : "0.85rem", overflowWrap: "anywhere" }}>{comment.content}</div>
                  <div className="d-flex align-items-center justify-content-between mt-1" style={{ fontSize: "0.72rem" }}>
                    <div className="d-flex align-items-center gap-2">
                      {!comment.is_owner && !comment.is_observation_owner && (
                        <button
                          className="btn btn-link btn-sm p-0 text-muted d-inline-flex align-items-center gap-1"
                          style={{ fontSize: "0.72rem", textDecoration: "none" }}
                          onClick={() => handleCommentLike(comment.id)}
                        >
                          <img src="/datumise-like.svg" alt="" width="12" height="12" style={{ opacity: comment.is_liked ? 1 : 0.4, filter: comment.is_liked ? "invert(20%) sepia(90%) saturate(3000%) hue-rotate(120deg) brightness(0.5)" : "none" }} />
                          {comment.likes_count || 0}
                        </button>
                      )}
                      {!isReply && (
                        <button
                          className="btn btn-link btn-sm p-0 text-muted"
                          style={{ fontSize: "0.72rem", textDecoration: "none", fontWeight: replyToCommentId === comment.id ? 700 : 400 }}
                          onClick={() => { setReplyToCommentId(replyToCommentId === comment.id ? null : comment.id); setShowCommentInput(false); }}
                        >
                          Reply
                        </button>
                      )}
                      {comment.is_owner && (
                        <button className="btn btn-link btn-sm p-0 border-0 bg-transparent d-inline-flex align-items-center" style={{ textDecoration: "none" }} onClick={() => handleEditClick(comment)}>
                          <img src="/datumise-edit.svg" alt="Edit" width="12" height="12" style={{ filter: "invert(8%) sepia(100%) saturate(7000%) hue-rotate(240deg) brightness(0.8) contrast(1.2)" }} />
                        </button>
                      )}
                      {(comment.is_owner || comment.is_observation_owner) && (
                        <button className="btn btn-link btn-sm p-0 border-0 bg-transparent d-inline-flex align-items-center" style={{ textDecoration: "none" }} onClick={() => handleDeleteComment(comment.id)}>
                          <img src="/datumise_delete.svg" alt="Delete" width="12" height="12" style={{ filter: "invert(20%) sepia(90%) saturate(5000%) hue-rotate(350deg) brightness(0.9)" }} />
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: "0.6rem", color: "#95a5a6", fontStyle: "italic" }}>
                      {comment.owner} &bull;{" "}
                      {new Date(comment.created_at).toLocaleString("en-GB", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                </>
              )}
              {replyToCommentId === comment.id && localStorage.getItem("token") && (
                <div className="d-flex gap-1 mt-2 mb-1">
                  <input
                    id="comment-input"
                    type="text"
                    className="form-control form-control-sm"
                    style={{ fontSize: "0.78rem" }}
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
              {repliesMap[comment.id] && repliesMap[comment.id].map((reply) => renderComment(reply, true))}
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

      </fieldset>

      {/* ---- Image preview modal ---- */}
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered size="lg">
        <Modal.Header closeButton className="pb-2">
          <Modal.Title>Image preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-0" style={{ background: "#2c3e50" }}>
          {observation.image ? (
            <img src={observation.image} alt={observation.title} className="img-fluid" style={{ maxHeight: "80vh", objectFit: "contain" }} />
          ) : (
            <p className="text-muted fst-italic">No image yet.</p>
          )}
        </Modal.Body>
        <div className="survey-capture-actions">
          <div className="capture-footer-grid" style={observation.can_edit && location.state?.fromSurvey ? {} : { gridTemplateColumns: "1fr" }}>
            {observation.can_edit && location.state?.fromSurvey && (
              <>
                <button
                  type="button"
                  className="capture-footer-btn"
                  aria-label={observation.image ? "Change Image" : "Add Image"}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: "#db440a" }}
                >
                  <img src="/camera.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
                </button>
                <button
                  type="button"
                  className="capture-footer-btn"
                  aria-label="Delete observation"
                  onClick={handleDelete}
                  style={{ background: "#dc3545" }}
                >
                  <img src="/datumise_delete.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
                </button>
              </>
            )}
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Close"
              onClick={() => setShowImageModal(false)}
              style={{ background: "#2c3e50" }}
            >
              <img src="/datumise-return.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
          </div>
        </div>
      </Modal>

      <ReturnButton to={location.state?.fromSurvey ? `/surveys/${location.state.surveyId}` : "/observations"} />
      <BackToTop />
    </div>
  );
}

export default ObservationDetail;
