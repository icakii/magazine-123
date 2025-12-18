// client/src/lib/api.js
import axios from "axios"

const base =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api"

export const api = axios.create({
  baseURL: base,
  withCredentials: true,
})

// ✅ FIX за Safari/Mobile: ако cookie не се прати, пращаме Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
