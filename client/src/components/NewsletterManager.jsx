"use client"
import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function NewsletterManager({ title, text, type = "static" }) {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState("")

  // Popup show after 3 sec (once)
  useEffect(() => {
    if (type !== "popup") return
    const timer = setTimeout(() => {
      const closed = localStorage.getItem("newsletter_closed")
      if (!closed) setIsOpen(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [type])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email) return

    setError("")
    try {
      await api.post("/newsletter/subscribe", { email })
      setSubscribed(true)
      localStorage.setItem("newsletter_closed", "true")
      if (type === "popup") setTimeout(() => setIsOpen(false), 1400)
    } catch (err) {
      // fallback local storage
      try {
        const existing = JSON.parse(localStorage.getItem("newsletter_emails") || "[]")
        if (!existing.includes(email)) {
          localStorage.setItem("newsletter_emails", JSON.stringify([...existing, email]))
        }
        setSubscribed(true)
        localStorage.setItem("newsletter_closed", "true")
        if (type === "popup") setTimeout(() => setIsOpen(false), 1400)
      } catch {
        setError(t("newsletter_error"))
      }
    }
  }

  // STATIC версии (Home)
  if (type === "static") {
    return (
      <section className="newsletter">
        <div className="newsletter-inner">
          <div className="newsletter-copy">
            <h3 className="headline newsletter-title">{title}</h3>
            <p className="newsletter-text">{text}</p>
          </div>

          {subscribed ? (
            <p className="msg success">{t("newsletter_success")}</p>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                className="input"
                placeholder={t("newsletter_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="btn primary" type="submit">
                {t("newsletter_button")}
              </button>
            </form>
          )}

          {error ? <p className="msg danger">{error}</p> : null}
        </div>
      </section>
    )
  }

  // POPUP версия
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
            {title}
          </h2>

          <p className="newsletter-text" style={{ marginBottom: 16 }}>
            {text}
          </p>

          {subscribed ? (
            <p className="msg success">{t("newsletter_success")}</p>
          ) : (
            <form onSubmit={handleSubscribe} className="newsletter-form" style={{ flexDirection: "column" }}>
              <input
                type="email"
                className="input"
                placeholder={t("newsletter_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="btn primary" type="submit">
                {t("newsletter_button")}
              </button>
            </form>
          )}

          {error ? <p className="msg danger">{error}</p> : null}
        </div>
      </div>
    )
  }

  return null
}
