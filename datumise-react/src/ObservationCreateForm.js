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
  const titleInputRef = useRef(null);

  


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
      const response = await api.post("/api/observations/", submissionData);

      if (props.onSuccess) {
        props.onSuccess(response.data);
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
    <Form id="observation-create-form" onSubmit={handleSubmit}>
      <div className="row gx-3 gy-0 align-items-stretch">
        <div className="col-12 col-md-auto">
          <div className="mb-2">
            <Form.Control
                ref={fileInputRef}
                className="d-none"
                type="file"
                accept="image/*"
                capture="environment"
                key={image ? image.name : "empty"}
                onChange={(e) => {
                const file = e.target.files[0];
                setImage(file || null);
                setImagePreview(file ? URL.createObjectURL(file) : "");

                if (file) {
                  setTimeout(() => titleInputRef.current?.focus(), 100);
                }
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
        </div>

        <div className="col-12 col-md">
          <fieldset className="border rounded pt-0 pb-1 px-2 d-flex flex-column h-100" style={{ marginTop: "-8px" }}>
            <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
              Observation
            </legend>

            <Form.Control
              ref={titleInputRef}
              className="border-0 p-1 h-100"
              as="textarea"
              rows={3}
              name="title"
              value={title}
              onChange={handleChange}
              onBlur={handleTitleBlur}
              maxLength={120}
              placeholder="Enter observation"
              required
              autoComplete="off"
              style={{
                resize: "none",
                lineHeight: "1.2",
              }}
            />

            <small className="text-muted d-block mt-1">
              {title.length} / 120
            </small>
          </fieldset>
        </div>

        <div className="col-12">
          <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
            <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0">
              Notes
            </legend>

            <Form.Control
              className="border-0"
              as="textarea"
              rows={4}
              name="description"
              value={description}
              onChange={handleChange}
              placeholder="Enter notes"
              autoComplete="off"
              style={{ resize: "none" }}
            />
          </fieldset>
        </div>
      </div>

          <div className="text-end mb-2">
            <Button
              variant="link"
              size="sm"
              type="button"
              onClick={clearForm}
              className="text-muted p-0 text-decoration-none"
            >
              Clear
            </Button>
          </div>




          <div className="d-flex align-items-center justify-content-between mt-3">
          
            <Button
              variant="warning"
              type="button"
              onClick={() => {
                props.onPauseSurvey?.();
                props.onClose?.();
              }}
              className="me-2"
            >
              Pause Survey
            </Button>
          
          <div className="text-center flex-grow-1 mx-2">
            
            <div className="flex-grow-1 d-flex justify-content-center">
            <Button
              variant="light"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-circle d-flex align-items-center justify-content-center shadow-sm border"
              style={{ width: "56px", height: "56px" }}
            >
              <img
                src="/camera.svg"
                alt="Camera"
                width="32"
                height="32"
              />
            </Button>
          </div>
          
          </div>
          
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "✓ Save & Next"}
          </Button>




          </div>

</Form>
  </Container>
);
}
export default ObservationCreateForm;