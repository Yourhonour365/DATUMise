import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://127.0.0.1:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  const noAuthRoutes = [
    "/api/auth/login/",
    "/api/auth/registration/",
  ];

  if (token && !noAuthRoutes.includes(config.url)) {
    config.headers.Authorization = `Token ${token}`;
  }

  return config;
});

export default api;