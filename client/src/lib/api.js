// client/src/lib/api.js
import axios from "axios"

// If you have VITE_API_URL set (e.g. https://magazine-123.onrender.com/api) use it,
// otherwise fallback to /api (same-origin).
const rawBase = import.meta.env.VITE_API_URL || "/api"
const baseURL = String(rawBase).replace(/\/$/, "")

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
export default api
