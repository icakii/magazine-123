"use client"

import { Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"
import { t, getLang, setLang } from "../lib/i18n"
import { useEffect, useState } from "react"

function toggleTheme() {
  const html = document.documentElement
  const current = html.getAttribute("data-theme") || "light"
  html.setAttribute("data-theme", current === "dark" ? "light" : "dark")
}

export default function NavBar() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [lang, setLangState] = useState(getLang())

  useEffect(() => {
    function onLangChange(e) {
      setLangState(e.detail.lang)
    }
    window.addEventListener("lang:change", onLangChange)
    return () => window.removeEventListener("lang:change", onLangChange)
  }, [])

  async function handleLogout(e) {
    e.preventDefault()
    try {
      await api.post("/auth/logout")
    } catch {}
    location.href = "/"
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

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-left">
            {/* Хамбургер бутон за менюто */}
            <button className="hamburger" aria-label="Open menu" onClick={toggleDrawer}>
              <span className="lines">
                <span className="line"></span>
                <span className="line"></span>
                <span className="line"></span>
              </span>
            </button>
          </div>
          
          <div className="nav-center">
            <Link className="brand" to="/">
              {t("brand")}
            </Link>
          </div>

          <div className="nav-right">
            {/* ТУК ПРЕМАХНАХМЕ БУТОНИТЕ ЗА NEWS И EVENTS, СЕГА Е ЧИСТО */}

            {!loading && !user && (
              <>
                <Link to="/register" className="btn ghost" style={{border:'none', marginRight: 5}}>{t("register")}</Link>
                <Link to="/login" className="btn primary">{t("login")}</Link>
              </>
            )}
            
            {user && (
              <form onSubmit={handleLogout} style={{ display: "inline" }}>
                <button className="btn secondary" type="submit">
                  {t("logout")}
                </button>
              </form>
            )}
            
            <button className="theme-toggle" onClick={toggleTheme} style={{marginLeft: 8}}>
              {t("theme")}
            </button>
            <button className="lang-toggle" onClick={changeLang} style={{marginLeft: 8}}>
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </nav>

      {/* backdrop (фонът зад менюто) */}
      <div className={`drawer-backdrop ${open ? "open" : ""}`} onClick={closeDrawer} />

      {/* ПЛЪЗГАЩО СЕ МЕНЮ (DRAWER) */}
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-header">{t("brand")}</div>
        
        <nav className="drawer-list">
          {/* Основни страници */}
          <Link className="drawer-item" to="/" onClick={closeDrawer}>Home</Link>
          <Link className="drawer-item" to="/news" onClick={closeDrawer}>News</Link>
          <Link className="drawer-item" to="/events" onClick={closeDrawer}>Events</Link>
          <Link className="drawer-item" to="/gallery" onClick={closeDrawer}>Gallery</Link>
          <Link className="drawer-item" to="/games" onClick={closeDrawer}>Games</Link>
          <Link className="drawer-item" to="/e-magazine" onClick={closeDrawer}>E-Magazine</Link>
          
          {/* Информационни страници */}
          <Link className="drawer-item" to="/about" onClick={closeDrawer}>{t("about")}</Link>
          <Link className="drawer-item" to="/contact" onClick={closeDrawer}>{t("contact")}</Link>
          <Link className="drawer-item" to="/subscriptions" onClick={closeDrawer}>{t("subscriptions")}</Link>
          <Link className="drawer-item" to="/help" onClick={closeDrawer}>{t("help")}</Link>

          {/* Това избутва всичко надолу, ако менюто е дълго, или просто стои като разделител */}
          <div style={{ flex: 1 }} /> 

          {/* Разделителна черта */}
          <div className="drawer-sep" />

          {/* Потребителска зона най-долу */}
          <Link className="drawer-item" to="/profile" onClick={closeDrawer}>
            {t("profile")}
          </Link>
          
          {user && (
            <Link className="drawer-item" to="/admin" onClick={closeDrawer} style={{ color: 'var(--primary)' }}>
              Admin Panel
            </Link>
          )}
        </nav>
      </aside>
    </>
  )
}