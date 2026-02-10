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

  // axios v1 може да има AxiosHeaders (set()), затова поддържаме и двата начина
  if (token) {
    if (config.headers && typeof config.headers.set === "function") {
      config.headers.set("Authorization", `Bearer ${token}`)
    } else {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } else {
    // ако няма token, махаме header-а
    if (config.headers && typeof config.headers.delete === "function") {
      config.headers.delete("Authorization")
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization
    }
  }

  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // ❗️Важно: чистим token-а, но НЕ dispatch-ваме auth:changed,
    // иначе AuthContext ще прави refreshMe -> 401 -> refreshMe -> loop...
    if (err?.response?.status === 401) {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("token")
    }
    return Promise.reject(err)
  }
)

export default api
