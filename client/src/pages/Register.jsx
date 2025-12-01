// src/pages/Register.jsx
import { useState, useRef } from 'react'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [msg, setMsg] = useState('')
  const [errors, setErrors] = useState({ email: '', displayName: '' })
  const msgRef = useRef(null)

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors(prev => ({ ...prev, [e.target.name]: '' }))
  }

  async function checkAvailability(field) {
    const value = form[field]
    if (!value) return
    try {
      const q = field === 'email' ? `?email=${encodeURIComponent(value)}` : `?displayName=${encodeURIComponent(value)}`
      const res = await api.get(`/auth/check${q}`)
      if (res.data && res.data.taken) {
        setErrors(prev => ({ ...prev, [field]: field === 'email' ? 'Имейлът вече е регистриран' : 'Потребителското име е заето' }))
        setTimeout(() => {
          const el = document.querySelector('.input.is-error') || msgRef.current
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 50)
      }
    } catch {}
  }

  async function submit(e) {
    e.preventDefault()
    setMsg('')
    setErrors({ email: '', displayName: '' })
    if (!form.email || !form.password || !form.displayName) {
      setMsg('Попълни всички полета')
      if (msgRef.current) msgRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    try {
      const res = await api.post('/auth/register', form)
      setMsg(res.data?.message || 'Регистрацията е успешна. Провери имейла за потвърждение.')
      if (msgRef.current) msgRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch (err) {
      const status = err?.response?.status
      const error = err?.response?.data?.error || 'Грешка при регистрация'
      if (status === 409) {
        if (error.toLowerCase().includes('email')) setErrors(prev => ({ ...prev, email: 'Имейлът вече е регистриран' }))
        else if (error.toLowerCase().includes('display')) setErrors(prev => ({ ...prev, displayName: 'Потребителското име е заето' }))
        setTimeout(() => {
          const el = document.querySelector('.input.is-error') || msgRef.current
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 50)
      } else {
        setMsg(error)
        if (msgRef.current) msgRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  return (
    <div className="page">
      <h2 className="headline">{t('register')}</h2>

      <div className="form-container">
        <form onSubmit={submit} className="form" noValidate>
          <label className="form-row">
            <span className="label">{t('email')}</span>
            <input
              className={`input xl ${errors.email ? 'is-error' : ''}`}
              type="email"
              name="email"
              value={form.email}
              onChange={update}
              onBlur={() => checkAvailability('email')}
              placeholder="example@mail.com"
              required
            />
            {errors.email && <div className="msg" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', marginTop: 8 }}>{errors.email}</div>}
          </label>

          <label className="form-row">
            <span className="label">{t('password')}</span>
            <input className="input xl" type="password" name="password" value={form.password} onChange={update} placeholder={t('password')} required />
          </label>

          <label className="form-row">
            <span className="label">{t('displayName')}</span>
            <input
              className={`input xl ${errors.displayName ? 'is-error' : ''}`}
              type="text"
              name="displayName"
              value={form.displayName}
              onChange={update}
              onBlur={() => checkAvailability('displayName')}
              placeholder={t('displayName')}
              required
            />
            {errors.displayName && <div className="msg" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', marginTop: 8 }}>{errors.displayName}</div>}
          </label>

          <div className="form-footer">
            <button className="btn primary" type="submit">{t('create_account')}</button>
          </div>
        </form>

        <div ref={msgRef} style={{ marginTop: 12 }}>
          {msg && <p className="msg">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
