import axios from "axios"

const baseURL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://magazine-123.onrender.com/api"

export const api = axios.create({
  baseURL,
  withCredentials: true, // cookie auth
})

api.interceptors.request.use((config) => {
  try {
    // ✅ един ключ навсякъде
    const token = localStorage.getItem("miren_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})
