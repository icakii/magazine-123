// client/src/pages/TwoFASetup.jsx

import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import { useAuth } from '../hooks/useAuth' // <-- 1. ИМПОРТВАМЕ useAuth

export default function TwoFASetup() {
  const { user, loading } = useAuth() // <-- 2. ИЗВИКВАМЕ HOOK-A
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [timer, setTimer] = useState(0)
  
  // const email = 'test@example.com' // <-- 3. ИЗТРИВАМЕ ТОВА
  
  // 4. ВЗИМАМЕ ИМЕЙЛА ДИНАМИЧНО ОТ ЛОГНАТИЯ ПОТРЕБИТЕЛ
  const email = user?.email 

  useEffect(() => {
    let interval = null
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  async function sendEmail() {
    // Добавяме проверка дали имаме имейл
    if (!email) {
        setMsg('Error: User email not found.');
        return;
    }
    try {
      await api.post('/auth/send-2fa', { email }) // <-- Вече използва правилния email
      setMsg('Code sent.')
      setTimer(60)
    } catch {
      setMsg('Error sending')
    }
  }

  async function verify() {
    // Добавяме проверка дали имаме имейл
    if (!email) {
        setMsg('Error: User email not found.');
        return;
    }
    try {
      await api.post('/auth/verify-2fa', { email, code }) // <-- Вече използва правилния email
      setMsg('2FA activated.')
      setTimeout(() => location.href = '/profile', 600)
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Invalid code')
    }
  }

  // 5. ДОБАВЯМЕ СЪСТОЯНИЯ ЗА ЗАРЕЖДАНЕ (както в Profile.jsx)
  if (loading) return <div className="page"><p className="text-muted">{t('loading')}</p></div>
  if (!user) return <div className="page"><p>{t('not_logged_in')} <a href="/login" className="btn outline">{t('go_login')}</a></p></div>

  // 6. Всичко надолу си остава същото, но вече ще показва реалния имейл
  return (
    <div className="page">
      <h2 className="headline">2FA Setup</h2>
      <p className="subhead">We will send a code to: <strong>{email}</strong></p>
      <div className="stack mt-3">
        <button className="btn primary" onClick={sendEmail} disabled={timer > 0}>
          {timer > 0 ? `Resend (${timer})` : 'Send Email'}
        </button>
        <input className="input mt-2" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code" />
        <div className="form-footer">
          <button className="btn secondary" onClick={verify}>Verify</button>
        </div>
        {msg && <p className="msg">{msg}</p>}
      </div>
    </div>
  )
}