import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api/api";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
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
      const response = await api.post("/api/auth/login/", formData);
        localStorage.setItem("token", response.data.key);
        window.location.href = "/";
    } catch (err) {
      console.log("Login error:", err.response?.data);
      setErrors(err.response?.data || { detail: "Login failed." });
    }
  };

  return (
    <div className="container mt-4">
      <h3>Login</h3>

      {errors.detail && (
        <div className="alert alert-danger">
          {errors.detail}
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
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;