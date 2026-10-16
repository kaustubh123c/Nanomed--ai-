
import axios from "axios";

const api = axios.create({
  baseURL: "https://nanomed-ai-sb9d.onrender.com/api",
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
