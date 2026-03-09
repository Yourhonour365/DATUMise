import React, { useState } from "react";
import { Form, Button, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "./api/api";

function ObservationCreateForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const { title, description } = formData;
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  
  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (image) {
      formData.append("image", image);
    }


    try {
      await api.post("/api/observations/", formData);
      navigate("/observations");
    } catch (err) {
      console.error("Create observation failed:", err);
    }
  };

  return (
    <Container className="mt-4">
      <h1>Create Observation</h1>

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            name="title"
            value={title}
            onChange={handleChange}
            maxLength={200}
            placeholder="Enter observation title"
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
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
        
        <Form.Group className="mb-3">
          <Form.Label>Image</Form.Label>
          <Form.Control
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
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