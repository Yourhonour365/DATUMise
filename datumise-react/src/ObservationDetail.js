import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Button } from "react-bootstrap";
import api from "./api/api";

function ObservationDetail() {
  const { id } = useParams();

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

  if (!observation) {
    return <p>Loading observation...</p>;
  }

  return (
    <Container className="mt-4">
      <h1>{observation.title}</h1>
      <p>{observation.description}</p>
      <p><strong>Owner:</strong> {observation.owner}</p>
      <p><strong>Created:</strong> {observation.created_at}</p>

      <Button as={Link} to={`/observations/${id}/edit`} variant="primary">
        Edit Observation
      </Button>
    </Container>
  );
}

export default ObservationDetail;