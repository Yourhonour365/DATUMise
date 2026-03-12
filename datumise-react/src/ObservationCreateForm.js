import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Form, Button, Container, Modal } from "react-bootstrap";
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
    localStorage.removeItem("datumise-observation-draft");
    localStorage.removeItem("datumise-observation-image");
  };
  
  
  const { title, description } = formData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const surveyId = props.surveyId || searchParams.get("survey");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
  
  useEffect(() => {
    const savedDraft = localStorage.getItem("datumise-observation-draft");

    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        
        
        setFormData({
          title: parsedDraft.title || "",
          description: parsedDraft.description || "",
        });

        const savedImage = localStorage.getItem("datumise-observation-image");
        if (savedImage) {
          setImagePreview(savedImage);
        }





      } catch (err) {
        console.error("Failed to load observation draft:", err);
      }
    }
  }, []);

  const handleChange = (event) => {
    const updatedData = {
      ...formData,
      [event.target.name]: event.target.value,
    };

    setFormData(updatedData);

    localStorage.setItem(
      "datumise-observation-draft",
      JSON.stringify(updatedData)
    );
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
  <div className="pt-2 px-0">
    <Form id="observation-create-form" onSubmit={handleSubmit} className="px-3">
      <div className="d-flex flex-column gap-2">
        <div>
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

                  if (file) {
                    const previewUrl = URL.createObjectURL(file);
                    setImagePreview(previewUrl);

                    const reader = new FileReader();
                    reader.onloadend = () => {
                      localStorage.setItem("datumise-observation-image", reader.result);
                    };
                    reader.readAsDataURL(file);

                    setTimeout(() => titleInputRef.current?.focus(), 100);
                  } else {
                    setImagePreview("");
                    localStorage.removeItem("datumise-observation-image");
                  }
                }}


            />

            <div
                  onClick={() => {
                    if (imagePreview) {
                      setShowImagePreviewModal(true);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
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

        <div>
          <fieldset className="border rounded pt-0 pb-1 px-2 d-flex flex-column h-100" style={{ marginTop: "-8px" }}>
            <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
              Observation
            </legend>

            <Form.Control
              ref={titleInputRef}
              className="border-0 p-1 h-100"
              as="textarea"
              rows={4}
              name="title"
              value={title}
              onChange={handleChange}
              onBlur={handleTitleBlur}
              maxLength={120}
              placeholder="Add observation description"
              required
              autoComplete="off"
              style={{
                resize: "none",
                lineHeight: "1.2",
              }}
            />

            <div className="d-flex justify-content-between align-items-center mt-1">
              <small
                className={title.length >= 100 ? "text-warning" : "text-muted"}
                style={{ fontSize: "0.72rem" }}
              >
                {title.length} / 120
              </small>
              {title.length > 0 && (
                <button
                  type="button"
                  className="field-clear-btn"
                  onClick={() => {
                    const updatedData = { ...formData, title: "" };
                    setFormData(updatedData);
                    localStorage.setItem("datumise-observation-draft", JSON.stringify(updatedData));
                  }}
                >
                  Clear
                </button>
              )}
            </div>

          </fieldset>
        </div>

        <div>
          <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
            <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0">
              Notes
            </legend>

            <Form.Control
              className="border-0"
              as="textarea"
              rows={2}
              name="description"
              value={description}
              onChange={handleChange}
              placeholder="Enter notes"
              autoComplete="off"
              style={{ resize: "none" }}
            />

            {description.length > 0 && (
              <div className="d-flex justify-content-end mt-1">
                <button
                  type="button"
                  className="field-clear-btn"
                  onClick={() => {
                    const updatedData = { ...formData, description: "" };
                    setFormData(updatedData);
                    localStorage.setItem("datumise-observation-draft", JSON.stringify(updatedData));
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </fieldset>
        </div>
      </div>

          {!props.captureMode && (
            <>
              <div
                className="text-danger text-end pe-2"
                style={{
                  fontSize: "0.75rem",
                  minHeight: "18px",
                  opacity: title.trim() || imagePreview ? 1 : 0,
                  transition: "opacity 0.25s ease",
                }}
              >
                {!imagePreview && title.trim() && "Add image"}
                {imagePreview && !title.trim() && "Add Observation"}
              </div>

              <div className="d-flex flex-column gap-3 mt-0">
                <Button
                  variant="warning"
                  type="button"
                  onClick={() => {
                    props.onPauseSurvey?.();
                    props.onClose?.();
                  }}
                  className="w-100"
                >
                  Pause Survey
                </Button>

                <div className="d-flex justify-content-center">
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

                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting || !imagePreview || !title.trim()}
                  className="w-100"
                >
                  {isSubmitting ? "Saving..." : "✓ Save & Next"}
                </Button>
              </div>
            </>
          )}

            </Form>

    {props.captureMode && props.actionBarTarget && createPortal(
      <>
        {!props.isViewingPrevious && (
          <div
            className="text-danger text-center"
            style={{
              fontSize: "0.75rem",
              minHeight: "16px",
              opacity: title.trim() || imagePreview ? 1 : 0,
              transition: "opacity 0.25s ease",
              marginBottom: "0.25rem",
            }}
          >
            {!imagePreview && title.trim() && "Add image"}
            {imagePreview && !title.trim() && "Add Observation"}
          </div>
        )}
        {props.isViewingPrevious && <div style={{ height: "16px", marginBottom: "0.25rem" }} />}
        <div className="d-flex align-items-center justify-content-center gap-4">
          <button
            type="button"
            onClick={() => props.onStepBack?.()}
            disabled={!props.onStepBack}
            className="capture-action-btn capture-action-secondary"
            aria-label="Previous observation"
          >
            <img src="/datumise_back.svg" alt="" width="20" height="20" />
          </button>
          <button
            type="button"
            onClick={() => {
              props.onPauseSurvey?.();
              props.onClose?.();
            }}
            className="capture-action-btn capture-action-secondary"
            aria-label="Pause Survey"
          >
            <img src="/datumise_pause.svg" alt="" width="20" height="20" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (props.isViewingPrevious) props.onReturnToCurrent?.();
              fileInputRef.current?.click();
            }}
            className="capture-action-btn capture-action-secondary"
            aria-label="Take Photo"
          >
            <img src="/camera.svg" alt="" width="26" height="26" />
          </button>
          {props.isViewingPrevious ? (
            <button
              type="button"
              onClick={() => props.onStepForward?.()}
              className="capture-action-btn capture-action-primary"
              aria-label="Next"
            >
              <img
                src="/datumise_next_.svg"
                alt=""
                width="22"
                height="22"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </button>
          ) : (
            <button
              type="submit"
              form="observation-create-form"
              disabled={isSubmitting || !imagePreview || !title.trim()}
              className="capture-action-btn capture-action-primary"
              aria-label="Save and Next"
            >
              <img
                src="/datumise_next_.svg"
                alt=""
                width="22"
                height="22"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </button>
          )}
          {props.isViewingPrevious && (
            <button
              type="button"
              onClick={() => props.onReturnToCurrent?.()}
              className="capture-action-btn capture-action-primary"
              aria-label="Return to current observation"
            >
              <img
                src="/datumise_end_right.svg"
                alt=""
                width="20"
                height="20"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </button>
          )}
        </div>
      </>,
      props.actionBarTarget
    )}


    <Modal
      show={showImagePreviewModal}
      onHide={() => setShowImagePreviewModal(false)}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Image preview</Modal.Title>
      </Modal.Header>

      <Modal.Body className="text-center">
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Observation"
            className="img-fluid"
            style={{ maxHeight: "70vh", objectFit: "contain" }}
          />
        )}
      </Modal.Body>

      <Modal.Footer className="justify-content-center gap-4 border-0 pt-0">
        <button
          type="button"
          onClick={() => {
            setImage(null);
            setImagePreview("");
            localStorage.removeItem("datumise-observation-image");
            setShowImagePreviewModal(false);
          }}
          className="capture-action-btn capture-action-danger"
          aria-label="Delete image"
        >
          <img src="/datumise_delete.svg" alt="" width="20" height="20" style={{ filter: "brightness(0) invert(1)" }} />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowImagePreviewModal(false);
            fileInputRef.current?.click();
          }}
          className="capture-action-btn capture-action-secondary"
          aria-label="Change image"
        >
          <img src="/camera.svg" alt="" width="26" height="26" />
        </button>
        <button
          type="button"
          onClick={() => setShowImagePreviewModal(false)}
          className="capture-action-btn capture-action-confirm"
          aria-label="Keep image"
        >
          <img src="/datumise_ok.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1)" }} />
        </button>
      </Modal.Footer>
    </Modal>















  </div>
);
}
export default ObservationCreateForm;