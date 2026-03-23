import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
      // Check if user is archived before allowing access
      try {
        const userRes = await api.get("/api/auth/user/");
        const uid = userRes.data.pk || userRes.data.id;
        const teamRes = await api.get("/api/team/");
        const team = teamRes.data.results || teamRes.data;
        const me = team.find(m => String(m.id) === String(uid));
        if (me && me.status === "archived") {
          localStorage.removeItem("token");
          setErrors({ detail: "Your account has been archived. Please contact an administrator." });
          return;
        }
      } catch (_) {}
      window.location.href = "/";
    } catch (err) {
      console.log("Login error:", err.response?.data);
      setErrors(err.response?.data || { detail: "Login failed." });
    }
  };

  return (
    <div className="container mt-4">
      <div className="mb-3">
        <Link to="/" className="text-decoration-none">
          &larr; Back to Home
        </Link>
      </div>
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