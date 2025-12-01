import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

export default function TwoFASetup() {
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [timer, setTimer] = useState(0)
  const email = 'test@example.com'

  useEffect(() => {
    let interval = null
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  async function sendEmail() {
    try {
      await api.post('/auth/send-2fa', { email })
      setMsg('Code sent.')
      setTimer(60)
    } catch {
      setMsg('Error sending')
    }
  }

  async function verify() {
    try {
      await api.post('/auth/verify-2fa', { email, code })
      setMsg('2FA activated.')
      setTimeout(() => location.href = '/profile', 600)
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Invalid code')
    }
  }

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
