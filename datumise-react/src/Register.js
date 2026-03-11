import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api/api";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password1: "",
    password2: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    try {
      await api.post("/api/auth/registration/", formData);
      navigate("/login");
    } catch (err) {
          console.log("Registration error:", err.response?.data);
        setErrors(err.response?.data || { detail: "Registration failed." });
    }
  };


  return (
  <div className="container mt-4">
    <h3>Register</h3>
 
    {errors.detail && (
        <div className="alert alert-danger">
            {errors.detail}
        </div>
    )}

    {Object.keys(errors).length > 0 && !errors.detail && (
    <div className="alert alert-danger">
        {Object.entries(errors).map(([field, messages]) => (
        <div key={field}>
            <strong>{field}:</strong>{" "}
            {Array.isArray(messages) ? messages.join(" ") : messages}
        </div>
        ))}
    </div>
    )}



    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">Username</label>
        <input
          className="form-control"
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Email</label>
        <input
          type="email"
          className="form-control"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-control"
          name="password1"
          value={formData.password1}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Confirm Password</label>
        <input
          type="password"
          className="form-control"
          name="password2"
          value={formData.password2}
          onChange={handleChange}
          required
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Register
      </button>
    </form>
  </div>
);
}

export default Register;