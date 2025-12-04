// client/src/pages/Profile.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

export default function Profile() {
  const { user, loading } = useAuth()
  const [subs, setSubs] = useState([])
  const [newName, setNewName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  // Local state za 2FA status
  const [is2FA, setIs2FA] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      api.get('/subscriptions').then(res => setSubs(res.data || [])).catch(() => setSubs([]))
      setNewName(user.displayName || '')
      setIs2FA(user.twoFaEnabled)
    }
  }, [loading, user])

  const currentPlan = subs[0]?.plan || 'Free'
  const isPremium = ['Monthly', 'Yearly', 'monthly', 'yearly'].includes(currentPlan)

  const canChangeNameVisual = () => {
      if (!isPremium) return false
      if (!user.lastUsernameChange) return true 
      const diffDays = Math.ceil(Math.abs(new Date() - new Date(user.lastUsernameChange)) / (1000 * 60 * 60 * 24)) 
      return diffDays >= 14
  }

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    
    // ВАЖНО: ИЗТРИВАМЕ ТОКЕНА
    localStorage.removeItem('auth_token')
    
    location.href = '/'
  }

  async function handleUpdateUsername() {
      if (newName.length < 3) { setMsg({ type: 'error', text: 'Name too short' }); return }
      try {
          await api.post('/user/update-username', { newUsername: newName })
          setMsg({ type: 'success', text: 'Username updated!' })
          setIsEditingName(false)
          setTimeout(() => location.reload(), 1000) 
      } catch (err) {
          setMsg({ type: 'error', text: err?.response?.data?.error || 'Error updating' })
      }
  }

  async function handlePasswordReset() {
      try {
          await api.post('/auth/reset-password-request', { email: user.email })
          setMsg({ type: 'success', text: 'Reset link sent to your email!' })
      } catch (err) { setMsg({ type: 'error', text: 'Error sending link.' }) }
  }

  if (loading) return <div className="page"><p className="text-muted">{t('loading')}</p></div>
  if (!user) return <div className="page"><p>{t('not_logged_in')}</p></div>

  return (
    <div className="page">
      <h2 className="headline">{t('profile')}</h2>
      
      <div className="card stack">
        <div className="inline"><strong>{t('email')}:</strong> <span>{user.email}</span></div>
        
        <div className="inline">
            <strong>Subscription:</strong> 
            <span style={{color: isPremium ? '#e63946' : 'inherit', fontWeight: isPremium ? 'bold' : 'normal', textTransform: 'capitalize'}}>
                {currentPlan} {isPremium && '⭐'}
            </span>
        </div>

        <hr style={{margin: '15px 0', border: '0', borderTop: '1px solid #eee'}} />

        <div style={{marginBottom: '10px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px'}}>
                <strong>{t('displayName')}:</strong>
                {!isEditingName && (
                    <button 
                        onClick={() => setIsEditingName(true)} 
                        disabled={!canChangeNameVisual()}
                        className="btn ghost" 
                        style={{padding: '5px 10px', fontSize: '0.8rem', opacity: canChangeNameVisual() ? 1 : 0.5}}
                    >
                        {canChangeNameVisual() ? 'Edit' : (isPremium ? 'Premium Only 🔒' : 'Wait')}
                    </button>
                )}
            </div>
            {!isEditingName ? (
                <span>{user.displayName}</span>
            ) : (
                <div style={{display:'flex', gap:'10px'}}>
                    <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} style={{flex:1}} />
                    <button onClick={handleUpdateUsername} className="btn primary">Save</button>
                </div>
            )}
        </div>

        <hr style={{margin: '15px 0', border: '0', borderTop: '1px solid #eee'}} />

        <div>
            <strong>Security</strong>
            <div style={{marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <button onClick={handlePasswordReset} className="btn outline" style={{fontSize: '0.9rem', width:'100%'}}>
                    Send Email to Reset Password
                </button>

                {!is2FA ? (
                    <Link 
                        to="/2fa/setup" 
                        className="btn outline" 
                        style={{
                            fontSize: '0.9rem', width:'100%', textDecoration: 'none', textAlign: 'center', 
                            border: '2px solid #e63946', color: '#e63946', fontWeight: 'bold', display: 'block'
                        }}
                    >
                        🛡️ Configure Two-Factor Auth (2FA)
                    </Link>
                ) : (
                    <div style={{padding: '10px', textAlign: 'center', backgroundColor: '#e6ffe6', color: '#006400', border: '1px solid #b3ffb3', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        ✅ Two-Factor Authentication is Active
                    </div>
                )}
            </div>
        </div>

        {msg.text && <p className={`msg ${msg.type === 'error' ? 'danger' : 'success'}`}>{msg.text}</p>}
      </div>

      <div className="mt-3">
        <button className="btn secondary" onClick={handleLogout}>{t('logout')}</button>
      </div>
    </div>
  )
}