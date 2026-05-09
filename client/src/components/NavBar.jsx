import { Link, useNavigate } from "react-router-dom"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { t, getLang, setLang } from "../lib/i18n"
import { useAuth } from "../context/AuthContext"
import { createPortal } from "react-dom"

const CONTENT_LINKS = [
  { to: "/e-magazine", label: "E-Magazine" },
  { to: "/news",       label: "Новини" },
  { to: "/gallery",    label: "Галерия" },
  { to: "/events",     label: "Събития" },
  { to: "/games",      label: "Игри" },
]
const PRODUCTS_LINKS = [
  { to: "/write",         label: "Напиши статия" },
  { to: "/store",         label: "Магазин" },
  { to: "/subscriptions", label: "Абонаменти" },
  { to: "/opportunities", label: "Партньорства" },
]
const INFO_LINKS = [
  { to: "/about",   label: "За нас" },
  { to: "/contact", label: "Контакти" },
  { to: "/help",    label: "Помощ" },
]

const NAV_SECTIONS = [
  { key: "content",  labelBg: "Съдържание", labelEn: "Content",  links: CONTENT_LINKS },
  { key: "products", labelBg: "Продукти",   labelEn: "Products", links: PRODUCTS_LINKS },
  { key: "info",     labelBg: "Инфо",        labelEn: "Info",     links: INFO_LINKS },
]

const DESKTOP_BP = 900

