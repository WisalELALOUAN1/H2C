// services/api.ts
import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api"; // à adapter

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- AUTH ---
export const loginApi = (email: string, password: string) =>
  api.post("/auth/login", { email, password });



export default api;