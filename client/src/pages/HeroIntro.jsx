import { useEffect, useRef, useState } from "react"
import { api } from "../lib/api"
import { t } from "../lib/i18n"
import { useNavigate } from "react-router-dom"

const ADMIN_EMAILS = [
  "icaki06@gmail.com",
  "icaki2k@gmail.com",
  "mirenmagazine@gmail.com",
]

// ⚠️ смени годината ако трябва
const RELEASE_UTC_YMD = "2026-02-27"

function todayUtcYmd() {
  return new Date().toISOString().slice(0, 10)
}

export default function HeroIntro() {
  const navigate = useNavigate()

  const [coverUrl, setCoverUrl] = useState(null)
  const [heroVfxUrl, setHeroVfxUrl] = useState(null)

  const [me, setMe] = useState(null)
  const [meLoaded, setMeLoaded] = useState(false)

  const heroRef = useRef(null)
  const lockRef = useRef(false)
  const touchStartY = useRef(0)

  useEffect(() => {
    api
      .get("/magazines")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const first = res.data[0]
          setCoverUrl(first.coverUrl || null)
          setHeroVfxUrl(first.heroVfxUrl || null)
        }
      })
      .catch(() => {})
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
  const released = todayUtcYmd() >= RELEASE_UTC_YMD

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
            <video className="hero-vfx" src={heroVfxUrl} autoPlay muted loop playsInline />
          ) : coverUrl ? (
            <img src={coverUrl} alt="MIREN cover" className="hero-cover" loading="lazy" />
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
              title={orderLocked ? "Order opens on 27 Feb" : "Open store"}
            >
              {orderLocked ? "Order on 27 Feb 🔒" : "Order Now ⚡"}
            </button>

            {/* optional: show admin badge */}
            {meLoaded && isAdmin && (
              <span className="hero-admin-pill">ADMIN</span>
            )}
          </div>

          <button className="hero-scroll" onClick={scrollToTarget} type="button">
            <span className="hero-scroll-icon">↓</span>
            <span className="hero-scroll-label">{t("hero_swipe")}</span>
          </button>

          <p className="hero-hint">Scroll up anytime to return here.</p>
        </div>
      </div>
    </section>
  )
}
