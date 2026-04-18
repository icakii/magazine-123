// client/src/components/NavBar.jsx
"use client"

import { Link, useNavigate } from "react-router-dom"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { t, getLang, setLang } from "../lib/i18n"
import { useAuth } from "../context/AuthContext"

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com", "info@mirenmagazine.com", "info@mirenmagaizne.com"]
function toggleTheme() {
  const html = document.documentElement
  const current = html.getAttribute("data-theme") || "light"
  const next = current === "dark" ? "light" : "dark"
  html.setAttribute("data-theme", next)
  try {
    localStorage.setItem("miren_theme", next)
  } catch {}
}

export default function NavBar() {
  const navigate = useNavigate()
  const { user, loading, logout } = useAuth()

  const [open, setOpen] = useState(false)
  const [lang, setLangState] = useState(getLang())
  const [showLoginModal, setShowLoginModal] = useState(false)

  const navRef = useRef(null)

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email)

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

  // ✅ lock body scroll when drawer open
  useEffect(() => {
    document.body.classList.toggle("drawer-open", open)
    return () => document.body.classList.remove("drawer-open")
  }, [open])

  async function handleLogout(e) {
    if (e) e.preventDefault()
    await logout()
    setOpen(false)
    navigate("/", { replace: true })
  }

  function changeLang() {
    const next = lang === "bg" ? "en" : "bg"
    setLang(next)
  }

  function toggleDrawer() {
    setOpen((o) => !o)
  }
  function closeDrawer() {
    setOpen(false)
  }

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
              <button className={`hamburger${open ? " open" : ""}`} aria-label="Open menu" onClick={toggleDrawer} type="button">
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path className="nav-line nav-line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22" />
                  <path className="nav-line" d="M7 16 27 16" />
                </svg>
              </button>
            </div>

            <div className="nav-center">
              <Link className="brand" to="/" onClick={closeDrawer}>
                {t("brand")}
              </Link>
            </div>
          </div>

          <div className="nav-right nav-right-wrap">
            <div className="nav-actions">
              {!loading && !user && (
                <Link to="/profile" className="user-profile-btn" onClick={closeDrawer} aria-label="Log In">
                  <div className="user-profile-inner">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="m15.626 11.769a6 6 0 1 0 -7.252 0 9.008 9.008 0 0 0 -5.374 8.231 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 9.008 9.008 0 0 0 -5.374-8.231zm-7.626-4.769a4 4 0 1 1 4 4 4 4 0 0 1 -4-4zm10 14h-12a1 1 0 0 1 -1-1 7 7 0 0 1 14 0 1 1 0 0 1 -1 1z" />
                    </svg>
                    <p>Log In</p>
                  </div>
                </Link>
              )}

              {user && (
                <form onSubmit={handleLogout} style={{ display: "inline" }}>
                  <button className="btn outline nav-btn logout-btn" type="submit">                    {t("logout")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className={`drawer-backdrop ${open ? "open" : ""}`} onClick={closeDrawer} />

      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <nav className="drawer-list">
          <Link className="drawer-item" to="/" onClick={closeDrawer}>
            {t("home")}
          </Link>

          <Link className="drawer-item" to="/e-magazine" onClick={closeDrawer}>
            {t("emag")}
          </Link>
          <Link className="drawer-item" to="/news" onClick={closeDrawer}>
            {t("news")}
          </Link>
          <Link className="drawer-item" to="/events" onClick={closeDrawer}>
            {t("events")}
          </Link>

          <Link className="drawer-item" to="/gallery" onClick={closeDrawer}>
            {t("gallery")}
          </Link>

          <Link className="drawer-item" to="/store" onClick={closeDrawer}>
            {t("store")}
          </Link>

          <Link className="drawer-item" to="/subscriptions" onClick={closeDrawer}>
            {t("subscriptions")}
          </Link>

          <Link className="drawer-item" to="/opportunities" onClick={closeDrawer}>
            {t("opportunities")}
          </Link>

          <Link className="drawer-item" to="/games" onClick={handleProtectedClick}>
            {t("games")}
          </Link>

          <Link className="drawer-item" to="/about" onClick={closeDrawer}>
            {t("about")}
          </Link>
          <Link className="drawer-item" to="/contact" onClick={closeDrawer}>
            {t("contact")}
          </Link>
          <Link className="drawer-item" to="/help" onClick={closeDrawer}>
            {t("help")}
          </Link>

          <div className="drawer-sep" />

          <button className="drawer-item drawer-item-btn drawer-item-control" onClick={toggleTheme} type="button">
            {t("theme")}
          </button>

          <button className="drawer-item drawer-item-btn drawer-item-control" onClick={changeLang} type="button">
            {t("language")}: {lang.toUpperCase()}
          </button>

          <div className="drawer-sep" />

          {!user ? (
            <Link className="drawer-item" to="/profile" onClick={closeDrawer}>
              {t("profile")}
            </Link>
          ) : (
                        <Link className="drawer-item" to="/profile" onClick={closeDrawer}>
              {t("profile")}
            </Link>
          )}

          {isAdmin && (
            <Link className="drawer-item drawer-item--admin" to="/admin" onClick={closeDrawer}>
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
            <button className="modal-close" onClick={() => setShowLoginModal(false)} type="button">
              ×
            </button>
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🔒</div>
            <h2 className="headline" style={{ fontSize: "1.8rem" }}>
              Access Restricted
            </h2>
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
