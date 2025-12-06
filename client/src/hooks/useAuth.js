// client/src/hooks/useAuth.js
import { useEffect, useState } from "react"
import { api } from "../lib/api"

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        // 1. Взимаме базовия user
        const userRes = await api.get("/user/me")
        if (!mounted) return

        const basicUser = userRes.data

        // 2. Взимаме абонамента
        try {
          const subRes = await api.get("/subscriptions")
          const plan = (subRes.data?.[0]?.plan || "free").toLowerCase()

          if (!mounted) return
          setUser({
            ...basicUser,
            subscription: plan, // 'free' | 'monthly' | 'yearly'
          })
        } catch {
          if (!mounted) return
          setUser({
            ...basicUser,
            subscription: "free",
          })
        }
      } catch {
        // не е логнат
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  // true ако е monthly или yearly
  const hasSubscription = !!(
    user &&
    ["monthly", "yearly"].includes((user.subscription || "").toLowerCase())
  )

  return { user, loading, hasSubscription }
}
