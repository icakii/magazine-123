// src/hooks/useAuth.js
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/user/me')
      .then(res => { if (mounted) setUser(res.data) })
      .catch(() => { if (mounted) setUser(null) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return { user, loading }
}
