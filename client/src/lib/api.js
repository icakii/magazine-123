// client/src/lib/api.js
import axios from "axios"

// Ако имаш VITE_API_URL на Render: примерно https://magazine-123.onrender.com
// Ако нямаш, остави празно и axios ще ползва same-origin.
const baseURL = import.meta.env.VITE_API_URL || "/api"

export const api = axios.create({
  baseURL,
  withCredentials: true, // важно за cookie auth (auth middleware)
})
