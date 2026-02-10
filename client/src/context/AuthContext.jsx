// client/src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api } from "../lib/api"

const AuthContext = createContext(null)

function readToken() {
  try {
    return localStorage.getItem("auth_token") || localStorage.getItem("token") || ""
  } catch {
    return ""
  }
}

function clearTokens() {
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
    } catch (e) {
      // 401/403 => не сме логнати
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const setAuthToken = useCallback(
    async (token) => {
      if (token) {
        try {
          localStorage.setItem("auth_token", token)
        } catch {}
      }
      return await refreshMe()
    },
    [refreshMe]
  )

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await api.post("/auth/logout")
    } catch {}
    clearTokens()
    setUser(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    // ако има token или cookie — пробваме да вземем user
    const token = readToken()
    if (token) {
      // token ще влезе в api interceptor автоматично
      refreshMe()
      return
    }
    // иначе пак пробвай (ако имаме httpOnly cookie)
    refreshMe()
  }, [refreshMe])

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshMe,
      setAuthToken,
      logout,
    }),
    [user, loading, refreshMe, setAuthToken, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}
