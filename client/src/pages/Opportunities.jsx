import { useEffect, useState } from "react"
import { t } from "../lib/i18n"

function mailto(subject) {
  const to = "mirenmagazine@gmail.com"
  const s = encodeURIComponent(subject)
  const body = encodeURIComponent(
    `Hello MIREN,\n\nI’m interested in: ${subject}\n\nName:\nCompany/Brand (optional):\nWebsite/Social (optional):\nBudget (optional):\nTimeline:\nDetails:\n\nThanks,`
  )
  return `mailto:${to}?subject=${s}&body=${body}`
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
      bulletsKey: "opp_card1_bullets", // -> array
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
                <a className="btn primary opp-btn" href={mailto(subject)}>
                  {t("opp_contact_btn")}
                </a>
              </div>
            </div>
          )
        })}
      </div>

      <div className="opp-foot">
        <div className="text-muted">{t("opp_footer_note")}</div>
      </div>
    </div>
  )
}
