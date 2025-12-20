// client/src/lib/api.js
import axios from "axios"

/**
 * ✅ FINAL FIX (Render / One Web Service):
 * - In production, ALWAYS call same-origin API: /api
 * - In dev, you can set VITE_API_URL="http://localhost:8080/api"
 *
 * Why: you serve frontend+backend from the same Render service.
 * Hardcoding https://magazine-123.onrender.com/api breaks when your actual site URL is different.
 */
function resolveBaseURL() {
  const env = import.meta.env.VITE_API_URL?.trim()

  // If you explicitly set VITE_API_URL, use it (dev or multi-service setup)
  if (env) return env.replace(/\/$/, "")

  // ✅ Default: same-origin API
  return "/api"
}

export const api = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true, // cookie auth
})

// Optional: bearer token (keep only if you really use it)
api.interceptors.request.use((config) => {
  try {
    // NOTE: you previously used auth_token in other places.
    // Keep BOTH keys to avoid confusion during migration.
    const token =
      localStorage.getItem("miren_token") || localStorage.getItem("auth_token")

    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}

  return config
})
