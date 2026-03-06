import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Container, Button } from "react-bootstrap";
import api from "./api/api";

function ObservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [observation, setObservation] = useState(null);

  useEffect(() => {
    const fetchObservation = async () => {
      try {
        const response = await api.get(`/api/observations/${id}/`);
        setObservation(response.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchObservation();
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

  if (!observation) {
    return <p>Loading observation...</p>;
  }

  return (
    <Container className="mt-4">
      <h1>{observation.title}</h1>
      <p>{observation.description}</p>
      <p><strong>Owner:</strong> {observation.owner}</p>
      <p><strong>Created:</strong> {observation.created_at}</p>

      <div className="d-flex gap-2">
        <Button as={Link} to={`/observations/${id}/edit`} variant="primary">
          Edit Observation
        </Button>

        <Button variant="danger" onClick={handleDelete}>
          Delete Observation
        </Button>
      </div>
    </Container>
  );
}

export default ObservationDetail;