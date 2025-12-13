"use client"
import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function NewsletterManager({ user, type = "static" }) {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Popup logic
  useEffect(() => {
    if (type !== "popup") return

    const timer = setTimeout(() => {
      const closed = localStorage.getItem("newsletter_closed")
      if (!closed) setIsOpen(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [type])

  async function handleSubscribe(e) {
    e.preventDefault()
    if (!email) return

    try {
      await api.post("/newsletter/subscribe", { email })
    } catch {
      // fallback (offline / error)
      const existing = JSON.parse(
        localStorage.getItem("newsletter_emails") || "[]"
      )
      if (!existing.includes(email)) {
        localStorage.setItem(
          "newsletter_emails",
          JSON.stringify([...existing, email])
        )
      }
    }

    setSubscribed(true)
    localStorage.setItem("newsletter_closed", "true")

    if (type === "popup") {
      setTimeout(() => setIsOpen(false), 2000)
    }
  }

  const content = (
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
          <button type="submit" className="btn primary newsletter-btn">
            {t("newsletter_btn")}
          </button>
        </form>
      )}
    </div>
  )

  // STATIC BLOCK
  if (type === "static") {
    return <div className="newsletter-card">{content}</div>
  }

  // POPUP
  if (type === "popup" && isOpen) {
    return (
      <div className="modal-backdrop">
        <div
          className="modal-content"
          style={{ textAlign: "center", maxWidth: 460 }}
        >
          <button
            className="modal-close"
            onClick={() => {
              setIsOpen(false)
              localStorage.setItem("newsletter_closed", "true")
            }}
            aria-label="Close"
          >
            ×
          </button>
          {content}
        </div>
      </div>
    )
  }

  return null
}