export default function NavBar() {
  const navigate = useNavigate()
  const { user, loading, logout } = useAuth()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [lang, setLangState] = useState(getLang())
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_BP)
  const [theme, setTheme] = useState(() => {
    try { return document.documentElement.getAttribute("data-theme") || localStorage.getItem("miren_theme") || "light" } catch { return "light" }
  })

  const navRef = useRef(null)

  const isAdmin = !!user?.isAdmin

  // ── responsive ───────────────────────────────────────
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= DESKTOP_BP)
    window.addEventListener("resize", check, { passive: true })
    return () => window.removeEventListener("resize", check)
  }, [])

  // ── nav height → --nav-offset ────────────────────────
  useLayoutEffect(() => {
    const el = navRef.current
    if (!el) return
    const apply = () => {
      const h = el.offsetHeight || 72
      document.documentElement.style.setProperty("--nav-offset", `${h}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    window.addEventListener("resize", apply)
    return () => { ro.disconnect(); window.removeEventListener("resize", apply) }
  }, [])

  // ── body scroll lock when drawer open ───────────────
  useEffect(() => {
    document.body.classList.toggle("drawer-open", drawerOpen)
    return () => document.body.classList.remove("drawer-open")
  }, [drawerOpen])

  // ── close drawer on scroll ───────────────────────────
  useEffect(() => {
    const onScroll = () => { if (drawerOpen) setDrawerOpen(false) }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [drawerOpen])

  // ── close dropdown on outside click ─────────────────
  useEffect(() => {
    if (!openDropdown) return
    const onDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenDropdown(null)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [openDropdown])

  // ── lang change event ────────────────────────────────
  useEffect(() => {
    const onLang = (e) => setLangState(e.detail.lang)
    window.addEventListener("lang:change", onLang)
    return () => window.removeEventListener("lang:change", onLang)
  }, [])

  function handleThemeToggle() {
    const next = theme === "dark" ? "light" : "dark"
    document.documentElement.classList.add("theme-changing")
    document.documentElement.setAttribute("data-theme", next)
    try { localStorage.setItem("miren_theme", next) } catch {}
    setTheme(next)
    setTimeout(() => document.documentElement.classList.remove("theme-changing"), 350)
  }

  async function handleLogout(e) {
    if (e) e.preventDefault()
    await logout()
    setDrawerOpen(false)
    navigate("/", { replace: true })
  }

  function changeLang() {
    setLang(lang === "bg" ? "en" : "bg")
  }

  function closeAll() {
    setDrawerOpen(false)
    setOpenDropdown(null)
  }

  function toggleDropdown(key) {
    setOpenDropdown(prev => prev === key ? null : key)
  }

  const sectionLabel = (s) => lang === "en" ? s.labelEn : s.labelBg

  // ── Issue CTA label ──────────────────────────────────
  const issueLabel = lang === "bg" ? "Издание #0001" : "Issue #0001"

  // ── Theme toggle SVG (extracted for reuse) ───────────
  const ThemeToggle = () => (
    <label className="theme-toggle-label" aria-label="Toggle theme">
      <input type="checkbox" checked={theme === "dark"} onChange={handleThemeToggle} />
      <svg viewBox="0 0 69.667 44" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(3.5 3.5)">
          <g filter="url(#ttContainer)" transform="matrix(1,0,0,1,-3.5,-3.5)">
            <rect fill="#83cbd8" transform="translate(3.5 3.5)" rx="17.5" height="35" width="60.667" id="ttContainerRect" />
          </g>
          <g transform="translate(2.333 2.333)" id="tt-button">
            <g id="tt-sun">
              <g filter="url(#ttSunOuter)" transform="matrix(1,0,0,1,-5.83,-5.83)">
                <circle fill="#f8e664" transform="translate(5.83 5.83)" r="15.167" cy="15.167" cx="15.167" id="ttSunOuterC" />
              </g>
              <g filter="url(#ttSunInner)" transform="matrix(1,0,0,1,-5.83,-5.83)">
                <path fill="rgba(246,254,247,0.29)" transform="translate(9.33 9.33)" d="M11.667,0A11.667,11.667,0,1,1,0,11.667,11.667,11.667,0,0,1,11.667,0Z" id="ttSunPath" />
              </g>
              <circle fill="#fcf4b9" transform="translate(8.167 8.167)" r="7" cy="7" cx="7" />
            </g>
            <g id="tt-moon">
              <g filter="url(#ttMoon)" transform="matrix(1,0,0,1,-31.5,-5.83)">
                <circle fill="#cce6ee" transform="translate(31.5 5.83)" r="15.167" cy="15.167" cx="15.167" id="ttMoonC" />
              </g>
              <g fill="#a6cad0" transform="translate(-24.415 -1.009)" id="tt-patches">
                <circle transform="translate(43.009 4.496)" r="2" cy="2" cx="2" />
                <circle transform="translate(39.366 17.952)" r="2" cy="2" cx="2" />
                <circle transform="translate(33.016 8.044)" r="1" cy="1" cx="1" />
                <circle transform="translate(51.081 18.888)" r="1" cy="1" cx="1" />
                <circle transform="translate(33.016 22.503)" r="1" cy="1" cx="1" />
                <circle transform="translate(50.081 10.53)" r="1.5" cy="1.5" cx="1.5" />
              </g>
            </g>
          </g>
          <g filter="url(#ttCloud)" transform="matrix(1,0,0,1,-3.5,-3.5)" id="tt-cloud">
            <path fill="#fff" transform="translate(-3466.47 -160.94)" d="M3512.81,173.815a4.463,4.463,0,0,1,2.243.62.95.95,0,0,1,.72-1.281,4.852,4.852,0,0,1,2.623.519c.034.02-.5-1.968.281-2.716a2.117,2.117,0,0,1,2.829-.274,1.821,1.821,0,0,1,.854,1.858c.063.037,2.594-.049,3.285,1.273s-.865,2.544-.807,2.626a12.192,12.192,0,0,1,2.278.892c.553.448,1.106,1.992-1.62,2.927a7.742,7.742,0,0,1-3.762-.3c-1.28-.49-1.181-2.65-1.137-2.624s-1.417,2.2-2.623,2.2a4.172,4.172,0,0,1-2.394-1.206,3.825,3.825,0,0,1-2.771.774c-3.429-.46-2.333-3.267-2.2-3.55A3.721,3.721,0,0,1,3512.81,173.815Z" />
          </g>
          <g fill="#def8ff" transform="translate(3.585 1.325)" id="tt-stars">
            <path transform="matrix(-1,0.017,-0.017,-1,24.231,3.055)" d="M.774,0,.566.559,0,.539.458.933.25,1.492l.485-.361.458.394L1.024.953,1.509.592.943.572Z" />
            <path transform="matrix(-0.777,0.629,-0.629,-0.777,23.185,12.358)" d="M1.341.529.836.472.736,0,.505.46,0,.4.4.729l-.231.46L.605.932l.4.326L.9.786Z" />
            <path transform="matrix(0.438,0.899,-0.899,0.438,23.177,29.735)" d="M.015,1.065.475.9l.285.365L.766.772l.46-.164L.745.494.751,0,.481.407,0,.293.285.658Z" />
            <path transform="translate(12.677 0.388) rotate(104)" d="M1.161,1.6,1.059,1,1.574.722.962.607.86,0,.613.572,0,.457.446.881.2,1.454l.516-.274Z" />
            <path transform="matrix(-0.07,0.998,-0.998,-0.07,11.066,15.457)" d="M.873,1.648l.114-.62L1.579.945,1.03.62,1.144,0,.706.464.157.139.438.7,0,1.167l.592-.083Z" />
            <path transform="translate(8.326 28.061) rotate(11)" d="M.593,0,.638.724,0,.982l.7.211.045.724.36-.64.7.211L1.342.935,1.7.294,1.063.552Z" />
            <path transform="translate(5.012 5.962) rotate(172)" d="M.816,0,.5.455,0,.311.323.767l-.312.455.516-.215.323.456L.827.911,1.343.7.839.552Z" />
            <path transform="translate(2.218 14.616) rotate(169)" d="M1.261,0,.774.571.114.3.487.967,0,1.538.728,1.32l.372.662.047-.749.728-.218L1.215.749Z" />
          </g>
          <defs>
            <filter id="ttContainer"><feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.2" /></filter>
            <filter id="ttSunOuter"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" /></filter>
            <filter id="ttSunInner"><feGaussianBlur stdDeviation="1" /></filter>
            <filter id="ttMoon"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" /></filter>
            <filter id="ttCloud"><feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.15" /></filter>
          </defs>
        </g>
      </svg>
    </label>
  )

  // ── Profile button ────────────────────────────────────
  const ProfileBtn = ({ onClick }) => (
    <Link to="/profile" className="user-profile-btn" onClick={onClick} aria-label="Profile">
      <div className="user-profile-inner">
        {user?.pfp_url ? (
          <img src={user.pfp_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="m15.626 11.769a6 6 0 1 0 -7.252 0 9.008 9.008 0 0 0 -5.374 8.231 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 9.008 9.008 0 0 0 -5.374-8.231zm-7.626-4.769a4 4 0 1 1 4 4 4 4 0 0 1 -4-4zm10 14h-12a1 1 0 0 1 -1-1 7 7 0 0 1 14 0 1 1 0 0 1 -1 1z" />
          </svg>
        )}
        <p>Profile</p>
      </div>
    </Link>
  )

  // ── Login button (when not logged in) ────────────────
  const LoginBtn = ({ onClick }) => (
    <Link to="/profile" className="user-profile-btn" onClick={onClick} aria-label="Log In">
      <div className="user-profile-inner">
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="m15.626 11.769a6 6 0 1 0 -7.252 0 9.008 9.008 0 0 0 -5.374 8.231 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 9.008 9.008 0 0 0 -5.374-8.231zm-7.626-4.769a4 4 0 1 1 4 4 4 4 0 0 1 -4-4zm10 14h-12a1 1 0 0 1 -1-1 7 7 0 0 1 14 0 1 1 0 0 1 -1 1z" />
        </svg>
        <p>Log In</p>
      </div>
    </Link>
  )

  return (
    <>
      <nav className="nav" ref={navRef}>
        <div className="nav-inner">

          {/* ── LEFT: desktop dropdowns / mobile hamburger ── */}
          <div className="nav-left">
            {isDesktop ? (
              <div className="nav-desktop-links">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.key} className="nav-dropdown" style={{ position: "relative" }}>
                    <button
                      className={`nav-dropdown-btn${openDropdown === section.key ? " nav-dropdown-btn--open" : ""}`}
                      type="button"
                      onClick={() => toggleDropdown(section.key)}
                    >
                      {sectionLabel(section)}
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        style={{ transition: "transform 0.2s", transform: openDropdown === section.key ? "rotate(180deg)" : "none", flexShrink: 0 }}>
                        <path d="M2 4l4 4 4-4" />
                      </svg>
                    </button>

                    {openDropdown === section.key && (
                      <div className="nav-dropdown-panel">
                        {section.links.map((link) => (
                          <Link key={link.to} to={link.to} className="nav-dropdown-item" onClick={closeAll}>
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <button
                className={`hamburger${drawerOpen ? " open" : ""}`}
                aria-label="Open menu"
                onClick={() => setDrawerOpen((o) => !o)}
                type="button"
              >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path className="nav-line nav-line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22" />
                  <path className="nav-line" d="M7 16 27 16" />
                </svg>
              </button>
            )}
          </div>

          {/* ── CENTER: brand ── */}
          <div className="nav-center">
            <Link className="brand" to="/" onClick={closeAll}>
              {t("brand")}
            </Link>
          </div>

          {/* ── RIGHT ── */}
          <div className="nav-right">
            {/* desktop: lang + theme */}
            {isDesktop && (
              <>
                <button className="lang-toggle" onClick={changeLang} type="button">
                  {lang.toUpperCase()}
                </button>
                <ThemeToggle />
              </>
            )}

            {/* mobile: theme only */}
            {!isDesktop && <ThemeToggle />}

            {/* profile / login */}
            {!loading && (
              user ? <ProfileBtn onClick={closeAll} /> : <LoginBtn onClick={closeAll} />
            )}

            {/* admin button */}
            {isAdmin && (
              <button
                className="nav-admin-btn"
                type="button"
                title="Admin Panel"
                onClick={() => { navigate("/admin"); closeAll() }}
              >
                !
              </button>
            )}

            {/* issue CTA */}
            <Link to="/store" className="nav-issue-btn" onClick={closeAll}>
              {issueLabel} →
            </Link>
          </div>

        </div>
      </nav>

      {/* ── MOBILE DRAWER ── */}
      {!isDesktop && (
        <>
          <div className={`drawer-backdrop${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />
          <aside className={`drawer${drawerOpen ? " open" : ""}`} aria-hidden={!drawerOpen}>
            <nav className="drawer-list">

              {/* Home */}
              <Link className="drawer-item" to="/" onClick={() => setDrawerOpen(false)}>
                {lang === "bg" ? "Начало" : "Home"}
              </Link>

              <div className="drawer-sep" />

              {/* Scrollable sections */}
              <div className="drawer-sections-scroll">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.key} className="drawer-section">
                    <div className="drawer-section-label">{sectionLabel(section)}</div>
                    {section.links.map((link) => (
                      <Link key={link.to} to={link.to} className="drawer-item drawer-item--sub" onClick={() => setDrawerOpen(false)}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              <div className="drawer-sep" />

              {/* Lang + Theme row */}
              <div className="drawer-controls-row">
                <button className="drawer-item drawer-item-btn drawer-item-control" onClick={changeLang} type="button">
                  {t("language")}: {lang.toUpperCase()}
                </button>
              </div>

              <div className="drawer-sep" />

              {/* Profile / Login */}
              {user ? (
                <>
                  <Link className="drawer-item" to="/profile" onClick={() => setDrawerOpen(false)}>
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link className="drawer-item drawer-item--admin" to="/admin" onClick={() => setDrawerOpen(false)}>
                      ⚙️ Admin Panel
                    </Link>
                  )}
                </>
              ) : (
                <Link className="drawer-item" to="/profile" onClick={() => setDrawerOpen(false)}>
                  {lang === "bg" ? "Влез" : "Log In"}
                </Link>
              )}

            </nav>
          </aside>
        </>
      )}
    </>
  )
}
