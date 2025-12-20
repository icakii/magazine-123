import axios from "axios"

const baseURL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://magazine-123.onrender.com/api"

export const api = axios.create({
  baseURL,
  withCredentials: true, // защото ползваш cookies auth
})

// (optional) attach bearer if ти трябва някога
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("miren_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})
