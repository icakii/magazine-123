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
  const url = String(config?.url || "")

  const isPublicAuthRoute = [
    "/auth/login",
    "/auth/register",
    "/auth/confirm",
    "/auth/send-2fa",
    "/auth/verify-2fa",
    "/auth/reset-password-request",
  ].some((route) => url.includes(route))

  if (token && !isPublicAuthRoute) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization
  }

  return config
})

export default api
