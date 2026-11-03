import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor for JWT
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 429) {
        // Handle too many requests
        console.error('❌ Rate Limit Error: Too many requests.');
        if (typeof window !== 'undefined') {
          import('sonner').then(({ toast }) => {
            toast.error('Too many requests. Please wait a moment.');
          });
        }
      } else {
        console.error('❌ API Error:', error.response.data.message || error.response.statusText);
      }
    } else if (error.request) {
      console.error('❌ Network Error: Backend might be down.');
    } else {
      console.error('❌ Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
