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

  const fetchComments = async () => {
    try {
      const response = await api.get("/api/comments/");
      const observationComments = response.data.filter(
        (comment) => String(comment.observation) === String(id)
      );
      setComments(observationComments);
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

  return (
    <Container className="mt-4">
      <h1>{observation.title}</h1>
      <p>{observation.description}</p>
      <p>
        <strong>Owner:</strong> {observation.owner}
      </p>
      <p>
        <strong>Created:</strong> {observation.created_at}
      </p>

      <div className="d-flex gap-2 mb-4">
        <Button as={Link} to={`/observations/${id}/edit`} variant="primary">
          Edit Observation
        </Button>

        <Button variant="danger" onClick={handleDelete}>
          Delete Observation
        </Button>
      </div>

      <hr />

      <h3>Add Comment</h3>

      <Form onSubmit={handleCommentSubmit} className="mb-4">
        <Form.Group className="mb-3" controlId="commentContent">
          <Form.Label>Comment</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="Write your comment here..."
            required
          />
        </Form.Group>

        {commentError && <Alert variant="danger">{commentError}</Alert>}

        <Button type="submit" variant="success">
          Post Comment
        </Button>
      </Form>

      <hr />

      <h3>Comments</h3>

      {comments.length === 0 ? (
        <p>No comments yet.</p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="card mb-3">
            <div className="card-body">
              <p>{comment.content}</p>
              <small>
                Owner: {comment.owner} | Created: {comment.created_at}
              </small>
            </div>
          </div>
        ))
      )}
    </Container>
  );
}

export default ObservationDetail;