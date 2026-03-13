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

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setCommentError("");
    try {
      await api.post("/api/comments/", { observation: id, content: commentContent });
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
          className="img-fluid rounded mb-2"
          style={{ width: "100%", maxHeight: "300px", objectFit: "cover", cursor: "pointer" }}
          onClick={() => setShowImageModal(true)}
        />
      ) : (
        <div
          className="d-flex align-items-center justify-content-center rounded mb-2"
          style={{ width: "100%", height: "140px", backgroundColor: "#ecf0f1", cursor: "pointer" }}
          onClick={() => observation.can_edit && fileInputRef.current?.click()}
        >
          <span className="text-muted text-center">
            {observation.can_edit ? <>Add image<br /><strong>+</strong></> : "No image"}
          </span>
        </div>
      )}

      {/* ---- Date / owner / client ---- */}
      <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
        {new Date(observation.created_at).toLocaleString("en-GB", {
          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        })}
        {observation.owner && ` \u2022 ${observation.owner}`}
      </small>
      {observation.survey_name && (
        <small className="text-muted d-block" style={{ fontSize: "0.7rem", paddingBottom: "0.25rem" }}>
          {observation.survey_name}
        </small>
      )}

      {/* ---- Observation fieldset ---- */}
      <fieldset className="border rounded pt-0 pb-1 px-2 mb-2 mt-2">
        <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
          Observation
        </legend>
        <div className="p-1" style={{ overflowWrap: "anywhere" }}>
          {observation.title}
        </div>
      </fieldset>

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

      {/* ---- Like & Comment ---- */}
      <div className="d-flex align-items-center gap-3 px-2 py-1 mb-2" style={{ fontSize: "0.85rem" }}>
        {!observation.is_owner && localStorage.getItem("token") ? (
          <button
            className="btn btn-sm d-flex align-items-center gap-1 p-0 border-0 bg-transparent"
            onClick={handleLike}
            style={{ fontSize: "0.85rem" }}
          >
            <img
              src="/datumise-like.svg"
              alt=""
              width="18"
              height="18"
              style={{ opacity: observation.is_liked ? 1 : 0.4 }}
            />
            <span className="text-muted">{observation.is_liked ? "Unlike" : "Like"} ({observation.likes_count})</span>
          </button>
        ) : (
          <div className="d-flex align-items-center gap-1 text-muted">
            <img src="/datumise-like.svg" alt="" width="18" height="18" style={{ opacity: 0.4 }} />
            {observation.likes_count || 0}
          </div>
        )}
        <div className="d-flex align-items-center gap-1 text-muted">
          <img src="/datumise-comment.svg" alt="" width="14" height="14" style={{ opacity: 0.5 }} />
          {comments.length}
        </div>
      </div>


      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageReplace}
      />

      {/* ---- Comments fieldset ---- */}
      <fieldset className="border rounded pt-0 pb-1 px-2 mb-2">
        <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
          Comments
        </legend>

        {comments.length === 0 ? (
          <div className="p-1 text-muted fst-italic" style={{ fontSize: "0.85rem" }}>
            {!localStorage.getItem("token") ? "No comments yet. Login to comment." : "No comments yet, be the first to comment."}
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="py-2 px-1" style={{ borderBottom: "1px solid #eee" }}>
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
                  <div style={{ fontSize: "0.85rem", overflowWrap: "anywhere" }}>{comment.content}</div>
                  <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: "0.72rem" }}>
                    <span className="text-muted">
                      {comment.owner} &bull;{" "}
                      {new Date(comment.created_at).toLocaleString("en-GB", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    {!comment.is_owner && (
                      <button
                        className="btn btn-link btn-sm p-0 text-muted d-inline-flex align-items-center gap-1"
                        style={{ fontSize: "0.72rem", textDecoration: "none" }}
                        onClick={() => handleCommentLike(comment.id)}
                      >
                        <img src="/datumise-like.svg" alt="" width="12" height="12" style={{ opacity: comment.is_liked ? 1 : 0.4 }} />
                        {comment.likes_count}
                      </button>
                    )}
                    {comment.is_owner && (
                      <button className="btn btn-link btn-sm p-0 text-primary" style={{ fontSize: "0.72rem" }} onClick={() => handleEditClick(comment)}>Edit</button>
                    )}
                    {(comment.is_owner || comment.is_observation_owner) && (
                      <button className="btn btn-link btn-sm p-0 text-danger" style={{ fontSize: "0.72rem" }} onClick={() => handleDeleteComment(comment.id)}>Delete</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </fieldset>

      {/* ---- Add comment form ---- */}
      {localStorage.getItem("token") && (
        <fieldset className="border rounded pt-0 pb-1 px-2 mb-3">
          <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
            Comments
          </legend>
          {commentError && <Alert variant="danger" className="py-1 px-2 mb-1" style={{ fontSize: "0.8rem" }}>{commentError}</Alert>}
          <div className="d-flex gap-1 mt-1 mb-1">
            <input
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
              style={{ background: "#f0ece4", fontSize: "0.75rem", whiteSpace: "nowrap" }}
              onClick={handleCommentSubmit}
              disabled={!commentContent.trim()}
            >
              Send
            </button>
          </div>
        </fieldset>
      )}

      {/* ---- Image preview modal ---- */}
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered size="lg">
        <Modal.Header closeButton className="pb-2">
          <Modal.Title>Image preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center pt-2 pb-4" style={{ background: "#2c3e50" }}>
          {observation.image ? (
            <img src={observation.image} alt={observation.title} className="img-fluid" style={{ maxHeight: "80vh", objectFit: "contain" }} />
          ) : (
            <p className="text-muted fst-italic">No image yet.</p>
          )}
        </Modal.Body>
        <Modal.Footer className="pt-2 pb-3 border-0">
          <div className="d-flex justify-content-center gap-3 w-100 align-items-center">
            {observation.can_edit && (
              <>
                <button
                  type="button"
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "44px", height: "44px", background: "#FF7518", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={observation.image ? "Change Image" : "Add Image"}
                >
                  <img src="/camera.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1)" }} />
                </button>
                <button
                  type="button"
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "44px", height: "44px", background: "#dc3545", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
                  onClick={handleDelete}
                  aria-label="Delete observation"
                >
                  <img src="/datumise_delete.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1)" }} />
                </button>
              </>
            )}
            <button
              type="button"
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: "44px", height: "44px", background: "#1a5bc4", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
              onClick={() => setShowImageModal(false)}
              aria-label="Close"
            >
              <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
          </div>
        </Modal.Footer>
      </Modal>

      <ReturnButton to={location.state?.fromSurvey ? `/surveys/${location.state.surveyId}` : "/observations"} />
      <BackToTop />
    </div>
  );
}

export default ObservationDetail;
