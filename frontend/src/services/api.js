import axios from "axios";

let rawUrl = (import.meta.env.VITE_API_URL || "").trim();

// If not provided in env, default to localhost for dev
let baseURL = rawUrl || "http://localhost:5000/api";

// Auto-sanitize: remove trailing slash
if (baseURL.endsWith("/")) {
  baseURL = baseURL.slice(0, -1);
}

// Auto-append /api if user provided Render domain without /api (e.g. https://service.onrender.com)
if (!baseURL.endsWith("/api") && !baseURL.includes("/api")) {
  baseURL = `${baseURL}/api`;
}

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    // If request is directed to admin routes, prioritize admin token
    if (config.url?.startsWith("/admin")) {
      const adminToken = localStorage.getItem("adminToken");
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else {
      // For student or document requests, check student token first, fallback to admin
      const studentToken = localStorage.getItem("studentToken");
      const adminToken = localStorage.getItem("adminToken");
      const token = studentToken || adminToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiry handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthUrl = error.config?.url?.includes("/login") || error.config?.url?.includes("/verify-otp");
      if (!isAuthUrl) {
        // Token expired or invalid
        console.warn("Session expired or unauthorized request");
      }
    }
    return Promise.reject(error);
  }
);

export default api;