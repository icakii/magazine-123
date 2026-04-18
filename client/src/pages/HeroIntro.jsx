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
  const touchStartRef = useRef({ x: 0, y: 0 })

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

  const scrollToHeroTop = () => {
    const hero = heroRef.current
    if (!hero) return
    const navOffset = getNavOffset()
    const rect = hero.getBoundingClientRect()
    const heroTop = Math.max(0, window.scrollY + rect.top - navOffset + 2)
    window.scrollTo({ top: heroTop, behavior: "smooth" })
  }

  useEffect(() => {
    const canSwipeDown = () => {
      const hero = heroRef.current
      if (!hero) return false
      if (window.scrollY > 120) return false

      const rect = hero.getBoundingClientRect()
      return rect.top < window.innerHeight * 0.65 && rect.bottom > window.innerHeight * 0.25
    }

    const canSwipeUp = () => {
      const hero = heroRef.current
      if (!hero) return false
      if (window.scrollY < 72) return false

      const rect = hero.getBoundingClientRect()
      const vh = window.innerHeight
      // Само когато hero още се вижда (връщаш се към него), не навсякъде в първия екран
      const heroPeeks = rect.bottom > 48 && rect.top < vh * 0.92
      if (!heroPeeks) return false

      const maxY = Math.min(vh * 0.72, 640)
      return window.scrollY <= maxY
    }

    const triggerSwipeScroll = (direction) => {
      if (swipeTriggeredRef.current) return
      if (direction === "down" && !canSwipeDown()) return
      if (direction === "up" && !canSwipeUp()) return

      swipeTriggeredRef.current = true
      if (direction === "down") {
        scrollToTarget()
      } else {
        scrollToHeroTop()
      }
      window.setTimeout(() => {
        swipeTriggeredRef.current = false
      }, direction === "up" ? 1100 : 900)
    }

    const onWheel = (event) => {
      const dy = event.deltaY
      // По-големи прагове — по-малко „фалшиви“ скокове към hero при лек скрол
      if (dy > 28) triggerSwipeScroll("down")
      if (dy < -42) triggerSwipeScroll("up")
    }
    
    const onTouchStart = (event) => {
      const point = event.touches?.[0]
      if (!point) return
      touchStartRef.current = { x: point.clientX, y: point.clientY }
    }
      const onTouchEnd = (event) => {
      const point = event.changedTouches?.[0]
      if (!point) return

      const deltaX = point.clientX - touchStartRef.current.x
      const deltaY = point.clientY - touchStartRef.current.y
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Avoid accidental triggers on diagonal / micro-swipes.
      if (absY < 64 || absY < absX * 1.35) return

      if (deltaY < 0) {
        triggerSwipeScroll("down")
      } else {
        triggerSwipeScroll("up")
      }
    }

    window.addEventListener("wheel", onWheel, { passive: true })
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
    <>
    <svg width="0" height="0" style={{ position: "absolute", overflow: "hidden" }} aria-hidden="true">
      <defs>
        <filter id="hdNoise1">
          <feTurbulence result="noise" numOctaves="8" baseFrequency="0.1" type="fractalNoise" />
          <feDisplacementMap yChannelSelector="G" xChannelSelector="R" scale="3" in2="noise" in="SourceGraphic" />
        </filter>
        <filter id="hdNoise2">
          <feTurbulence result="noise" numOctaves="8" baseFrequency="0.1" seed="1010" type="fractalNoise" />
          <feDisplacementMap yChannelSelector="G" xChannelSelector="R" scale="3" in2="noise" in="SourceGraphic" />
        </filter>
        <filter id="hdNoiseT1">
          <feTurbulence result="noise" numOctaves="8" baseFrequency="0.1" type="fractalNoise" />
          <feDisplacementMap yChannelSelector="G" xChannelSelector="R" scale="6" in2="noise" in="SourceGraphic" />
        </filter>
        <filter id="hdNoiseT2">
          <feTurbulence result="noise" numOctaves="8" baseFrequency="0.1" seed="1010" type="fractalNoise" />
          <feDisplacementMap yChannelSelector="G" xChannelSelector="R" scale="6" in2="noise" in="SourceGraphic" />
        </filter>
      </defs>
    </svg>
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

          <button className="hand-btn" onClick={scrollToTarget} type="button">
            <svg className="hand-btn-cosm" viewBox="0 0 256 256" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path d="M243.07324,157.43945c-1.2334-1.47949-23.18847-27.34619-60.46972-41.05859-1.67579-17.97412-8.25293-34.36328-18.93653-46.87158C149.41309,52.8208,128.78027,44,104,44,54.51074,44,22.10059,88.57715,20.74512,90.4751a3.99987,3.99987,0,0,0,6.50781,4.65234C27.5625,94.6958,58.68359,52,104,52c22.36816,0,40.89648,7.85107,53.584,22.70508,8.915,10.437,14.65625,23.9541,16.65528,38.894A133.54185,133.54185,0,0,0,136,108c-25.10742,0-46.09473,6.48486-60.69434,18.75391-12.65234,10.63379-19.91015,25.39355-19.91015,40.49463a43.61545,43.61545,0,0,0,12.69336,31.21923C76.98438,207.3208,89.40234,212,104,212c23.98047,0,44.37305-9.4668,58.97461-27.37744,12.74512-15.6333,20.05566-37.145,20.05566-59.01953,0-.1128-.001-.22559-.001-.33838,33.62988,13.48486,53.62207,36.96631,53.89746,37.2959a4.00015,4.00015,0,0,0,6.14648-5.1211ZM104,204c-27.89746,0-40.60449-19.05078-40.60449-36.75146C63.39551,142.56592,86.11621,116,136,116a124.37834,124.37834,0,0,1,38.97266,6.32617q.05712,1.63038.05761,3.27686C175.03027,177.07129,139.29785,204,104,204Z" />
            </svg>
            <svg className="hand-btn-highlight" viewBox="0 0 144.75738 77.18431" preserveAspectRatio="none" aria-hidden="true">
              <g transform="translate(-171.52826,-126.11624)">
                <g fill="none" strokeWidth="17" strokeLinecap="round" strokeMiterlimit="10">
                  <path d="M180.02826,169.45123c0,0 12.65228,-25.55115 24.2441,-25.66863c6.39271,-0.06479 -5.89143,46.12943 4.90937,50.63857c10.22345,4.2681 24.14292,-52.38336 37.86455,-59.80493c3.31715,-1.79413 -5.35094,45.88889 -0.78872,58.34589c5.19371,14.18125 33.36934,-58.38221 36.43049,-56.91633c4.67078,2.23667 -0.06338,44.42744 5.22574,47.53647c6.04041,3.55065 19.87185,-20.77286 19.87185,-20.77286" />
                </g>
              </g>
            </svg>
            {t("hero_scroll_down")}
          </button>
          <p className="hero-hint">{t("hero_hint")}</p>
        </div>
      </div>
    </section>
    </>
  )
}