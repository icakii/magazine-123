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
  ].some((route) => url.includes(route))

  // пазим кой token е бил изпратен с тази заявка (за anti-race логика при 401)
  config._authTokenSnapshot = !isPublicAuthRoute ? token || null : null

  // axios v1 може да има AxiosHeaders (set()), затова поддържаме и двата начина
  if (token && !isPublicAuthRoute) {
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
    // ❗️Важно: чистим token-а само ако самата заявка е пратила auth header.
    // Така избягваме race: стар /user/me (без token) да изчисти току-що записан token след login.
    // НЕ dispatch-ваме auth:changed, за да няма refresh loop.
    const hadAuthHeader = Boolean(
      err?.config?.headers?.Authorization ||
        err?.config?.headers?.authorization ||
        (typeof err?.config?.headers?.get === "function" &&
          (err.config.headers.get("Authorization") || err.config.headers.get("authorization")))
    )

    if (err?.response?.status === 401 && hadAuthHeader) {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("token")
    }
    return Promise.reject(err)
  }
)

export default api
