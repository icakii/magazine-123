// client/src/pages/Login.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [isForgotPass, setIsForgotPass] = useState(false)
  const [loading, setLoading] = useState(false)

  function update(e) { setForm({ ...form, [e.target.name]: e.target.value }) }

  async function submitLogin(e) {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      
      // 1. ПРОВЕРКА ЗА 2FA
      if (res.data && res.data.requires2fa) {
        sessionStorage.setItem('twofa_email', form.email) 
        location.href = '/2fa/verify' 
        return
      }
      
      // 2. УСПЕШЕН ВХОД (ЗАПАЗВАМЕ ТОКЕНА ЗА SAFARI)
      if (res.data.token) {
        localStorage.setItem('auth_token', res.data.token)
      }

      location.href = '/profile' 
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.error || 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  async function submitReset(e) {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    setLoading(true)
    try {
      await api.post('/auth/reset-password-request', { email: form.email })
      setMsg({ type: 'success', text: 'Reset link sent to your email!' })
    } catch (err) {
      setMsg({ type: 'error', text: 'Error sending link.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h2 className="headline">{isForgotPass ? "Reset Password" : t('login')}</h2>

      <div className="form-container">
        {!isForgotPass ? (
            <form onSubmit={submitLogin} className="form">
              <label className="form-row">
                <span className="label">{t('email')}</span>
                <input className="input xl" type="email" name="email" value={form.email} onChange={update} placeholder="example@mail.com" required />
              </label>
              <label className="form-row">
                <span className="label">{t('password')}</span>
                <input className="input xl" type="password" name="password" value={form.password} onChange={update} placeholder={t('password')} required />
              </label>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-5px', marginBottom: '15px'}}>
                  <Link to="/register" style={{fontSize: '0.9rem', color: '#e63946', textDecoration: 'none', fontWeight: '500'}}>
                    No account?
                  </Link>
                  <button type="button" onClick={() => { setIsForgotPass(true); setMsg({type:'', text:''}) }} style={{background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:'0.9rem', textDecoration:'underline'}}>
                    Forgot Password?
                  </button>
              </div>

              <div className="form-footer">
                <button className="btn primary" type="submit" disabled={loading}>{loading ? "Loading..." : t('login')}</button>
              </div>
            </form>
        ) : (
            <form onSubmit={submitReset} className="form">
              <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '15px'}}>Enter your email address to receive a password reset link.</p>
              <label className="form-row">
                <span className="label">{t('email')}</span>
                <input className="input xl" type="email" name="email" value={form.email} onChange={update} placeholder="example@mail.com" required />
              </label>
              <div className="form-footer" style={{flexDirection: 'column', gap: '10px'}}>
                <button className="btn primary" type="submit" disabled={loading} style={{width: '100%'}}>{loading ? "Sending..." : "Send Reset Link"}</button>
                <button type="button" className="btn ghost" onClick={() => { setIsForgotPass(false); setMsg({type:'', text:''}) }} style={{width: '100%'}}>Back to Login</button>
              </div>
            </form>
        )}

        {msg.text && (
            <p className="msg" style={{color: msg.type === 'error' ? 'red' : 'green', marginTop: '15px', textAlign: 'center'}}>{msg.text}</p>
        )}
      </div>
    </div>
  )
}