import { useEffect, useState } from "react"
import { t } from "../lib/i18n"

const TO_EMAIL = "mirenmagazine@gmail.com"

// Gmail compose (primary)
function buildGmailLink(subject, body) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: TO_EMAIL,
    su: subject,
  })

  if (body) params.set("body", body)

  return `https://mail.google.com/mail/?${params.toString()}`
}

// Mail app fallback (mailto)
function buildMailto(subject, body) {
  const s = encodeURIComponent(subject)
  const b = encodeURIComponent(body || "")
  return `mailto:${TO_EMAIL}?subject=${s}&body=${b}`
}

export default function Opportunities() {
  const [, rerender] = useState(0)

  useEffect(() => {
    const onLang = () => rerender((x) => x + 1)
    window.addEventListener("lang:change", onLang)
    return () => window.removeEventListener("lang:change", onLang)
  }, [])

  const cards = [
    {
      titleKey: "opp_card1_title",
      textKey: "opp_card1_text",
      bulletsKey: "opp_card1_bullets",
      subjectKey: "opp_card1_subject",
    },
    {
      titleKey: "opp_card2_title",
      textKey: "opp_card2_text",
      bulletsKey: "opp_card2_bullets",
      subjectKey: "opp_card2_subject",
    },
    {
      titleKey: "opp_card3_title",
      textKey: "opp_card3_text",
      bulletsKey: "opp_card3_bullets",
      subjectKey: "opp_card3_subject",
    },
  ]

  return (
    <div className="page">
      <div className="opp-head">
        <h2 className="headline">{t("opp_title")}</h2>

        <div className="opp-banner">
          <div className="opp-banner-kicker">{t("opp_banner_kicker")}</div>
          <div className="opp-banner-text">{t("opp_banner_text")}</div>
        </div>
      </div>

      <div className="opp-grid">
        {cards.map((c) => {
          const title = t(c.titleKey)
          const subject = t(c.subjectKey)

          const body = `Hello MIREN,

I’m interested in: ${subject}

Name:
Company / Brand (optional):
Website / Social (optional):
Budget (optional):
Timeline:
Details:

Thanks,`

          const gmailHref = buildGmailLink(subject, body)
          const mailtoHref = buildMailto(subject, body)
          const bullets = t(c.bulletsKey)

          return (
            <div key={c.titleKey} className="opp-card">
              <div className="opp-card-top">
                <div className="opp-card-title">{title}</div>
                <div className="opp-chip">{t("opp_chip")}</div>
              </div>

              <div className="opp-card-text">{t(c.textKey)}</div>

              {Array.isArray(bullets) && bullets.length > 0 && (
                <ul className="opp-list">
                  {bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}

              <div className="opp-card-actions">
                {/* PRIMARY: Gmail */}
                <a
                  className="btn primary opp-btn"
                  href={gmailHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("opp_contact_btn")}
                </a>

                {/* FALLBACK: Mail app */}
                <a
                  className="opp-mail-fallback"
                  href={mailtoHref}
                >
                  {t("opp_email_help_alt")}
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* INFO BLOCK */}
      <div className="opp-foot">
        <div className="opp-help">
          <strong>{t("opp_email_help_title")}</strong>
          <p className="text-muted">{t("opp_email_help_text")}</p>
        </div>

        <div className="text-muted">{t("opp_footer_note")}</div>
      </div>
    </div>
  )
}
