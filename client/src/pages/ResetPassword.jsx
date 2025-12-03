import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  if (!token) {
    return <div className="page" style={{textAlign:'center', color:'red'}}>Invalid Link (Missing Token)</div>
  }

  async function submit(e) {
    e.preventDefault()
    if (pass.length < 6) {
        setMsg({ type: 'error', text: 'Password must be at least 6 chars.' })
        return
    }
    
    setLoading(true)
    setMsg({ type: '', text: '' })

    try {
      await api.post('/auth/reset-password', { token, newPassword: pass })
      setMsg({ type: 'success', text: 'Password reset successfully!' })
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.error || 'Error resetting password.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h2 className="headline">New Password</h2>
      <div className="form-container">
        <form onSubmit={submit} className="form">
          <label className="form-row">
            <span className="label">New Password</span>
            <input 
              className="input xl" 
              type="password" 
              value={pass} 
              onChange={e => setPass(e.target.value)} 
              placeholder="******" 
              required 
            />
          </label>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
        {msg.text && (
            <p className={`msg ${msg.type === 'error' ? 'danger' : 'success'}`} style={{marginTop: 20}}>
                {msg.text}
            </p>
        )}
      </div>
    </div>
  )
}