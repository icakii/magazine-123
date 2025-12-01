// src/hooks/useAuth.js
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    
    // 1. Взимаме основните данни за потребителя (име, имейл, последна промяна на името)
    api.get('/user/me')
      .then(userRes => {
          if (!mounted) return;
          const basicUser = userRes.data
          
          // 2. Взимаме абонамента, който се пази в отделна таблица
          api.get('/subscriptions')
             .then(subRes => {
                 // Взимаме последния (най-новия) абонамент
                 const plan = subRes.data[0]?.plan || 'free';
                 
                 // Създаваме пълния user обект, който всички страници ще ползват
                 setUser({ ...basicUser, subscription: plan })
             })
             .catch(() => {
                 // Ако абонаментната заявка се счупи, слагаме default
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