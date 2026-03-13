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
  const reopenPreviewRef = useRef(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  
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

  // Report draft incompleteness to parent
  const onDraftIncomplete = props.onDraftIncomplete;
  useEffect(() => {
    const hasImage = !!imagePreview;
    const hasTitle = !!title.trim();
    const incomplete = (hasImage || hasTitle) && !(hasImage && hasTitle);
    onDraftIncomplete?.(incomplete);
  }, [imagePreview, title, onDraftIncomplete]);

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
  <div className="pt-2 px-0 d-flex flex-column h-100">
    <Form id="observation-create-form" onSubmit={handleSubmit} className="px-3 d-flex flex-column flex-grow-1">
      <div className="d-flex flex-column gap-2 flex-grow-1" style={{ minHeight: "calc(100% + 3.5rem)" }}>
        <div className="flex-grow-1">
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

                    if (reopenPreviewRef.current) {
                      reopenPreviewRef.current = false;
                      setTimeout(() => setShowImagePreviewModal(true), 100);
                    } else {
                      setTimeout(() => titleInputRef.current?.focus(), 100);
                    }
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
                    border: !imagePreview && title.trim() ? "2px solid #008000" : "none",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                    backgroundColor: "#ecf0f1",
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
          <fieldset className="rounded pt-0 pb-1 px-2 d-flex flex-column h-100" style={{ marginTop: "-8px", backgroundColor: title.trim() ? "#f0ece4" : "#ecf0f1", border: imagePreview && !title.trim() ? "2px solid #008000" : "none" }}>
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
                backgroundColor: "transparent",
              }}
            />

            <div className="d-flex justify-content-between align-items-center mt-1">
              <small
                style={{
                  fontSize: "0.72rem",
                  color: title.length >= 120 ? "#2c3e50" : title.length >= 100 ? "#e67e22" : "#2c3e50",
                }}
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

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mt-1"
              style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", alignSelf: "flex-start" }}
              onClick={() => setShowNotesModal(true)}
            >
              + Internal Note
            </button>

          </fieldset>
        </div>

      </div>

          {!props.captureMode && (
            <>
              <div className="d-flex flex-column gap-3 mt-0">
                <Button
                  variant="warning"
                  type="button"
                  onClick={() => {
                    props.onPauseSurvey?.();
                    props.onClose?.();
                  }}
                  className="w-100 rounded-pill"
                >
                  Pause Survey
                </Button>

                <div className="d-flex justify-content-center">
                  <Button
                    variant="light"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                    style={{ width: "56px", height: "56px", background: "#FF7518", border: "none" }}
                  >
                    <img
                      src="/camera.svg"
                      alt="Camera"
                      width="32"
                      height="32"
                      style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }}
                    />
                  </Button>
                </div>

                <div
                  className="text-center"
                  style={{
                    fontSize: "0.75rem",
                    minHeight: "18px",
                    marginBottom: "-0.75rem",
                    opacity: title.trim() || imagePreview ? 1 : 0,
                    transition: "opacity 0.25s ease",
                    color: "#fef0e0",
                  }}
                >
                  {!imagePreview && title.trim() && "Add image"}
                  {imagePreview && !title.trim() && "Add Observation"}
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting || !imagePreview || !title.trim()}
                  className="w-100 rounded-pill"
                >
                  {isSubmitting ? "Saving..." : "✓ Save & Next"}
                </Button>
              </div>
            </>
          )}

            </Form>

    {props.captureMode && props.actionBarTarget && createPortal(
      <>
        <div className="d-flex align-items-center justify-content-center gap-4">
          <button
            type="button"
            onClick={props.anyIncomplete ? undefined : () => {
              props.onPauseSurvey?.();
              props.onClose?.();
            }}
            disabled={props.anyIncomplete}
            className={`capture-action-btn ${props.anyIncomplete ? "capture-action-warning" : ""}`}
            aria-label="Pause Survey"
            style={{ background: props.anyIncomplete ? undefined : "#95a5a6", border: "none" }}
          >
            <img src="/datumise_pause.svg" alt="" width="24" height="24" style={{ filter: props.anyIncomplete ? "invert(68%) sepia(5%) saturate(581%) hue-rotate(155deg) brightness(89%) contrast(88%)" : "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
          <button
            type="button"
            onClick={() => props.onStepBack?.()}
            disabled={!props.onStepBack}
            className={`capture-action-btn ${!props.onStepBack && props.previousObsIncomplete ? "capture-action-warning" : ""}`}
            aria-label="Previous observation"
            style={{ background: !props.onStepBack && props.previousObsIncomplete ? undefined : "#ddf0e3", border: "none" }}
          >
            <img src="/datumise_back.svg" alt="" width="20" height="20" />
          </button>
          <button
            type="button"
            onClick={() => props.isViewingPrevious ? props.onCaptureForPrevious?.() : fileInputRef.current?.click()}
            className="capture-action-btn"
            aria-label="Take Photo"
            style={{ background: "#FF7518", border: "none" }}
          >
            <img src="/camera.svg" alt="" width="26" height="26" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
          {props.isViewingPrevious ? (
            <div style={{ position: "relative" }}>
              {props.previousObsIncomplete && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "0.68rem",
                    color: "#fef0e0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {props.previousObsMissingImage && props.previousObsMissingTitle
                    ? "Add image and observation"
                    : props.previousObsMissingImage
                    ? "Add image to proceed"
                    : "Add observation to proceed"}
                </div>
              )}
              <button
                type="button"
                onClick={() => props.onStepForward?.()}
                disabled={props.previousObsIncomplete}
                className={`capture-action-btn ${props.previousObsIncomplete ? "capture-action-warning" : ""}`}
                aria-label="Next"
                style={{ background: props.previousObsIncomplete ? undefined : "#ddf0e3", border: "none" }}
              >
                <img
                  src="/datumise_next_.svg"
                  alt=""
                  width="22"
                  height="22"
                />
              </button>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "0.68rem",
                  opacity: (title.trim() || imagePreview) ? 1 : 0,
                  transition: "opacity 0.25s ease",
                  color: "#fef0e0",
                  whiteSpace: "nowrap",
                }}
              >
                {!imagePreview && title.trim() && "Add image to proceed"}
                {imagePreview && !title.trim() && "Add observation to proceed"}
              </div>
              <button
                type="submit"
                form="observation-create-form"
                disabled={isSubmitting || !imagePreview || !title.trim()}
                className={`capture-action-btn ${imagePreview && title.trim() ? "capture-action-ready" : (imagePreview || title.trim()) ? "capture-action-warning" : ""}`}
                aria-label="Save and Next"
                style={{ background: (imagePreview || title.trim()) ? undefined : "#ddf0e3", border: "none" }}
              >
                <img
                  src="/datumise_next_.svg"
                  alt=""
                  width="22"
                  height="22"
                />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => props.onReturnToCurrent?.()}
            disabled={!(props.isViewingPrevious && props.onReturnToCurrent) || props.previousObsIncomplete}
            className="capture-action-btn"
            aria-label="Return to current observation"
            style={{
              background: props.isViewingPrevious && props.onReturnToCurrent ? "#ddf0e3" : "#2c3e50",
              border: "none",
              opacity: props.isViewingPrevious && props.onReturnToCurrent && !props.previousObsIncomplete ? 1 : 0,
              transition: "opacity 1.2s ease, background 1.2s ease",
              pointerEvents: props.isViewingPrevious && props.onReturnToCurrent && !props.previousObsIncomplete ? "auto" : "none",
            }}
          >
            <img
              src="/datumise_end_right.svg"
              alt=""
              width="20"
              height="20"
            />
          </button>
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

      <Modal.Body className="text-center" style={{ background: "#2c3e50" }}>
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Observation"
            className="img-fluid"
            style={{ maxHeight: "70vh", objectFit: "contain" }}
          />
        )}
      </Modal.Body>

      <Modal.Footer className="justify-content-center gap-4">
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
          <img src="/datumise_delete.svg" alt="" width="26" height="26" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
        </button>
        <button
          type="button"
          onClick={() => {
            reopenPreviewRef.current = true;
            setShowImagePreviewModal(false);
            fileInputRef.current?.click();
          }}
          className="capture-action-btn"
          aria-label="Change image"
          style={{ background: "#FF7518", border: "none" }}
        >
          <img src="/camera.svg" alt="" width="26" height="26" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
        </button>
        <button
          type="button"
          onClick={() => setShowImagePreviewModal(false)}
          className="capture-action-btn"
          aria-label="Save"
          style={{ background: "#008000", border: "none" }}
        >
          <img src="/datumise-confirm.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
        </button>
        <button
          type="button"
          onClick={() => setShowImagePreviewModal(false)}
          className="capture-action-btn"
          aria-label="Go back"
          style={{ background: "#dce7fa", border: "none" }}
        >
          <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
        </button>
      </Modal.Footer>
    </Modal>

    <Modal
      show={showNotesModal}
      onHide={() => setShowNotesModal(false)}
      dialogClassName="modal-bottom"
    >
      <Modal.Header closeButton>
        <Modal.Title>Notes</Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-2" style={{ backgroundColor: "#faf6ef" }}>
        <Form.Control
          as="textarea"
          rows={8}
          value={description}
          onChange={(e) => {
            if (e.target.value.length <= 280) {
              const updatedData = { ...formData, description: e.target.value };
              setFormData(updatedData);
              localStorage.setItem("datumise-observation-draft", JSON.stringify(updatedData));
            }
          }}
          placeholder="Enter notes"
          maxLength={280}
          autoFocus
          style={{ resize: "none", lineHeight: "1.25", fontSize: "0.9rem", backgroundColor: description.trim() ? "#f0ece4" : "#ecf0f1", border: "none" }}
        />
        <div className="d-flex justify-content-between mt-1">
          <small style={{ fontSize: "0.72rem", color: description.length >= 280 ? "#2c3e50" : description.length >= 240 ? "#e67e22" : "#2c3e50" }}>{description.length} / 280</small>
          {description.length > 0 && (
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
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="justify-content-center gap-4 pt-0">
        <button
          type="button"
          onClick={() => setShowNotesModal(false)}
          className="capture-action-btn"
          aria-label="Save"
          style={{ background: "#008000", border: "none" }}
        >
          <img src="/datumise-confirm.svg" alt="" width="22" height="22" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
        </button>
        <button
          type="button"
          onClick={() => setShowNotesModal(false)}
          className="capture-action-btn"
          aria-label="Go back"
          style={{ background: "#dce7fa", border: "none" }}
        >
          <img src="/datumise-return.svg" alt="" width="22" height="22" style={{ filter: "invert(27%) sepia(96%) saturate(1752%) hue-rotate(213deg) brightness(92%) contrast(88%)" }} />
        </button>
      </Modal.Footer>
    </Modal>












  </div>
);
}
export default ObservationCreateForm;