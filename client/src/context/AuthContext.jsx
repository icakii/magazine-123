// client/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import { api } from "../lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const res = await api.get("/user/me")
      setUser(res.data?.user || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
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

    // 2FA required
    if (res.data?.requires2fa) {
      return { requires2fa: true }
    }

    if (res.data?.token) {
      localStorage.setItem("auth_token", res.data.token)
    }

    // ако бекенд върне user директно — сетваме го веднага
    if (res.data?.user) {
      setUser(res.data.user)
      setLoading(false)
    } else {
      await refreshMe()
    }

    window.dispatchEvent(new Event("auth:changed"))
    return { ok: true }
  }, [refreshMe])

  const verify2FA = useCallback(async ({ email, code }) => {
    const res = await api.post("/auth/verify-2fa", { email, code })

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
    return { user, loading, refreshMe, login, verify2FA, logout }
  }, [user, loading, refreshMe, login, verify2FA, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider/>")
  return ctx
}
