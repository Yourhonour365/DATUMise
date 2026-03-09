import React, { useState } from "react";
import { Form, Button, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "./api/api";

function ObservationCreateForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [image, setImage] = useState(null);

  const { title, description } = formData;
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const submissionData = new FormData();
    submissionData.append("title", title);
    submissionData.append("description", description);
    if (image) {
      submissionData.append("image", image);
    }

    try {
      await api.post("/api/observations/", submissionData);
      navigate("/observations");
    } catch (err) {
      console.error("Create observation failed:", err);
    }
  };

  return (
    <Container className="mt-4">
      <h1>Create Observation</h1>

      <Form onSubmit={handleSubmit}>
        
        
        
        <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
          <legend className="float-none w-auto px-2 fs-6 mb-0 pt-0">
            Title
          </legend>

          <Form.Control
            className="border-0"
            type="text"
            name="title"
            value={title}
            onChange={handleChange}
            maxLength={200}
            placeholder="Enter observation title"
            required
          />
        </fieldset>

        <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
          <legend className="float-none w-auto px-2 fs-6 mb-0">
            Description
          </legend>

          <Form.Control
            className="border-0"
            as="textarea"
            rows={4}
            name="description"
            value={description}
            onChange={handleChange}
            placeholder="Enter observation description"
          />
        </fieldset>

        <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
          <legend className="float-none w-auto px-2 fs-6 mb-0">
            Image
          </legend>

          <Form.Control
            className="border-0"
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
          />
        </fieldset>

        <div className="d-flex gap-2">
          <Button variant="primary" type="submit">
            Create Observation
          </Button>

          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate("/observations")}
          >
            Cancel
          </Button>
</div>
      </Form>
    </Container>
  );
}

export default ObservationCreateForm;