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
  const originalImageRef = useRef(null);
  const originalImageFileRef = useRef(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  
  useEffect(() => {
    const restoreDraft = async () => {
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
          // Restore File object from base64 data URL
          try {
            const res = await fetch(savedImage);
            const blob = await res.blob();
            const file = new File([blob], "restored-image.jpg", { type: blob.type });
            setImage(file);
          } catch (e) {
            console.error("Failed to restore image file:", e);
          }
        }





      } catch (err) {
        console.error("Failed to load observation draft:", err);
      }
    }
    };
    restoreDraft();
  }, []);

  // Sync draft from localStorage when becoming visible (e.g. after copy-to-draft)
  useEffect(() => {
    if (props.onBecomeVisible) {
      const saved = localStorage.getItem("datumise-observation-draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.title !== undefined && parsed.title !== title) {
            setFormData((prev) => ({ ...prev, title: parsed.title }));
          }
        } catch (e) {}
      }
    }
  }, [props.onBecomeVisible]);

  // Report draft incompleteness to parent
  const onDraftIncomplete = props.onDraftIncomplete;
  const onDraftStatus = props.onDraftStatus;
  useEffect(() => {
    const hasImage = !!imagePreview;
    const hasTitle = !!title.trim();
    const incomplete = (hasImage || hasTitle) && !(hasImage && hasTitle);
    onDraftIncomplete?.(incomplete);
    onDraftStatus?.(hasTitle, hasImage);
  }, [imagePreview, title, onDraftIncomplete, onDraftStatus]);

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

    // Try File object first, then blob/base64 preview, then localStorage
    let imageFile = image;
    if (!imageFile && imagePreview) {
      try {
        const res = await fetch(imagePreview);
        const blob = await res.blob();
        imageFile = new File([blob], "observation.jpg", { type: blob.type || "image/jpeg" });
      } catch (e) {
        console.error("Failed to convert preview URL:", e);
      }
    }
    if (!imageFile) {
      const savedImage = localStorage.getItem("datumise-observation-image");
      if (savedImage) {
        try {
          const res = await fetch(savedImage);
          const blob = await res.blob();
          imageFile = new File([blob], "observation.jpg", { type: blob.type || "image/jpeg" });
        } catch (e) {
          console.error("Failed to convert localStorage image:", e);
        }
      }
    }
    if (imageFile) {
      submissionData.append("image", imageFile);
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
      <div>
        <div>
          <div className="d-flex flex-column" style={{ gap: "1.25rem" }}>
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

                    reopenPreviewRef.current = false;
                    setTimeout(() => setShowImagePreviewModal(true), 100);
                  } else {
                    setImagePreview("");
                    localStorage.removeItem("datumise-observation-image");
                  }
                }}


            />

            <div
                  onClick={() => {
                    if (imagePreview) {
                      originalImageRef.current = imagePreview;
                      originalImageFileRef.current = image;
                      setShowImagePreviewModal(true);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  style={{
                    width: "336px",
                    maxWidth: "100%",
                    height: "168px",
                    border: !imagePreview && title.trim() ? "2px solid #008000" : "none",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                    backgroundColor: "#687374",
                    margin: "0 auto",
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
                <div className="d-flex flex-column align-items-center gap-2">
                  <span className="text-center" style={{ color: "#faf6ef", fontSize: "1.1rem", fontWeight: 600 }}>
                    Awaiting image
                  </span>
                  <img src="/datumise-add.svg" alt="" width="28" height="28" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)", opacity: 0.8 }} />
                </div>
              )}
            </div>

          {/* Hidden input to satisfy form required validation */}
          <input type="hidden" name="title" value={title} />
          <Form.Control ref={titleInputRef} className="d-none" as="textarea" name="title_hidden" value={title} onChange={handleChange} onBlur={handleTitleBlur} maxLength={150} autoComplete="off" />

          {title.trim() ? (
            <fieldset className="rounded pt-0 pb-1 px-2 d-flex flex-column" style={{ backgroundColor: "#f0ece4", border: "none", width: "336px", maxWidth: "100%", height: "168px", margin: "0 auto", overflow: "hidden" }}>
              <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
                Description
              </legend>
              <div
                className="p-1 flex-grow-1"
                style={{ lineHeight: "1.2", cursor: "pointer", overflowWrap: "break-word", wordBreak: "normal" }}
                onClick={() => setShowNotesModal(true)}
              >
                {title}
              </div>
              <div>
                <small style={{ fontSize: "0.72rem", color: "#db440a" }}>
                  {title.length} / 150
                </small>
              </div>
            </fieldset>
          ) : (
            <div
              onClick={() => setShowNotesModal(true)}
              style={{
                width: "336px",
                maxWidth: "100%",
                height: "168px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backgroundColor: "#687374",
                margin: "0 auto",
              }}
            >
              <div className="d-flex flex-column align-items-center gap-2">
                <span className="text-center" style={{ color: "#faf6ef", fontSize: "1.1rem", fontWeight: 600 }}>
                  Awaiting description
                </span>
                <img src="/datumise-edit.svg" alt="" width="28" height="28" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)", opacity: 0.8 }} />
              </div>
            </div>
          )}
        </div>
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
                    style={{ width: "56px", height: "56px", background: "#db440a", border: "none" }}
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
                  {imagePreview && !title.trim() && "Add Description"}
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
        <div className="capture-footer-grid">
          {props.isViewingPrevious ? (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Back to list"
              disabled={props.copiedToDraft || props.obsListOpen}
              onClick={() => props.onShowObsList?.()}
              style={{ background: (props.copiedToDraft || props.obsListOpen) ? "#2c3e50" : undefined }}
            >
              <img src="/datumise-return.svg" alt="" width="47" height="47" style={{ filter: (props.copiedToDraft || props.obsListOpen) ? "none" : "brightness(0) invert(1)" }} />
            </button>
          ) : (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Pause Survey"
              disabled={props.copiedToDraft || props.obsListOpen}
              onClick={() => {
                props.onPauseSurvey?.();
                props.onClose?.();
              }}
              style={{ background: (props.copiedToDraft || props.obsListOpen) ? "#2c3e50" : undefined }}
            >
              <img src="/datumise_pause.svg" alt="" width="47" height="47" style={{ filter: (props.copiedToDraft || props.obsListOpen) ? "none" : "brightness(0) invert(1)" }} />
            </button>
          )}
          {props.copiedToDraft && props.isViewingPrevious ? (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Confirm copy"
              disabled={props.obsListOpen}
              onClick={() => props.onReturnToCurrent?.()}
              style={{ background: props.obsListOpen ? "#2c3e50" : "#006400" }}
            >
              <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
            </button>
          ) : (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Edit observation"
              disabled={props.obsListOpen}
              onClick={() => props.isViewingPrevious ? props.onEditPrevious?.() : setShowNotesModal(true)}
              style={{ background: props.obsListOpen ? "#2c3e50" : "#1a5bc4" }}
            >
              <img src="/datumise-edit.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
            </button>
          )}
          {props.isViewingPrevious ? (
            props.copiedToDraft ? (
              <button
                type="button"
                className="capture-footer-btn"
                aria-label="Cancel copy"
                disabled={props.obsListOpen}
                onClick={() => props.onCancelCopy?.()}
                style={{ background: props.obsListOpen ? "#2c3e50" : "#95a5a6" }}
              >
                <img src="/x.svg" alt="" width="75" height="75" style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
              </button>
            ) : (
              <button
                type="button"
                className="capture-footer-btn"
                aria-label="Change image"
                disabled={props.obsListOpen}
                onClick={() => props.onCaptureForPrevious?.()}
                style={{ background: props.obsListOpen ? "#2c3e50" : "#db440a" }}
              >
                <img src="/camera.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
              </button>
            )
          ) : imagePreview && title.trim() ? (
            <button
              type="submit"
              form="observation-create-form"
              className="capture-footer-btn"
              aria-label="Save and New"
              disabled={isSubmitting || props.obsListOpen}
              style={{ background: props.obsListOpen ? "#2c3e50" : "#006400" }}
            >
              <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
            </button>
          ) : (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Take Photo"
              disabled={props.obsListOpen}
              onClick={() => fileInputRef.current?.click()}
              style={{ background: props.obsListOpen ? "#2c3e50" : "#db440a" }}
            >
              <img src="/camera.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
            </button>
          )}
          {props.obsListOpen ? (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Close list"
              onClick={() => props.onCloseObsList?.()}
              style={{ background: "#95a5a6" }}
            >
              <img src="/x.svg" alt="" width="75" height="75" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
            </button>
          ) : props.isViewingPrevious ? (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Return to draft"
              disabled={props.copiedToDraft}
              onClick={() => props.onReturnToCurrent?.()}
              style={{ background: props.copiedToDraft ? "#2c3e50" : "#95a5a6" }}
            >
              <img src="/x.svg" alt="" width="75" height="75" style={{ filter: props.copiedToDraft ? "none" : "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
            </button>
          ) : (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Observations list"
              style={{ background: props.copiedToDraft ? "#2c3e50" : "#008080" }}
              onClick={() => props.onShowObsList?.()}
              disabled={props.copiedToDraft}
            >
              <img src="/datumise-observations.svg" alt="" width="47" height="47" style={{ filter: props.copiedToDraft ? "none" : "brightness(0) invert(1)" }} />
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
        <Modal.Title style={{ fontSize: "1rem" }}>Image preview</Modal.Title>
      </Modal.Header>

      <Modal.Body className="text-center p-0" style={{ background: "#2c3e50" }}>
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Observation"
            className="img-fluid"
            style={{ maxHeight: "70vh", objectFit: "contain" }}
          />
        )}
      </Modal.Body>

      <div className="survey-capture-actions">
        <div className="capture-footer-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Retake photo"
            onClick={() => {
              reopenPreviewRef.current = true;
              setShowImagePreviewModal(false);
              fileInputRef.current?.click();
            }}
            style={{ background: "#db440a" }}
          >
            <img src="/camera.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Confirm image"
            onClick={() => setShowImagePreviewModal(false)}
            style={{ background: "#006400" }}
          >
            <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Delete image"
            onClick={() => {
              setImage(null);
              setImagePreview("");
              localStorage.removeItem("datumise-observation-image");
              setShowImagePreviewModal(false);
            }}
            style={{ background: "#95a5a6" }}
          >
            <div className="d-flex flex-column align-items-center">
              <img src="/clear.svg" alt="" width="40" height="40" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
              <span style={{ fontSize: "0.78rem", color: "#faf6ef", marginTop: "2px", fontWeight: 700 }}>Clear</span>
            </div>
          </button>
        </div>
      </div>
    </Modal>

    <Modal
      show={showNotesModal}
      onHide={() => setShowNotesModal(false)}
      dialogClassName="modal-bottom"
    >
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: "1rem" }}>Description</Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-2" style={{ backgroundColor: "#faf6ef" }}>
        <Form.Control
          as="textarea"
          rows={4}
          value={title}
          onChange={(e) => {
            if (e.target.value.length <= 150) {
              const updatedData = { ...formData, title: e.target.value };
              setFormData(updatedData);
              localStorage.setItem("datumise-observation-draft", JSON.stringify(updatedData));
            }
          }}
          placeholder="Add observation description"
          maxLength={150}
          autoFocus
          style={{ resize: "none", lineHeight: "1.25", fontSize: "0.9rem", backgroundColor: title.trim() ? "#f0ece4" : "#ecf0f1", border: "none" }}
        />
        <div className="d-flex justify-content-between mt-1">
          <small style={{ fontSize: "0.72rem", color: "#db440a" }}>{title.length} / 150</small>
        </div>
      </Modal.Body>
      <div className="survey-capture-actions">
        <div className="capture-footer-grid">
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Go back"
            onClick={() => setShowNotesModal(false)}
            style={{ background: "#2c3e50" }}
          >
            <img src="/datumise-return.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Edit"
            onClick={() => titleInputRef.current?.focus()}
            style={{ background: "#1a5bc4" }}
          >
            <img src="/datumise-edit.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Save"
            onClick={() => setShowNotesModal(false)}
            style={{ background: "#006400" }}
          >
            <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Clear"
            onClick={() => {
              const updatedData = { ...formData, title: "" };
              setFormData(updatedData);
              localStorage.setItem("datumise-observation-draft", JSON.stringify(updatedData));
            }}
            disabled={!title.length}
            style={{ background: "#95a5a6" }}
          >
            <div className="d-flex flex-column align-items-center">
              <img src="/clear.svg" alt="" width="40" height="40" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
              <span style={{ fontSize: "0.78rem", color: "#faf6ef", marginTop: "2px", fontWeight: 700 }}>Clear</span>
            </div>
          </button>
        </div>
      </div>
    </Modal>










  </div>
);
}
export default ObservationCreateForm;