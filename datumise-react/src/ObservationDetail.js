import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Container, Button, Form, Alert } from "react-bootstrap";
import api from "./api/api";

function ObservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [observation, setObservation] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState("");
  const [commentError, setCommentError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
        if (input) {
          input.focus();
        }
      }, 100);
    }
  }, [id]);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this observation?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/api/observations/${id}/`);
      navigate("/observations");
    } catch (err) {
      console.log("Status:", err.response?.status);
      console.log("Data:", err.response?.data);
      console.log("Message:", err.message);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setCommentError("");

    try {
      await api.post("/api/comments/", {
        observation: id,
        content: commentContent,
      });

      setCommentContent("");
      fetchComments();
    } catch (err) {
      console.error("Error creating comment:", err);
      setCommentError("Failed to post comment. Please try again.");
    }
  };

  if (!observation) {
    return <p>Loading observation...</p>;
  }

 const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm("Delete this comment?");

    if (!confirmed) return;

    try {
        await api.delete(`/api/comments/${commentId}/`);

        // refresh comments
        fetchComments();

    } catch (err) {
        console.error("Error deleting comment:", err);
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
    await api.put(`/api/comments/${commentId}/`, {
      observation: id,
      content: editCommentContent,
    });

    setEditingCommentId(null);
    setEditCommentContent("");
    fetchComments();
  } catch (err) {
    console.error("Error updating comment:", err);
  }
};

  return (
    <Container className="mt-4">
  <div className="mb-3">
    <Link to="/observations" className="text-decoration-none">
      ← Back to Observations
    </Link>
  </div>
      <div className="d-flex flex-column flex-md-row gap-3 align-items-center align-items-md-start mb-4">
        {observation.image && (
        
        
        
        <div className="mt-3">
          <img
            src={observation.image}
            alt={observation.title}
            className="img-fluid rounded"
            style={{ height: "400px", width: "auto", objectFit: "contain" }}
          />
        </div>


      )}
      <div style={{ flex: 1 }} className="d-flex flex-column">
        <fieldset className="border rounded p-3 mb-3">
          <legend className="float-none w-auto px-2 fs-5 fw-bold text-dark mb-0">
            {observation.title}
          </legend>

          <p
            className="mb-3"
            style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}
          >
            {observation.description}
          </p>

          
        </fieldset>
        <div className="mt-auto">
            <p className="text-muted small mb-1">
              {observation.owner} •{" "}
              {new Date(observation.created_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            {observation.is_owner && (
              <div className="d-flex gap-2">
                <Button as={Link} to={`/observations/${id}/edit`} variant="primary">
                  Edit Observation
                </Button>

                <Button variant="danger" onClick={handleDelete}>
                  Delete Observation
                </Button>
              </div>
            )}
          </div>
        {!localStorage.getItem("token") ? (
          <p className="text-muted fst-italic small mb-1">
            🔒 Only logged-in users can add, edit, or delete observations.
          </p>
        ) : (
          !observation.is_owner && (
            <p className="text-muted fst-italic small mb-1">
              🔒 Only the owner of this observation can edit or delete it.
            </p>
          )
        )}
      </div>
      </div>
      
      
      

      

      

      {localStorage.getItem("token") && (
        <Form id="comment-form" onSubmit={handleCommentSubmit} className="mb-4">
        
        
        
        <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
          
          <legend className="float-none w-auto px-2 fs-5 fw-bold text-dark mb-0">
            Add Comment
          </legend>

          <Form.Control
            className="border-0"
            id="comment-input"
            as="textarea"
            rows={3}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="Write your comment here..."
            required
          />
        </fieldset>

        {commentError && <Alert variant="danger">{commentError}</Alert>}

        <Button type="submit" variant="success">
          Post Comment
        </Button>
      </Form>
      )}
      

      <h3>
        {comments.length === 1
          ? "1 comment"
          : comments.length > 1
          ? `${comments.length} comments`
          : "Comments"}
      </h3>
      {comments.length > 0 && !localStorage.getItem("token") && (
        <p className="text-muted fst-italic small mb-1">
          🔒 Only logged-in users can add, edit, or delete comments.
        </p>
      )}
            {comments.length > 0 && localStorage.getItem("token") && (
        <p className="text-muted fst-italic small mb-1">
          🔒 Only comment owners can edit comments.
        </p>
      )}
      {comments.length === 0 ? (
        <p className="fst-italic text-muted">
          {!localStorage.getItem("token")
            ? "No comments yet. Login to comment."
            : "No comments yet, be the first to comment."}
        </p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="card mt-3 mb-3">
            <div className="card-body">
  
  
  {editingCommentId === comment.id ? (
    <>
      
      
      <Form.Group className="mb-3">
        <Form.Control
          as="textarea"
          rows={3}
          value={editCommentContent}
          onChange={(e) => setEditCommentContent(e.target.value)}
        />
      </Form.Group>

      <div className="d-flex gap-2">
        <Button
          variant="success"
          size="sm"
          onClick={() => handleUpdateComment(comment.id)}
        >
          Save
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleCancelEdit}
        >
          Cancel
        </Button>
      </div>
    </>
  ) : (
    <>
      <p>{comment.content}</p>

      <small className="text-muted d-block mb-2">
        {comment.owner} •{" "}
        {new Date(comment.created_at).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </small>

      <div className="d-flex gap-2">

        {comment.is_owner && (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleEditClick(comment)}
          >
            Edit Comment
          </Button>
        )}

        {(comment.is_owner || comment.is_observation_owner) && (
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => handleDeleteComment(comment.id)}
          >
            Delete Comment
          </Button>
        )}

      </div>

      
    </>
  )}
</div>
          </div>
        ))
      )}
    </Container>
  );
}

export default ObservationDetail;