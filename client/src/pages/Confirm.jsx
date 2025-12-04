// client/src/pages/Confirm.jsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function Confirm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState('loading')
  const [msg, setMsg] = useState('Processing confirmation...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMsg('No token provided in the link.')
      return
    }

    api.post('/auth/confirm', { token })
      .then((res) => {
        setStatus('success')
        setMsg('Email confirmed successfully! Redirecting...')
        
        // ЗАПАЗВАМЕ ТОКЕНА ЗА SAFARI
        if (res.data.token) {
            localStorage.setItem('auth_token', res.data.token)
        }
        
        setTimeout(() => { 
          navigate('/profile') 
        }, 2000)
      })
      .catch((err) => {
        console.error("Confirmation Error:", err)
        setStatus('error')
        setMsg(err?.response?.data?.error || 'Confirmation failed. The link might be expired.')
      })
  }, [token, navigate])

  return (
    <div className="page" style={{textAlign: 'center', padding: '50px'}}>
      <h2 className="headline">Email Confirmation</h2>
      
      {status === 'loading' && (
        <p style={{fontSize: '1.2rem', color: 'gray'}}>⏳ {msg}</p>
      )}

      {status === 'success' && (
        <div style={{color: 'green'}}>
          <h1 style={{fontSize: '3rem'}}>✅</h1>
          <p style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{msg}</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{color: 'red'}}>
          <h1 style={{fontSize: '3rem'}}>❌</h1>
          <p style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{msg}</p>
          <button onClick={() => navigate('/')} className="btn outline" style={{marginTop: '20px'}}>Go Home</button>
        </div>
      )}
    </div>
  )
}