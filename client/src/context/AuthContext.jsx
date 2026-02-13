// client/src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"

const AuthContext = createContext(null)

function storeToken(token) {
  try {
    localStorage.setItem("auth_token", token)
    localStorage.setItem("token", token)
  } catch {}
}

function clearToken() {
  try {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("token")
    localStorage.removeItem("miren_token")
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/user/me")
      setUser(res.data || null)
      return res.data || null
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshMe()
  }, [refreshMe])

  const login = useCallback(
    async ({ email, password }) => {
      const res = await api.post("/auth/login", { email, password })

      if (res.data?.requires2fa) {
        return { requires2fa: true }
      }

      if (res.data?.token) storeToken(res.data.token)
      await refreshMe()
      return { ok: true }
    },
    [refreshMe]
  )

  // NOTE: в твоя бекенд verify-2fa enable-ва 2FA.
  // Засега го ползваме и за login flow (по-късно е добре да ги разделим на два endpoint-а).
  const verify2FA = useCallback(
    async ({ email, code }) => {
      const res = await api.post("/auth/verify-2fa", { email, code })
      if (res.data?.token) storeToken(res.data.token)
      await refreshMe()
      return { ok: true }
    },
    [refreshMe]
  )

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await api.post("/auth/logout")
    } catch {}
    clearToken()
    setUser(null)
    setLoading(false)
  }, [])

  const value = useMemo(
    () => ({ user, loading, refreshMe, login, verify2FA, logout }),
    [user, loading, refreshMe, login, verify2FA, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}
