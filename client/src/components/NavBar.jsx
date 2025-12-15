// client/src/components/NavBar.jsx
"use client"

import { Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"
import { t, getLang, setLang } from "../lib/i18n"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]

function applyTheme(theme) {
  const html = document.documentElement
  const next = theme === "dark" ? "dark" : "light"
  html.setAttribute("data-theme", next)
  try {
    localStorage.setItem("theme", next)
  } catch {}
}

function toggleTheme() {
  const html = document.documentElement
  const current = html.getAttribute("data-theme") || "light"
  const next = current === "dark" ? "light" : "dark"
  html.setAttribute("data-theme", next)
  localStorage.setItem("miren_theme", next)
}

export default function NavBar() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [lang, setLangState] = useState(getLang())
  const [showLoginModal, setShowLoginModal] = useState(false)

  const navRef = useRef(null)
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  // ✅ Theme persist (works when NavBar exists)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme")
      if (stored === "dark" || stored === "light") {
        applyTheme(stored)
      }
    } catch {}
  }, [])

  useEffect(() => {
    function onLangChange(e) {
      setLangState(e.detail.lang)
    }
    window.addEventListener("lang:change", onLangChange)
    return () => window.removeEventListener("lang:change", onLangChange)
  }, [])

  // ✅ measure navbar height -> --nav-offset
  useLayoutEffect(() => {
    const el = navRef.current
    if (!el) return

    const apply = () => {
      const h = el.offsetHeight || 72
      document.documentElement.style.setProperty("--nav-offset", `${h}px`)
    }

    apply()

    const ro = new ResizeObserver(() => apply())
    ro.observe(el)
    window.addEventListener("resize", apply)

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", apply)
    }
  }, [])

  async function handleLogout(e) {
    if (e) e.preventDefault()
    try { await api.post("/auth/logout") } catch {}
    localStorage.removeItem("auth_token")
    location.href = "/"
  }

  function changeLang() {
    const next = lang === "bg" ? "en" : "bg"
    setLang(next)
  }

  function toggleDrawer() { setOpen((o) => !o) }
  function closeDrawer() { setOpen(false) }

  const handleProtectedClick = (e) => {
    if (!user) {
      e.preventDefault()
      setShowLoginModal(true)
      closeDrawer()
    } else {
      closeDrawer()
    }
  }

  return (
    <>
      <nav className="nav" ref={navRef}>
        <div className="nav-inner">
          <div className="nav-top">
            <div className="nav-left">
              <button
                className="hamburger"
                aria-label="Open menu"
                onClick={toggleDrawer}
                type="button"
              >
                <span className="lines">
                  <span className="line"></span>
                  <span className="line"></span>
                  <span className="line"></span>
                </span>
              </button>
            </div>

            <div className="nav-center">
              <Link className="brand" to="/home">
                {t("brand")}
              </Link>
            </div>
          </div>

          {/* ✅ right side: wrap-able rows on mobile */}
          <div className="nav-right nav-right-wrap">
            <div className="nav-actions">
              {!loading && !user && (
                <>
                  <Link to="/register" className="btn ghost nav-btn" style={{ border: "none" }}>
                    {t("register")}
                  </Link>
                  <Link to="/login" className="btn primary nav-btn">
                    {t("login")}
                  </Link>
                </>
              )}

              {user && (
                <form onSubmit={handleLogout} style={{ display: "inline" }}>
                  <button className="btn secondary nav-btn logout-btn" type="submit">
                    {t("logout")}
                  </button>
                </form>
              )}
            </div>

            <div className="nav-toggles">
              <button className="theme-toggle" onClick={toggleTheme} type="button">
                {t("theme")}
              </button>

              <button className="lang-toggle" onClick={changeLang} type="button">
                {lang.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className={`drawer-backdrop ${open ? "open" : ""}`} onClick={closeDrawer} />

      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <nav className="drawer-list">
          <Link className="drawer-item" to="/home" onClick={closeDrawer}>{t("home")}</Link>
          <Link className="drawer-item" to="/news" onClick={handleProtectedClick}>{t("news")}</Link>
          <Link className="drawer-item" to="/events" onClick={handleProtectedClick}>{t("events")}</Link>
          <Link className="drawer-item" to="/gallery" onClick={handleProtectedClick}>{t("gallery")}</Link>
          <Link className="drawer-item" to="/games" onClick={handleProtectedClick}>{t("games")}</Link>
          <Link className="drawer-item" to="/e-magazine" onClick={handleProtectedClick}>{t("emag")}</Link>

          <Link className="drawer-item" to="/about" onClick={closeDrawer}>{t("about")}</Link>
          <Link className="drawer-item" to="/contact" onClick={closeDrawer}>{t("contact")}</Link>
          <Link className="drawer-item" to="/subscriptions" onClick={closeDrawer}>{t("subscriptions")}</Link>
          <Link className="drawer-item" to="/help" onClick={closeDrawer}>{t("help")}</Link>

          <div className="drawer-sep" />

          <Link className="drawer-item" to="/profile" onClick={closeDrawer}>
            {t("profile")}
          </Link>

          {isAdmin && (
            <Link
              className="drawer-item"
              to="/admin"
              onClick={closeDrawer}
              style={{ color: "var(--oxide-red)", fontWeight: "bold" }}
            >
              ⚙️ Admin Panel
            </Link>
          )}
        </nav>
      </aside>

      {showLoginModal && (
        <div className="modal-backdrop" onClick={() => setShowLoginModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: "center", maxWidth: "400px" }}
          >
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🔒</div>
            <h2 className="headline" style={{ fontSize: "1.8rem" }}>Access Restricted</h2>
            <p style={{ marginBottom: "20px", color: "gray" }}>
              You must be a registered member to access this content. <br />
              Join MIREN today!
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                to="/register"
                className="btn primary"
                onClick={() => setShowLoginModal(false)}
                style={{ textDecoration: "none" }}
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="btn ghost"
                onClick={() => setShowLoginModal(false)}
                style={{ textDecoration: "none" }}
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
