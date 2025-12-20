// client/src/lib/api.js
import axios from "axios"

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
})

// Bearer token fallback (Safari/mobile)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
