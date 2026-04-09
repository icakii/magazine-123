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
  const swipeTriggeredRef = useRef(false)

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
    const navOffset = getNavOffset()
          const target = document.getElementById("home-main-content")
    if (target) {
      const rect = target.getBoundingClientRect()
      const targetTop = Math.max(0, window.scrollY + rect.top - navOffset + 8)
      window.scrollTo({ top: targetTop, behavior: "smooth" })
      return
    }

    const hero = heroRef.current

    if (hero) {
      const rect = hero.getBoundingClientRect()
      const heroBottomAbs = window.scrollY + rect.bottom
      window.scrollTo({ top: Math.max(0, heroBottomAbs - navOffset + 8), behavior: "smooth" })
    } 
  }

  useEffect(() => {
    const canSwipeScroll = () => {
      const hero = heroRef.current
      if (!hero) return false
      if (window.scrollY > 120) return false

      const rect = hero.getBoundingClientRect()
      return rect.top < window.innerHeight * 0.65 && rect.bottom > window.innerHeight * 0.25
    }

    const triggerSwipeScroll = () => {
      if (swipeTriggeredRef.current || !canSwipeScroll()) return
      swipeTriggeredRef.current = true
      scrollToTarget()
      window.setTimeout(() => {
        swipeTriggeredRef.current = false
      }, 900)
    }

    const onWheel = (event) => {
      if (event.deltaY > 8) triggerSwipeScroll()
    }

    let touchStartY = null

    const onTouchStart = (event) => {
      touchStartY = event.touches?.[0]?.clientY ?? null
    }

    const onTouchMove = (event) => {
      if (touchStartY == null) return
      const currentY = event.touches?.[0]?.clientY
      if (typeof currentY !== "number") return
      if (touchStartY - currentY > 24) {
        triggerSwipeScroll()
        touchStartY = null
      }
    }

    const onScroll = () => {
      if (window.scrollY > 10) triggerSwipeScroll()
    }

    window.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("scroll", onScroll)
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
              title={orderLocked ? t("hero_order_locked_title") : t("hero_order_open_title")}            >
              {orderLocked ? t("hero_order_locked") : t("hero_order_now")}
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
            <span className="button-text">{t("hero_scroll_down")}</span>
          </button>
          <p className="hero-hint">{t("hero_hint")}</p>
        </div>
      </div>
    </section>
  )
}