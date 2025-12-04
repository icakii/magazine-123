// client/src/components/NavBar.jsx

"use client"

import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"
import { t, getLang, setLang } from "../lib/i18n"
import { useEffect, useState } from "react"

// Списък с админи (същия като в server/index.js)
const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com"]

function toggleTheme() {
  const html = document.documentElement
  const current = html.getAttribute("data-theme") || "light"
  html.setAttribute("data-theme", current === "dark" ? "light" : "dark")
}

export default function NavBar() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [lang, setLangState] = useState(getLang())
  
  // State за Pop-up прозореца
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Проверка за админ
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  useEffect(() => {
    function onLangChange(e) { setLangState(e.detail.lang) }
    window.addEventListener("lang:change", onLangChange)
    return () => window.removeEventListener("lang:change", onLangChange)
  }, [])

  async function handleLogout(e) {
    e.preventDefault()
    try { await api.post("/auth/logout") } catch {}
    location.href = "/"
  }

  function changeLang() {
    const next = lang === "bg" ? "en" : "bg"
    setLang(next)
  }

  function toggleDrawer() { setOpen((o) => !o) }
  function closeDrawer() { setOpen(false) }

  // --- ЛОГИКА ЗА ЗАЩИТА НА ЛИНКОВЕТЕ ---
  // Ако не си логнат, спира клика и показва модала
  const handleProtectedClick = (e, path) => {
    if (!user) {
      e.preventDefault() // Спираме навигацията
      setShowLoginModal(true) // Показваме Pop-up
      closeDrawer() // Затваряме мобилното меню ако е отворено
    } else {
      // Ако си логнат, просто продължаваме (Link-ът си върши работата)
      closeDrawer()
    }
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-left">
            <button className="hamburger" aria-label="Open menu" onClick={toggleDrawer}>
              <span className="lines">
                <span className="line"></span><span className="line"></span><span className="line"></span>
              </span>
            </button>
          </div>
          
          <div className="nav-center">
            <Link className="brand" to="/">
              {t("brand")}
            </Link>
          </div>

          <div className="nav-right">
            {!loading && !user && (
              <>
                <Link to="/register" className="btn ghost" style={{border:'none', marginRight: 5}}>{t("register")}</Link>
                <Link to="/login" className="btn primary">{t("login")}</Link>
              </>
            )}
            
            {user && (
              <form onSubmit={handleLogout} style={{ display: "inline" }}>
                <button className="btn secondary" type="submit">{t("logout")}</button>
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

      <div className={`drawer-backdrop ${open ? "open" : ""}`} onClick={closeDrawer} />

      {/* DRAWER MENU */}
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-header">{t("brand")}</div>
        
        <nav className="drawer-list">
          <Link className="drawer-item" to="/" onClick={closeDrawer}>Home</Link>
          
          {/* ЗАЩИТЕНИ ЛИНКОВЕ (с handleProtectedClick) */}
          <Link className="drawer-item" to="/news" onClick={(e) => handleProtectedClick(e)}>News 🔒</Link>
          <Link className="drawer-item" to="/events" onClick={(e) => handleProtectedClick(e)}>Events 🔒</Link>
          <Link className="drawer-item" to="/gallery" onClick={(e) => handleProtectedClick(e)}>Gallery 🔒</Link>
          <Link className="drawer-item" to="/games" onClick={(e) => handleProtectedClick(e)}>Games 🔒</Link>
          <Link className="drawer-item" to="/e-magazine" onClick={(e) => handleProtectedClick(e)}>E-Magazine 🔒</Link>
          
          <Link className="drawer-item" to="/about" onClick={closeDrawer}>{t("about")}</Link>
          <Link className="drawer-item" to="/contact" onClick={closeDrawer}>{t("contact")}</Link>
          <Link className="drawer-item" to="/subscriptions" onClick={closeDrawer}>{t("subscriptions")}</Link>
          <Link className="drawer-item" to="/help" onClick={closeDrawer}>{t("help")}</Link>

          <div style={{ flex: 1 }} /> 
          <div className="drawer-sep" />

          <Link className="drawer-item" to="/profile" onClick={closeDrawer}>{t("profile")}</Link>
          
          {/* САМО ЗА АДМИНИ */}
          {isAdmin && (
            <Link className="drawer-item" to="/admin" onClick={closeDrawer} style={{ color: 'var(--primary)', fontWeight:'bold' }}>
              ⚙️ Admin Panel
            </Link>
          )}
        </nav>
      </aside>

      {/* --- POP-UP ЗА РЕГИСТРАЦИЯ --- */}
      {showLoginModal && (
        <div className="modal-backdrop" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{textAlign: 'center', maxWidth: '400px'}}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            
            <div style={{fontSize: '3rem', marginBottom: '10px'}}>🔒</div>
            <h2 className="headline" style={{fontSize: '1.8rem'}}>Access Restricted</h2>
            <p style={{marginBottom: '20px', color: 'gray'}}>
              You must be a registered member to access this content. <br/>
              Join MIREN today!
            </p>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <Link 
                to="/register" 
                className="btn primary" 
                onClick={() => setShowLoginModal(false)}
                style={{textDecoration:'none'}}
              >
                Create Account
              </Link>
              
              <Link 
                to="/login" 
                className="btn ghost" 
                onClick={() => setShowLoginModal(false)}
                style={{textDecoration:'none'}}
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