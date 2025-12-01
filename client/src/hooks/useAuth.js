// src/hooks/useAuth.js
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    
    api.get('/user/me')
      .then(userRes => {
          if (!mounted) return;
          const basicUser = userRes.data
          
          // Взимаме абонамента
          api.get('/subscriptions')
             .then(subRes => {
                 const plan = subRes.data[0]?.plan || 'free';
                 
                 setUser({ ...basicUser, subscription: plan })
             })
             .catch(() => {
                 // Ако абонаментната заявка се счупи, слагаме free
                 setUser({ ...basicUser, subscription: 'free' }) 
             })
             .finally(() => { 
                 if (mounted) setLoading(false) 
             })
      })
      .catch(() => {
          // Ако /user/me се счупи (не си логнат)
          if (mounted) setUser(null) 
          if (mounted) setLoading(false) 
      })
      
    return () => { mounted = false }
  }, [])

  return { user, loading }
}