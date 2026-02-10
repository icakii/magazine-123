// client/src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { api } from "../lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // ✅ пазим флаг да не правим refresh loop
  const refreshInFlight = useRef(false)

  const refreshMe = useCallback(async () => {
    if (refreshInFlight.current) return
    refreshInFlight.current = true

    try {
      const res = await api.get("/user/me")
      // бекендът ти връща директно { email, displayName, twoFaEnabled }
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

  const login = useCallback(async ({ email, password }) => {
    const res = await api.post("/auth/login", { email, password })

    if (res.data?.requires2fa) {
      return { requires2fa: true }
    }

    if (res.data?.token) {
      localStorage.setItem("auth_token", res.data.token)
    }

    await refreshMe()
    window.dispatchEvent(new Event("auth:changed"))
    return { ok: true }
  }, [refreshMe])

  const send2FA = useCallback(async (email) => {
    await api.post("/auth/send-2fa", { email })
    return { ok: true }
  }, [])

  const verify2FA = useCallback(async ({ email, code }) => {
    const res = await api.post("/auth/verify-2fa", { email, code })

    // ✅ ТУК е ключът: verify-2fa връща token в твоя бекенд
    if (res.data?.token) {
      localStorage.setItem("auth_token", res.data.token)
    }

    await refreshMe()
    window.dispatchEvent(new Event("auth:changed"))
    return { ok: true }
  }, [refreshMe])

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout")
    } catch {}

    localStorage.removeItem("auth_token")
    localStorage.removeItem("token")
    setUser(null)
    setLoading(false)
    window.dispatchEvent(new Event("auth:changed"))
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
