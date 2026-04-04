import { useEffect, useRef, useState } from "react"
import { api } from "../lib/api"
import { t } from "../lib/i18n"
import { useNavigate } from "react-router-dom"

const ADMIN_EMAILS = [
  "icaki@mirenmagazine.com",
  "info@mirenmagazine.com",
  "info@mirenmagaizne.com",
]

// ⚠️ смени годината ако трябва
const RELEASE_UTC_ISO = "2026-04-30T18:00:00+03:00"

function isReleasedNow() {
  return Date.now() >= new Date(RELEASE_UTC_ISO).getTime()
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(String(url || ""))
}

function normalizeHeroPayload(data) {
  return {
    heroVfxUrl: String(data?.heroVfxUrl || data?.hero_vfx_url || "").trim(),
    heroMediaUrl: String(data?.heroMediaUrl || data?.hero_media_url || "").trim(),
  }
}

export default function HeroIntro() {
  const navigate = useNavigate()

  const [heroMediaUrl, setHeroMediaUrl] = useState(null)
  const [heroVfxUrl, setHeroVfxUrl] = useState(null)

  const [me, setMe] = useState(null)
  const [meLoaded, setMeLoaded] = useState(false)

  const heroRef = useRef(null)
  const lockRef = useRef(false)
  const touchStartY = useRef(0)

  useEffect(() => {
    api
      .get("/hero", { params: { t: Date.now() } })
      .then((res) => {
 const normalized = normalizeHeroPayload(res.data || {})
        setHeroVfxUrl(normalized.heroVfxUrl || null)
        setHeroMediaUrl(normalized.heroMediaUrl || null)
      })
      .catch(() => {
        setHeroVfxUrl(null)
        setHeroMediaUrl(null)
      })
  }, [])

  // get current user (optional)
  useEffect(() => {
    api
      .get("/user/me")
      .then((res) => setMe(res.data || null))
      .catch(() => setMe(null))
      .finally(() => setMeLoaded(true))
  }, [])

  const isAdmin = !!me?.email && ADMIN_EMAILS.includes(me.email)
  const released = isReleasedNow()

  const getNavOffset = () => {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--nav-offset")
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : 72
    } catch {
      return 72
    }
  }

  const scrollToTarget = () => {
    const hero = heroRef.current
    const navOffset = getNavOffset()
    const extraPad = 18

    if (hero) {
      const rect = hero.getBoundingClientRect()
      const heroBottomAbs = window.scrollY + rect.bottom
      const targetTop = Math.max(0, heroBottomAbs - navOffset + extraPad)
      window.scrollTo({ top: targetTop, behavior: "smooth" })
      return
    }
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
  }

  const scrollToHero = () => {
    const hero = heroRef.current
    const extraPad = 6

    if (hero) {
      const rect = hero.getBoundingClientRect()
      const heroTopAbs = window.scrollY + rect.top
      const targetTop = Math.max(0, heroTopAbs - extraPad)
      window.scrollTo({ top: targetTop, behavior: "smooth" })
      return
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    const el = heroRef.current
    if (!el) return

    const isHeroVisible = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 800
      return r.top < vh * 0.35 && r.bottom > vh * 0.45
    }

    const isAtTopOfMain = () => {
      const r = el.getBoundingClientRect()
      const navOffset = getNavOffset()
      const threshold = 120
      return r.bottom <= navOffset + threshold && r.bottom >= navOffset - 6
    }

    const lock = () => {
      lockRef.current = true
      setTimeout(() => (lockRef.current = false), 700)
    }

    const onWheel = (e) => {
      if (lockRef.current) return
      const dy = e.deltaY

      if (isHeroVisible() && dy > 12) {
        e.preventDefault()
        lock()
        scrollToTarget()
        return
      }

      if (!isHeroVisible() && dy < -12 && isAtTopOfMain()) {
        e.preventDefault()
        lock()
        scrollToHero()
      }
    }

    const onTouchStart = (e) => {
      touchStartY.current = e.touches?.[0]?.clientY ?? 0
    }

    const onTouchEnd = (e) => {
      if (lockRef.current) return
      const endY = e.changedTouches?.[0]?.clientY ?? 0
      const diff = touchStartY.current - endY

      if (isHeroVisible() && diff > 18) {
        lock()
        scrollToTarget()
      }

      if (!isHeroVisible() && diff < -18 && isAtTopOfMain()) {
        lock()
        scrollToHero()
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  const onOrderClick = () => {
    // Option A: go to store page
    navigate("/store")

    // Option B: open cart drawer instantly (ако го ползваш):
    // document.body.classList.add("cart-open")
  }

  const orderLocked = !released && !isAdmin

  return (
    <section className="hero-intro" ref={heroRef}>
      <div className="hero-inner">
        <div className="hero-media">
          {heroVfxUrl ? (
            isVideoUrl(heroVfxUrl) ? (
              <video className="hero-vfx" src={heroVfxUrl} autoPlay muted loop playsInline />
            ) : (
              <img src={heroVfxUrl} alt="MIREN hero" className="hero-cover" loading="lazy" />
            )
          ) : heroMediaUrl ? (
            isVideoUrl(heroMediaUrl) ? (
              <video className="hero-vfx" src={heroMediaUrl} autoPlay muted loop playsInline controls />
            ) : (
              <img src={heroMediaUrl} alt="MIREN hero" className="hero-cover" loading="lazy" />
            )
          ) : (
            <div className="hero-cover hero-cover--placeholder">
              <span>MIREN</span>
            </div>
          )}

          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        <div className="hero-copy">
          <p className="hero-kicker">{t("hero_kicker")}</p>
          <h1 className="hero-title">MIREN</h1>
          <p className="hero-subtitle">{t("hero_subtitle")}</p>

          {/* CTA ROW */}
          <div className="hero-cta-row">
            <button
              className={`btn ${orderLocked ? "outline" : "primary"} hero-order-btn`}
              onClick={onOrderClick}
              type="button"
              disabled={orderLocked}
              title={orderLocked ? "Order opens on 30 April at 18:00" : "Open store"}
            >
              {orderLocked ? "Order on 30 April, 18:00 🔒" : "Order Now ⚡"}
            </button>

            {/* optional: show admin badge */}
            {meLoaded && isAdmin && (
              <span className="hero-admin-pill">ADMIN</span>
            )}
          </div>

          <button className="hero-scroll learn-more" onClick={scrollToTarget} type="button">
            <span className="circle" aria-hidden="true">
              <span className="icon arrow" />
            </span>
            <span className="button-text">Scroll down ↓</span>
          </button>

          <p className="hero-hint">Scroll up anytime to return here.</p>
        </div>
      </div>
    </section>
  )
}
  