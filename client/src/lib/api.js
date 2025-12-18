// client/src/lib/api.js
import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api"

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

// --- FIX ЗА SAFARI / MOBILE ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")

  // НЕ пращаме Bearer token към auth endpoints (login/register/reset/confirm)
  const url = String(config.url || "")
  const isAuthEndpoint =
    url.startsWith("/auth/login") ||
    url.startsWith("/auth/register") ||
    url.startsWith("/auth/confirm") ||
    url.startsWith("/auth/reset-password-request") ||
    url.startsWith("/auth/reset-password") ||
    url.startsWith("/auth/send-2fa") ||
    url.startsWith("/auth/verify-2fa")

  if (token && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

