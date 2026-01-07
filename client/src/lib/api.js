// client/src/lib/api.js
import axios from "axios"

const rawBase = import.meta.env.VITE_API_URL || "/api"
const baseURL = String(rawBase).replace(/\/$/, "")

export const api = axios.create({
  baseURL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token") || localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
