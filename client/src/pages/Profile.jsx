import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom' // <-- ВАЖНО: Импортваме Link
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

export default function Profile() {
  const { user, loading } = useAuth()
  const [subs, setSubs] = useState([])
  const [newName, setNewName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!loading && user) {
      api.get('/subscriptions').then(res => setSubs(res.data || [])).catch(() => setSubs([]))
      setNewName(user.displayName || '')
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

  const daysUntilChange = user?.lastUsernameChange 
      ? 14 - Math.ceil(Math.abs(new Date() - new Date(user.lastUsernameChange)) / (1000 * 60 * 60 * 24)) 
      : 0

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    location.href = '/'
  }

  async function handleUpdateUsername() {
      if (newName.length < 3) {
          setMsg({ type: 'error', text: 'Името е твърде кратко.' })
          return
      }
      try {
          await api.post('/user/update-username', { newUsername: newName })
          setMsg({ type: 'success', text: 'Успешно обновихте името си!' })
          setIsEditingName(false)
          setTimeout(() => location.reload(), 1000) 
      } catch (err) {
          setMsg({ type: 'error', text: err?.response?.data?.error || 'Грешка при обновяване.' })
      }
  }

  async function handlePasswordReset() {
      try {
          await api.post('/auth/reset-password-request', { email: user.email })
          setMsg({ type: 'success', text: 'Линк за ресет е изпратен!' })
      } catch (err) {
          setMsg({ type: 'error', text: 'Грешка при изпращане.' })
      }
  }

  if (loading) return <div className="page"><p className="text-muted">{t('loading')}</p></div>
  if (!user) return <div className="page"><p>{t('not_logged_in')} <a href="/login" className="btn outline">{t('go_login')}</a></p></div>

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
                        style={{padding: '5px 10px', fontSize: '0.8rem', opacity: canChangeNameVisual() ? 1 : 0.5, cursor: canChangeNameVisual() ? 'pointer' : 'not-allowed'}}
                    >
                        {canChangeNameVisual() ? 'Edit' : (isPremium ? `Wait ${daysUntilChange} days` : 'Premium Only 🔒')}
                    </button>
                )}
            </div>

            {!isEditingName ? (
                <span>{user.displayName}</span>
            ) : (
                <div style={{display:'flex', gap:'10px'}}>
                    <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} style={{flex:1}} />
                    <button onClick={handleUpdateUsername} className="btn primary" style={{padding:'5px 10px'}}>Save</button>
                    <button onClick={() => { setIsEditingName(false); setNewName(user.displayName); }} className="btn ghost" style={{padding:'5px 10px'}}>Cancel</button>
                </div>
            )}
            
            {!isPremium && <div style={{fontSize:'0.8rem', color:'#999', marginTop:'5px'}}>* Upgrade to Premium to change username every 14 days.</div>}
        </div>

        <hr style={{margin: '15px 0', border: '0', borderTop: '1px solid #eee'}} />

        <div>
            <strong>Security</strong>
            <div style={{marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                
                {/* БУТОН ЗА ПАРОЛА */}
                <button onClick={handlePasswordReset} className="btn outline" style={{fontSize: '0.9rem', width:'100%'}}>
                    Send Password Reset Email
                </button>

                {/* --- НОВИЯТ БУТОН ЗА 2FA --- */}
                <Link 
                    to="/2fa/setup" 
                    className="btn outline" 
                    style={{
                        fontSize: '0.9rem', 
                        width:'100%', 
                        textDecoration: 'none', 
                        textAlign: 'center', 
                        border: '2px solid #e63946', 
                        color: '#e63946', 
                        fontWeight: 'bold',
                        display: 'block' // Прави бутона да заема цялата ширина
                    }}
                >
                    🛡️ Configure Two-Factor Auth (2FA)
                </Link>

            </div>
        </div>

        {msg.text && (
            <p style={{
                color: msg.type === 'error' ? 'red' : 'green', 
                marginTop:'15px', textAlign:'center', fontWeight:'bold', padding: '10px',
                backgroundColor: msg.type === 'error' ? '#ffeeee' : '#eeffee', borderRadius: '4px'
            }}>
                {msg.text}
            </p>
        )}
      </div>

      <div className="mt-3">
        <button className="btn secondary" onClick={handleLogout}>{t('logout')}</button>
      </div>
    </div>
  )
}