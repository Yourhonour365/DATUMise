import React, { useState } from "react";
import { Form, Button, Container } from "react-bootstrap";

function ObservationCreateForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const { title, description } = formData;

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <Container className="mt-4">
      <h1>Create Observation</h1>

      <Form>
        <Form.Group className="mb-3" controlId="title">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            name="title"
            value={title}
            onChange={handleChange}
            maxLength={200}
            placeholder="Enter observation title"
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="description">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            name="description"
            value={description}
            onChange={handleChange}
            placeholder="Enter observation description"
          />
        </Form.Group>

        <Button variant="primary" type="submit">
          Create Observation
        </Button>
      </Form>
    </Container>
  );
}

export default ObservationCreateForm;