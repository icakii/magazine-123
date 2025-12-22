// client/src/lib/api.js
import axios from "axios"

// If you have VITE_API_URL set (e.g. https://magazine-123.onrender.com/api) use it,
// otherwise fallback to /api (same-origin).
const rawBase = import.meta.env.VITE_API_URL || "/api"
const baseURL = String(rawBase).replace(/\/$/, "")

export const api = axios.create({
  baseURL,
  withCredentials: true,
})

// Optional: attach bearer token if you store it in localStorage
api.interceptors.request.use((config) => {
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("miren_token") ||
      ""

    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return config
})

export default api
