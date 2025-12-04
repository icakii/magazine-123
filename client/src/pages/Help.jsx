import { t } from '../lib/i18n'

export default function Help() {
  return (
    <div className="page">
      <h2 className="headline">{t('help')}</h2>
      <div className="stack">
        
        <div className="card">
          <div className="card-header">How to register?</div>
          <p className="card-muted">Go to the Register page, enter your email, password, and display name. You will receive a confirmation email.</p>
        </div>

        <div className="card">
          <div className="card-header">Why do I see "Access Restricted"?</div>
          <p className="card-muted">Some pages like Games, News, and E-Magazine are reserved for registered members. Please login or create an account.</p>
        </div>

        <div className="card">
          <div className="card-header">How to enable 2FA?</div>
          <p className="card-muted">Go to your Profile, then Security section and click "Configure Two-Factor Auth".</p>
        </div>

        <div className="card">
          <div className="card-header">What are subscriptions?</div>
          <p className="card-muted">Subscriptions give you access to premium content in the E-Magazine and remove limits on certain features.</p>
        </div>

        <div className="card">
          <div className="card-header">I forgot my password</div>
          <p className="card-muted">On the Login page, click "Forgot Password?" to receive a reset link via email.</p>
        </div>

      </div>
    </div>
  )
}