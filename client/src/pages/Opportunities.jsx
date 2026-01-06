import { useEffect, useMemo, useState } from "react"
import { t } from "../lib/i18n"

function buildMailto(subject) {
  const to = "mirenmagazine@gmail.com"
  const s = encodeURIComponent(subject)
  const body = encodeURIComponent(
    `Hello MIREN,

I’m interested in: ${subject}

Name:
Company / Brand (optional):
Website / Social (optional):
Budget (optional):
Timeline:
Details:

Thanks,`
  )
  return { to, subject, bodyText: decodeURIComponent(body), href: `mailto:${to}?subject=${s}&body=${body}` }
}

export default function Opportunities() {
  const [, rerender] = useState(0)
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const [fallbackData, setFallbackData] = useState(null)

  useEffect(() => {
    const onLang = () => rerender((x) => x + 1)
    window.addEventListener("lang:change", onLang)
    return () => window.removeEventListener("lang:change", onLang)
  }, [])

  const cards = useMemo(
    () => [
      { titleKey: "opp_card1_title", textKey: "opp_card1_text", bulletsKey: "opp_card1_bullets", subjectKey: "opp_card1_subject" },
      { titleKey: "opp_card2_title", textKey: "opp_card2_text", bulletsKey: "opp_card2_bullets", subjectKey: "opp_card2_subject" },
      { titleKey: "opp_card3_title", textKey: "opp_card3_text", bulletsKey: "opp_card3_bullets", subjectKey: "opp_card3_subject" },
    ],
    []
  )

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      alert(t("opp_copied") || "Copied ✅")
    } catch {
      // fallback
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      alert(t("opp_copied") || "Copied ✅")
    }
  }

  function handleContact(subject) {
    const m = buildMailto(subject)

    // 1) try mailto
    window.location.href = m.href

    // 2) show fallback after a short delay (works even if Outlook opens)
    setTimeout(() => {
      setFallbackData(m)
      setFallbackOpen(true)
    }, 350)
  }

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
                <button className="btn primary opp-btn" type="button" onClick={() => handleContact(subject)}>
                  {t("opp_contact_btn")}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="opp-foot">
        <div className="text-muted">{t("opp_footer_note")}</div>
      </div>

      {fallbackOpen && fallbackData && (
        <div className="modal-backdrop" onClick={() => setFallbackOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setFallbackOpen(false)}>×</button>

            <h3 className="headline" style={{ fontSize: "1.6rem" }}>
              {t("opp_fallback_title") || "Contact us"}
            </h3>

            <p className="subhead">
              {t("opp_fallback_text") ||
                "If your browser opens Outlook or nothing happens, copy the email details below and send it manually."}
            </p>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-header">Email</div>
              <div style={{ fontWeight: 800 }}>{fallbackData.to}</div>
              <div className="btn-group" style={{ marginTop: 10 }}>
                <button className="btn outline" onClick={() => copy(fallbackData.to)}>
                  {t("opp_copy_email") || "Copy email"}
                </button>
              </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-header">Subject</div>
              <div style={{ fontWeight: 800 }}>{fallbackData.subject}</div>
              <div className="btn-group" style={{ marginTop: 10 }}>
                <button className="btn outline" onClick={() => copy(fallbackData.subject)}>
                  {t("opp_copy_subject") || "Copy subject"}
                </button>
              </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-header">Message</div>
              <pre className="modal-text" style={{ marginTop: 10 }}>{fallbackData.bodyText}</pre>
              <div className="btn-group" style={{ marginTop: 10 }}>
                <button className="btn outline" onClick={() => copy(fallbackData.bodyText)}>
                  {t("opp_copy_message") || "Copy message"}
                </button>
              </div>
            </div>

            <div className="btn-group" style={{ marginTop: 14, justifyContent: "center" }}>
              <button className="btn secondary" onClick={() => setFallbackOpen(false)}>
                {t("go_home") || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
