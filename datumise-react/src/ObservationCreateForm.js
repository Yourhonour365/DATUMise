import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Form, Button, Modal } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import api from "./api/api";
import heic2any from "heic2any";

function ObservationCreateForm(props) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [image, setImage] = useState(null);
 
 
  const clearForm = () => {
    imageWriteCancelledRef.current = true;
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
  const [searchParams] = useSearchParams();
  const surveyId = props.surveyId || searchParams.get("survey");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const reopenPreviewRef = useRef(false);
  const imageWriteCancelledRef = useRef(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
  const originalImageRef = useRef(null);
  const originalImageFileRef = useRef(null);
  const [hasPendingImage, setHasPendingImage] = useState(false);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const pendingImageFileRef = useRef(null);
  const pendingImageUrlRef = useRef(null);
  const isFirstPhotoModalRef = useRef(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const autoSaveFnRef = useRef(null);

  useEffect(() => {
    if (props.openNotesTrigger) setShowNotesModal(true);
  }, [props.openNotesTrigger]);

  // Keep auto-save function up to date with latest state
  autoSaveFnRef.current = async () => {
    if (!title.trim() && !imagePreview) return;
    const data = new FormData();
    data.append("title", title || "");
    data.append("description", description || "");
    data.append("is_draft", "true");
    if (surveyId) data.append("survey", surveyId);
    let imageFile = image;
    if (!imageFile && imagePreview) {
      try {
        const res = await fetch(imagePreview);
        const blob = await res.blob();
        imageFile = new File([blob], "observation.jpg", { type: blob.type || "image/jpeg" });
      } catch (e) { /* silent */ }
    }
    if (!imageFile) {
      const saved = localStorage.getItem("datumise-observation-image");
      if (saved) {
        try {
          const res = await fetch(saved);
          const blob = await res.blob();
          imageFile = new File([blob], "observation.jpg", { type: blob.type || "image/jpeg" });
        } catch (e) { /* silent */ }
      }
    }
    if (imageFile) data.append("image", imageFile);
    try {
      const response = await api.post("/api/observations/", data, { headers: { "Content-Type": "multipart/form-data" } });
      clearForm();
      props.onDraftSaved?.(response.data);
    } catch (e) {
      console.error("Auto-save draft failed:", e);
    }
  };

  useEffect(() => {
    props.onRegisterAutoSave?.(() => autoSaveFnRef.current?.());
    return () => props.onRegisterAutoSave?.(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const restoreDraft = async () => {
    const savedDraft = localStorage.getItem("datumise-observation-draft");

    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);

        // Only restore if the draft belongs to the current survey
        if (parsedDraft.surveyId && String(parsedDraft.surveyId) !== String(surveyId)) {
          localStorage.removeItem("datumise-observation-draft");
          localStorage.removeItem("datumise-observation-image");
          return;
        }

        setFormData({
          title: parsedDraft.title || "",
          description: parsedDraft.description || "",
        });

        const savedImage = localStorage.getItem("datumise-observation-image");
        if (savedImage) {
          // Validate image loads before using it
          await new Promise((resolve) => {
            const testImg = new Image();
            testImg.onload = async () => {
              setImagePreview(savedImage);
              try {
                const res = await fetch(savedImage);
                const blob = await res.blob();
                const file = new File([blob], "restored-image.jpg", { type: blob.type });
                setImage(file);
              } catch (e) {
                console.error("Failed to restore image file:", e);
              }
              resolve();
            };
            testImg.onerror = () => {
              localStorage.removeItem("datumise-observation-image");
              resolve();
            };
            testImg.src = savedImage;
          });
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
      JSON.stringify({ ...updatedData, surveyId })
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
                onChange={async (e) => {
                  let file = e.target.files[0];
                  if (file) {
                    // Convert HEIC/HEIF to JPEG for browser compatibility
                    if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
                      try {
                        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
                        file = new File([converted], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
                      } catch (err) {
                        console.error("HEIC conversion failed:", err);
                      }
                    }
                    reopenPreviewRef.current = false;
                    if (imagePreview) {
                      // Retake: store as pending, keep original in imagePreview
                      pendingImageFileRef.current = file;
                      pendingImageUrlRef.current = URL.createObjectURL(file);
                      setHasPendingImage(true);
                      setShowingOriginal(false);
                      setShowImagePreviewModal(true);
                    } else {
                      // First photo: set directly
                      isFirstPhotoModalRef.current = true;
                      imageWriteCancelledRef.current = false;
                      setImage(file);
                      const blobUrl = URL.createObjectURL(file);
                      setImagePreview(blobUrl);
                      setShowImagePreviewModal(true);
                      // Save base64 to localStorage for draft restoration
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (reader.result && !imageWriteCancelledRef.current) {
                          localStorage.setItem("datumise-observation-image", reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }}
            />

            <div
                  className="obs-capture-block"
                  onClick={() => {
                    if (imagePreview) {
                      isFirstPhotoModalRef.current = false;
                      setHasPendingImage(false);
                      setShowingOriginal(false);
                      pendingImageFileRef.current = null;
                      pendingImageUrlRef.current = null;
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
                    border: !imagePreview && title.trim() ? "4px solid #FF7518" : "none",
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
                    {title.trim() ? "ADD PHOTO TO PROCEED" : "Start by adding a photo"}
                  </span>
                  <img src="/datumise-add.svg" alt="" width="28" height="28" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)", opacity: 0.8 }} />
                </div>
              )}
            </div>

          {/* Hidden input to satisfy form required validation */}
          <input type="hidden" name="title" value={title} />
          <Form.Control ref={titleInputRef} className="d-none" as="textarea" name="title_hidden" value={title} onChange={handleChange} onBlur={handleTitleBlur} maxLength={150} autoComplete="off" />

          {title.trim() ? (
            <fieldset className="obs-capture-block rounded pt-0 pb-1 px-2 d-flex flex-column" style={{ backgroundColor: "#FAF8F3", border: "none", width: "336px", maxWidth: "100%", margin: "0 auto", overflow: "hidden" }}>
              <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0 pt-0">
                Description
              </legend>
              <div
                className="p-1 flex-grow-1"
                style={{ lineHeight: "1.5", fontSize: "16px", cursor: "pointer", overflowWrap: "break-word", wordBreak: "normal", whiteSpace: "pre-line" }}
                onClick={() => setShowNotesModal(true)}
              >
                {title}
              </div>
            </fieldset>
          ) : (
            <div
              className="obs-capture-block"
              onClick={() => setShowNotesModal(true)}
              style={{
                width: "336px",
                maxWidth: "100%",
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
                  Add description
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
          {props.isViewingPrevious && props.isDraftObs ? (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Observations list"
              style={{ background: props.obsListOpen ? "#2c3e50" : "#008080" }}
              onClick={() => props.onShowObsList?.()}
              disabled={props.obsListOpen}
            >
              <img src="/datumise-observations.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
            </button>
          ) : props.isViewingPrevious ? (
            <div />
          ) : (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Observations list"
              style={{ background: props.copiedToDraft || props.obsListOpen ? "#2c3e50" : (!props.isViewingPrevious && title.trim() && !imagePreview ? "#336666" : "#008080") }}
              onClick={() => props.onShowObsList?.()}
              disabled={props.copiedToDraft || props.obsListOpen}
            >
              <img src="/datumise-observations.svg" alt="" width="47" height="47" style={{ filter: props.copiedToDraft || props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
            </button>
          )}
          {props.copiedToDraft && props.isViewingPrevious ? (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Confirm copy"
              disabled={props.obsListOpen}
              onClick={() => props.onConfirmCopy?.()}
              style={{ background: props.obsListOpen ? "#2c3e50" : "#006400" }}
            >
              <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
            </button>
          ) : props.isViewingPrevious && !props.isDraftObs ? (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Newer observation"
              disabled={props.obsListOpen || !props.onStepForward}
              onClick={() => props.onStepForward?.()}
              style={{ background: props.obsListOpen || !props.onStepForward ? "#2c3e50" : "#1a5bc4" }}
            >
              <img src="/datumise_back.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen || !props.onStepForward ? "none" : "brightness(0) invert(1)" }} />
            </button>
          ) : (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Edit observation"
              disabled={props.obsListOpen}
              onClick={() => props.isViewingPrevious ? props.onEditPrevious?.() : setShowNotesModal(true)}
              style={{ background: props.obsListOpen ? "#2c3e50" : (!props.isViewingPrevious && title.trim() && !imagePreview ? "#3d6b9e" : !props.isViewingPrevious && !title.trim() && !imagePreview ? "#2d4a7a" : "#1a5bc4") }}
            >
              <img src="/text.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
            </button>
          )}
          {props.isViewingPrevious && props.isDraftObs ? (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Complete draft"
              disabled={props.obsListOpen || props.previousObsIncomplete}
              onClick={() => props.onCompleteDraft?.()}
              style={{ background: props.obsListOpen || props.previousObsIncomplete ? "#2c3e50" : "#006400" }}
            >
              <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen || props.previousObsIncomplete ? "none" : "brightness(0) invert(1)" }} />
            </button>
          ) : props.isViewingPrevious ? (
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
                aria-label="Older observation"
                disabled={props.obsListOpen || !props.onStepBack}
                onClick={() => props.onStepBack?.()}
                style={{ background: props.obsListOpen || !props.onStepBack ? "#2c3e50" : "#1a5bc4" }}
              >
                <img src="/right.svg" alt="" width="47" height="47" style={{ filter: props.obsListOpen || !props.onStepBack ? "none" : "brightness(0) invert(1)" }} />
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
              <img src="/camera.svg" alt="" width={title.trim() && !imagePreview ? 62 : !title.trim() && !imagePreview ? 58 : 47} height={title.trim() && !imagePreview ? 62 : !title.trim() && !imagePreview ? 58 : 47} style={{ filter: props.obsListOpen ? "none" : "brightness(0) invert(1)" }} />
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
              disabled={props.isDraftObs}
              onClick={() => props.onReturnToCurrent?.()}
              style={{ background: props.isDraftObs ? "#2c3e50" : "#95a5a6" }}
            >
              <img src="/x.svg" alt="" width="75" height="75" style={{ filter: props.isDraftObs ? "none" : "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
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
        </div>
      </>,
      props.actionBarTarget
    )}


    <Modal
      show={showImagePreviewModal}
      onHide={() => {
        if (hasPendingImage) {
          setHasPendingImage(false);
          setShowingOriginal(false);
          pendingImageFileRef.current = null;
          pendingImageUrlRef.current = null;
        } else if (isFirstPhotoModalRef.current) {
          imageWriteCancelledRef.current = true;
          setImage(null);
          setImagePreview("");
          localStorage.removeItem("datumise-observation-image");
        }
        setShowImagePreviewModal(false);
      }}
      fullscreen={true}
    >
      <Modal.Body className="text-center p-0" style={{ background: "#687374", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {(hasPendingImage && !showingOriginal ? pendingImageUrlRef.current : imagePreview) ? (
          <img
            src={hasPendingImage && !showingOriginal ? pendingImageUrlRef.current : imagePreview}
            alt="Observation"
            className="img-fluid"
            style={{ maxHeight: "calc(100vh - 80px)", objectFit: "contain", width: "100%" }}
          />
        ) : (
          <div
            className="d-flex flex-column align-items-center gap-2"
            style={{ cursor: "pointer" }}
            onClick={() => { reopenPreviewRef.current = true; fileInputRef.current?.click(); }}
          >
            <span style={{ color: "#faf6ef", fontSize: "1.1rem", fontWeight: 600 }}>Add a photo</span>
            <img src="/datumise-add.svg" alt="" width="28" height="28" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)", opacity: 0.8 }} />
          </div>
        )}
      </Modal.Body>

      <div className="survey-capture-actions">
        <div className="capture-footer-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {hasPendingImage ? (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Toggle image"
              onClick={() => setShowingOriginal(prev => !prev)}
              style={{ background: "#1a5bc4" }}
            >
              <img src="/shift.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
          ) : (
            <button
              type="button"
              className="capture-footer-btn"
              aria-label="Prior observations"
              onClick={() => { setShowImagePreviewModal(false); props.onShowObsList?.(); }}
              style={{ background: "#008080" }}
            >
              <img src="/datumise-observations.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
          )}
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Retake photo"
            onClick={() => {
              reopenPreviewRef.current = true;
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
            onClick={() => {
              if (hasPendingImage) {
                // Accept pending: write to state and localStorage
                imageWriteCancelledRef.current = false;
                setImage(pendingImageFileRef.current);
                setImagePreview(pendingImageUrlRef.current);
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (reader.result && !imageWriteCancelledRef.current) {
                    localStorage.setItem("datumise-observation-image", reader.result);
                  }
                };
                reader.readAsDataURL(pendingImageFileRef.current);
                setHasPendingImage(false);
                setShowingOriginal(false);
                pendingImageFileRef.current = null;
                pendingImageUrlRef.current = null;
              }
              setShowImagePreviewModal(false);
            }}
            style={{ background: "#006400" }}
          >
            <img src="/datumise-confirm.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Close"
            onClick={() => {
              if (hasPendingImage) {
                setHasPendingImage(false);
                setShowingOriginal(false);
                pendingImageFileRef.current = null;
                pendingImageUrlRef.current = null;
              } else if (isFirstPhotoModalRef.current) {
                imageWriteCancelledRef.current = true;
                setImage(null);
                setImagePreview("");
                localStorage.removeItem("datumise-observation-image");
              }
              setShowImagePreviewModal(false);
            }}
            style={{ background: "#95a5a6" }}
          >
            <img src="/x.svg" alt="" width="75" height="75" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
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
      <Modal.Body className="py-2" style={{ backgroundColor: "#fefdf8" }}>
        <Form.Control
          as="textarea"
          rows={6}
          value={title}
          onChange={(e) => {
            const newValue = e.target.value;
            const ta = e.target;
            const maxScrollHeight = 24 * 6 + 8;
            if (ta.scrollHeight <= maxScrollHeight || newValue.length < title.length) {
              const updatedData = { ...formData, title: newValue };
              setFormData(updatedData);
              localStorage.setItem("datumise-observation-draft", JSON.stringify({ ...updatedData, surveyId }));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (title.match(/\n/g) || []).length >= 5) e.preventDefault();
          }}
          placeholder="Add description"
          maxLength={500}
          autoFocus
          style={{ resize: "none", lineHeight: "24px", fontSize: "1rem", fontWeight: 500, border: "none", borderRadius: 0, color: "#1A1D21", padding: "0 10px 8px 19px", boxSizing: "border-box", width: "100%", backgroundColor: "#fefdf8", backgroundImage: "linear-gradient(transparent calc(100% - 1px), #5a9fc0 calc(100% - 1px)), linear-gradient(90deg, transparent 14px, #ff6666 14px, #ff6666 15px, transparent 15px)", backgroundSize: "100% 24px, 100% 100%", backgroundPosition: "0 -2px, 0 0" }}
        />
      </Modal.Body>
      <div className="survey-capture-actions">
        <div className="capture-footer-grid">
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Prior observations"
            onClick={() => { setShowNotesModal(false); props.onShowObsList?.({ notesOpen: true }); }}
            style={{ background: "#008080" }}
          >
            <img src="/datumise-observations.svg" alt="" width="47" height="47" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
          <button
            type="button"
            className="capture-footer-btn"
            aria-label="Clear"
            onClick={() => {
              const updatedData = { ...formData, title: "" };
              setFormData(updatedData);
              localStorage.setItem("datumise-observation-draft", JSON.stringify({ ...updatedData, surveyId }));
            }}
            disabled={!title.length}
            style={{ background: "#95a5a6" }}
          >
            <div className="d-flex flex-column align-items-center">
              <img src="/clear.svg" alt="" width="40" height="40" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
              <span style={{ fontSize: "0.78rem", color: "#faf6ef", marginTop: "2px", fontWeight: 700 }}>Clear</span>
            </div>
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
            aria-label="Go back"
            onClick={() => setShowNotesModal(false)}
            style={{ background: "#95a5a6" }}
          >
            <img src="/x.svg" alt="" width="75" height="75" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(0.2) hue-rotate(340deg) brightness(1.05)" }} />
          </button>
        </div>
      </div>
    </Modal>










  </div>
);
}
export default ObservationCreateForm;