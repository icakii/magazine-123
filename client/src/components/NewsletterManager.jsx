"use client"
import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { getLang, t } from "../lib/i18n"

export default function NewsletterManager({ user, type = "static" }) {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // ✅ force rerender on language change (иначе ще виждаш newsletter_title ключове)
  const [lang, setLangState] = useState(getLang())
  useEffect(() => {
    const onLangChange = (e) => setLangState(e.detail.lang)
    window.addEventListener("lang:change", onLangChange)
    return () => window.removeEventListener("lang:change", onLangChange)
  }, [])

  // popup logic
  useEffect(() => {
    if (type === "popup") {
      const timer = setTimeout(() => {
        const alreadyClosed = localStorage.getItem("newsletter_closed")
        if (!alreadyClosed) setIsOpen(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [type])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email) return
    try {
      await api.post("/newsletter/subscribe", { email })
      setSubscribed(true)
      localStorage.setItem("newsletter_closed", "true")
      if (type === "popup") setTimeout(() => setIsOpen(false), 2000)
    } catch (err) {
      console.error("Error subscribing", err)
      // fallback demo
      const existing = JSON.parse(localStorage.getItem("newsletter_emails") || "[]")
      if (!existing.includes(email)) {
        localStorage.setItem("newsletter_emails", JSON.stringify([...existing, email]))
      }
      setSubscribed(true)
      localStorage.setItem("newsletter_closed", "true")
      if (type === "popup") setTimeout(() => setIsOpen(false), 2000)
    }
  }

  // Static (Home)
  if (type === "static") {
    return (
      <section className="newsletter">
        <div className="newsletter-inner">
          <h3 className="newsletter-title">{t("newsletter_title")}</h3>
          <p className="newsletter-text">{t("newsletter_text")}</p>

          {subscribed ? (
            <p className="newsletter-success">{t("newsletter_success")}</p>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                className="newsletter-input"
                placeholder={t("newsletter_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="btn primary newsletter-btn" type="submit">
                {t("newsletter_btn")}
              </button>
            </form>
          )}
        </div>
      </section>
    )
  }

  // Popup
  if (type === "popup" && isOpen) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content" style={{ textAlign: "center", maxWidth: 450 }}>
          <button
            className="modal-close"
            onClick={() => {
              setIsOpen(false)
              localStorage.setItem("newsletter_closed", "true")
            }}
          >
            ×
          </button>

          <h2 className="headline" style={{ marginBottom: 10 }}>
            {t("newsletter_title")}
          </h2>
          <p className="subhead" style={{ marginBottom: 18 }}>
            {t("newsletter_text")}
          </p>

          {subscribed ? (
            <p className="newsletter-success">{t("newsletter_success")}</p>
          ) : (
            <form onSubmit={handleSubscribe}>
              <input
                type="email"
                className="input"
                placeholder={t("newsletter_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ marginBottom: 12 }}
              />
              <button className="btn primary" style={{ width: "100%" }} type="submit">
                {t("newsletter_btn")}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return null
}
