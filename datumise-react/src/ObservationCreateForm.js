import React, { useRef, useState } from "react";
import { Form, Button, Container } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "./api/api";

function ObservationCreateForm(props) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [image, setImage] = useState(null);
 
 
  const clearForm = () => {
    setFormData({
      title: "",
      description: "",
    });
    setImage(null);
    setImagePreview("");
  };
  
  
  const { title, description } = formData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const surveyId = props.surveyId || searchParams.get("survey");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);


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

      if (props.onSuccess) {
        props.onSuccess();
      }

      clearForm();

      


    } catch (err) {
      console.error("Add observation failed:", err);
    }

      finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Container fluid className="pt-2 px-0">
      


      

      <Form onSubmit={handleSubmit}>
        
        
        
        
        <div className="mb-2">
          
          
          <Form.Control
            ref={fileInputRef}
            className="d-none"
            type="file"
            accept="image/*"
            key={image ? image.name : "empty"}
            onChange={(e) => {
              const file = e.target.files[0];
              setImage(file || null);
              setImagePreview(file ? URL.createObjectURL(file) : "");
            }}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "140px",
              height: "140px",
              border: "1px dashed #bbb",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              overflow: "hidden",
              backgroundColor: "#f8f9fa",
              marginTop: "4px",
            }}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span className="text-muted text-center">
                Add image
                <br />
                <strong>+</strong>
              </span>
            )}
          </div>
        </div>
        
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

        

        <div className="d-flex gap-2">
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Observation"}
          </Button>

          <Button
            variant="secondary"
            type="button"
            onClick={clearForm}
          >
            Clear Form
          </Button>
          
        </div>
      </Form>
    </Container>
  );
}

export default ObservationCreateForm;