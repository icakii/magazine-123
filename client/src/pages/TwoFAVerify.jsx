// src/pages/TwoFAVerify.jsx
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

export default function TwoFAVerify() {
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [timer, setTimer] = useState(0)
  const email = typeof window !== 'undefined' ? sessionStorage.getItem('twofa_email') : null

  useEffect(() => {
    let interval = null
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => {
        if (t <= 1) { clearInterval(interval); return 0 }
        return t - 1
      }), 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  async function sendEmail() {
    if (!email) { setMsg('Липсва имейл. Върни се и опитай пак.'); return }
    try {
      await api.post('/auth/send-2fa', { email })
      setMsg('Кодът е изпратен на имейла.')
      setTimer(60)
    } catch (err) {
      setMsg('Грешка при изпращане')
    }
  }

  async function verify() {
    if (!email) { setMsg('Липсва имейл.'); return }
    try {
      await api.post('/auth/verify-2fa', { email, code })
      location.href = '/profile'
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Невалиден код')
    }
  }

  return (
    <div className="page">
      <h2 className="headline">{t('confirm_email_title') || '2FA Verify'}</h2>
      <p className="subhead">Код ще бъде изпратен на: <strong>{email || '—'}</strong></p>

      <div className="form-container">
        <div className="stack mt-3">
          <button className="btn primary" onClick={sendEmail} disabled={timer > 0}>
            {timer > 0 ? `Resend (${timer})` : 'Send Email'}
          </button>

          <input className="input xl mt-2" value={code} onChange={e => setCode(e.target.value)} placeholder="Въведи код" />

          <div className="form-footer">
            <button className="btn secondary" onClick={verify}>Потвърди</button>
          </div>

          {msg && <p className="msg">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
