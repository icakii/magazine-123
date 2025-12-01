import { t } from '../lib/i18n'

export default function Footer() {
  return (
    <footer className="footer">
      <div>{t('footer_copy')}</div>
      <div style={{ fontWeight: 700 }}>{t('brand')}</div>
    </footer>
  )
}
