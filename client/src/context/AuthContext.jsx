// client/src/context/AuthContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { api } from "../lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshInFlight = useRef(false)
  const loggingOutRef = useRef(false)

  const refreshMe = useCallback(async () => {
    // ✅ ако сме в logout процес – НЕ рефрешвай user/me
    if (loggingOutRef.current) return

    if (refreshInFlight.current) return
    refreshInFlight.current = true

    try {
      const res = await api.get("/user/me")
      setUser(res.data || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
      refreshInFlight.current = false
    }
  }, [])

  useEffect(() => {
    refreshMe()

    const onChanged = () => refreshMe()
    window.addEventListener("auth:changed", onChanged)
    return () => window.removeEventListener("auth:changed", onChanged)
  }, [refreshMe])

  const login = useCallback(
    async ({ email, password }) => {
      const res = await api.post("/auth/login", { email, password })

      if (res.data?.requires2fa) return { requires2fa: true }

      if (res.data?.token) localStorage.setItem("auth_token", res.data.token)

      await refreshMe()
      window.dispatchEvent(new Event("auth:changed"))
      return { ok: true }
    },
    [refreshMe]
  )

  const send2FA = useCallback(async (email) => {
    await api.post("/auth/send-2fa", { email })
    return { ok: true }
  }, [])

  const verify2FA = useCallback(
    async ({ email, code }) => {
      const res = await api.post("/auth/verify-2fa", { email, code })
      if (res.data?.token) localStorage.setItem("auth_token", res.data.token)

      await refreshMe()
      window.dispatchEvent(new Event("auth:changed"))
      return { ok: true }
    },
    [refreshMe]
  )

  // ✅ FIX: logout без "връщане обратно" логнат
  const logout = useCallback(async () => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true

    try {
      // 1) ПЪРВО: кажи на сървъра да изчисти cookie/session
      await api.post("/auth/logout")
    } catch {}

    // 2) после чистим локалните токени
    try {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("token")
      localStorage.removeItem("miren_token")
    } catch {}

    // 3) UI -> logout веднага и стабилно
    setUser(null)
    setLoading(false)

    // 4) вече е безопасно да известим
    window.dispatchEvent(new Event("auth:changed"))

    loggingOutRef.current = false
  }, [])

  const value = useMemo(() => {
    return { user, loading, refreshMe, login, send2FA, verify2FA, logout }
  }, [user, loading, refreshMe, login, send2FA, verify2FA, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider/>")
  return ctx
}
