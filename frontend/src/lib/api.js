javascript
import axios from "axios";

const rawBaseURL = import.meta.env.VITE_API_URL || "/api";

// Add /api when using the deployed backend URL.
// Keep the local fallback unchanged.
const baseURL = rawBaseURL.startsWith("http")
  ? `${rawBaseURL.replace(/\/+$/, "")}/api`
  : rawBaseURL;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nanomed_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
