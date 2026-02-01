// client/src/lib/api.js
import axios from "axios"

const rawBase = import.meta.env.VITE_API_URL || "/api"
const baseURL = String(rawBase).replace(/\/$/, "")

export const api = axios.create({
  baseURL,
  withCredentials: true, // ✅ важно за httpOnly cookie auth
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token") || localStorage.getItem("token")

  config.headers = config.headers || {}

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization
  }

  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // ако token/cookie е невалиден — чистим и казваме на UI-то
    if (err?.response?.status === 401) {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("token")
      window.dispatchEvent(new Event("auth:changed"))
    }
    return Promise.reject(err)
  }
)

export default api
