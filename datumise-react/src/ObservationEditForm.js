import React, { useEffect, useState } from "react";
import { Form, Button, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import api from "./api/api";

function ObservationEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [imageUrl, setImageUrl] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: null,
  });

  const { title, description, image } = formData;

  useEffect(() => {
    const fetchObservation = async () => {
      try {
        const response = await api.get(`/api/observations/${id}/`);
        setFormData({
          title: response.data.title,
          description: response.data.description,
          image: null,
        });

        setImageUrl(response.data.image || "");

      } catch (err) {
        console.log("Full error:", err);
        console.log("Status:", err.response?.status);
        console.log("Data:", err.response?.data);
        console.log("Message:", err.message);
      }
    };

    fetchObservation();
  }, [id]);

  const handleChange = (event) => {
    const { name, value, files } = event.target;

    setFormData({
      ...formData,
      [name]: name === "image" ? files[0] : value,
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
    const formDataToSend = new FormData();
      formDataToSend.append("title", title);
      formDataToSend.append("description", description);

      if (image) {
        formDataToSend.append("image", image);
    }

    try {
      await api.put(`/api/observations/${id}/`, formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      navigate(`/observations/${id}`);
    } catch (err) {
      console.log("Error updating observation:", err);
    }
  };

  return (
    <Container className="mt-4">
      <h3 className="mb-3">Edit Observation</h3>
        {imageUrl && (
            <div className="mb-4 text-center">
              <img
                src={imageUrl}
                alt={title}
                className="img-fluid rounded"
                style={{ maxHeight: "300px", objectFit: "contain" }}
              />
            </div>
          )}
      <Form onSubmit={handleSubmit}>
          <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
          <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0">
            Replace Image
          </legend>

          <Form.Control
            className="form-control"
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
          />
        </fieldset>
        
        
        <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
          <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0">
            Title
          </legend>

          <Form.Control
            className="border-0"
            type="text"
            name="title"
            value={title}
            onChange={handleChange}
            onBlur={handleTitleBlur}
            maxLength={200}
            placeholder="Enter observation title"
            required
          />
        </fieldset>

        <fieldset className="border rounded pt-0 pb-2 px-2 mb-3">
          <legend className="float-none w-auto px-2 fs-6 fw-bold text-dark mb-0">
            Description
          </legend>

          <Form.Control
            className="border-0"
            as="textarea"
            rows={12}
            name="description"
            value={description}
            onChange={handleChange}
            placeholder="Enter observation description"
          />
        </fieldset>

        

        <Button className="mt-3" variant="primary" type="submit">
          Save Changes
        </Button>
      </Form>
    </Container>
  );
}

export default ObservationEditForm;