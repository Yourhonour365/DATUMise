import React, { useState } from "react";
import { Form, Button, Container } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "./api/api";

function ObservationCreateForm(props) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [image, setImage] = useState(null);

  const { title, description } = formData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const surveyId = props.surveyId || searchParams.get("survey");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  
  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleTitleBlur = () => {
    setFormData((prevData) => ({
      ...prevData,
      title: prevData.title
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (isSubmitting) return;
      setIsSubmitting(true);
    
    const submissionData = new FormData();
    submissionData.append("title", title);
    submissionData.append("description", description);
    if (surveyId) {
      submissionData.append("survey", surveyId);
    }
    
    
    
    
    if (image) {
      submissionData.append("image", image);
    }

    try {
      await api.post("/api/observations/", submissionData);
      window.location.reload();
    } catch (err) {
      console.error("Create observation failed:", err);
    }

      finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Container className="mt-4">
      <h3 className="mb-3">Create Observation</h3>

      <Form onSubmit={handleSubmit}>
        
        
        
        <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
          <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
            Title
          </legend>

          <Form.Control
            className="border-0"
            type="text"
            name="title"
            value={title}
            onChange={handleChange}
            onBlur={handleTitleBlur}
            maxLength={120}
            placeholder="Enter observation title"
            required
          />

          <small className="text-muted d-block mt-1">{title.length} / 120</small>

        </fieldset>

        <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
          <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0">
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
          <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0">
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
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Observation"}
          </Button>

          <Button
            variant="secondary"
            type="button"
            onClick={() => window.location.reload()}
          >
            Cancel
          </Button>
</div>
      </Form>
    </Container>
  );
}

export default ObservationCreateForm;