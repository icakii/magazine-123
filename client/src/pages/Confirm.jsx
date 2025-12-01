// src/pages/Confirm.jsx
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function Confirm() {
  const query = useQuery()
  const token = query.get('token')
  const [msg, setMsg] = useState(t('confirm_email_progress'))

  useEffect(() => {
    if (!token) {
      setMsg('Липсва токен.')
      return
    }
    api.post('/auth/confirm', { token })
      .then(() => {
        setMsg('Имейлът е потвърден. Пренасочваме...')
        setTimeout(() => { location.href = '/' }, 900)
      })
      .catch(err => {
        setMsg(err?.response?.data?.error || 'Грешка при потвърждение')
      })
  }, [token])

  return (
    <div className="page">
      <h2 className="headline">{t('confirm_email_title')}</h2>
      <p className="subhead">{msg}</p>
    </div>
  )
}
