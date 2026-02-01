import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refreshMe() {
    try {
      const res = await api.get("/api/user/me")
      setUser(res.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    // backend: /api/auth/login :contentReference[oaicite:4]{index=4}
    const res = await api.post("/api/auth/login", { email, password })

    // ако ползваш 2FA flow:
    if (res.data?.requires2fa) {
      return { requires2fa: true }
    }

    // запази token (по желание), cookie вече се сетва от backend-а
    if (res.data?.token) localStorage.setItem("auth_token", res.data.token)

    await refreshMe()
    return { ok: true }
  }

  async function logout() {
    // backend: /api/auth/logout :contentReference[oaicite:5]{index=5}
    await api.post("/api/auth/logout")
    localStorage.removeItem("auth_token")
    setUser(null)
  }

  useEffect(() => {
    refreshMe()
    // sync между табове (ако logout-неш в друг tab)
    const onStorage = (e) => {
      if (e.key === "auth_token") refreshMe()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const value = useMemo(
    () => ({ user, loading, refreshMe, login, logout }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider/>")
  return ctx
}
