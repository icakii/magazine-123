"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"

const STORAGE_KEY = "miren_cookie_consent"

function CookiePolicyModal({ onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <button className="modal-close" onClick={onClose} type="button">×</button>
        <h2 style={{ marginBottom: 16 }}>Cookie Policy</h2>
        <div className="modal-text" style={{ fontSize: "0.92rem", lineHeight: 1.7 }}>
          <p><strong>Last updated: April 2026</strong></p>

          <p>MIREN Magazine ("we", "us", "our") uses cookies and similar technologies on our website to improve your experience, analyze usage, and provide personalized content.</p>

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>What are cookies?</h3>
          <p>Cookies are small text files stored on your device when you visit our website. They help us remember your preferences and understand how you use our site.</p>

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>Types of cookies we use</h3>
          <ul style={{ paddingLeft: 20 }}>
            <li><strong>Essential cookies</strong> — required for the website to function (authentication, session management).</li>
            <li><strong>Preference cookies</strong> — remember your settings such as theme (light/dark) and language.</li>
            <li><strong>Analytics cookies</strong> — help us understand how visitors interact with the site.</li>
          </ul>

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>Third-party services</h3>
          <p>We use Google OAuth for authentication. Google may set its own cookies when you use Sign in with Google. Please refer to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--oxide-red)" }}>Google's Privacy Policy</a> for details.</p>

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>Your choices</h3>
          <p>You can control cookies through your browser settings. Disabling essential cookies may affect site functionality.</p>

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>Contact</h3>
          <p>For any questions about our cookie use, contact us at <a href="mailto:info@mirenmagazine.com" style={{ color: "var(--oxide-red)" }}>info@mirenmagazine.com</a>.</p>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY)
      if (!consent) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted")
    } catch {}
    setVisible(false)
  }

  if (!visible) return policyOpen ? <CookiePolicyModal onClose={() => setPolicyOpen(false)} /> : null

  return (
    <>
      <div className="cookie-banner">
        <div className="cookie-banner-inner">
          <p className="cookie-banner-text">
            We use cookies to improve your experience on MIREN.{" "}
            <button
              type="button"
              className="cookie-policy-link"
              onClick={() => setPolicyOpen(true)}
            >
              Cookie Policy
            </button>
          </p>
          <button type="button" className="cookie-accept-btn" onClick={accept}>
            Accept
          </button>
        </div>
      </div>

      {policyOpen && <CookiePolicyModal onClose={() => setPolicyOpen(false)} />}
    </>
  )
}
