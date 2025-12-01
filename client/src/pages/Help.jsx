import { t } from '../lib/i18n'

export default function Help() {
  return (
    <div className="page">
      <h2 className="headline">{t('help')}</h2>
      <div className="stack">
        <div className="card">
          <div className="card-header">How to register?</div>
          <p className="card-muted">Go to the Register page and fill the form.</p>
        </div>
        <div className="card">
          <div className="card-header">Why do I see 401?</div>
          <p className="card-muted">You need to login to access protected resources.</p>
        </div>
      </div>
    </div>
  )
}
