import { useEffect, useRef, useState } from "react"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function HeroIntro() {
  const [coverUrl, setCoverUrl] = useState(null)
  const [heroVfxUrl, setHeroVfxUrl] = useState(null)

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

  // ✅ helper: get nav offset from CSS var (set by NavBar ResizeObserver)
  const getNavOffset = () => {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--nav-offset")
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : 72
    } catch {
      return 72
    }
  }

  // ✅ FIX: scroll to JUST under hero, not to newsletter (prevents overshooting)
  const scrollToTarget = () => {
    const hero = heroRef.current
    const navOffset = getNavOffset()
    const extraPad = 18

    if (hero) {
      const rect = hero.getBoundingClientRect()
      const heroBottomAbs = window.scrollY + rect.bottom

      // Scroll to the point where hero ends and content starts (under nav)
      const targetTop = Math.max(0, heroBottomAbs - navOffset + extraPad)

      window.scrollTo({ top: targetTop, behavior: "smooth" })
      return
    }

    // fallback
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
  }

  const scrollToHero = () => {
    const hero = heroRef.current
    const navOffset = getNavOffset()
    const extraPad = 6

    if (hero) {
      const rect = hero.getBoundingClientRect()
      const heroTopAbs = window.scrollY + rect.top
      const targetTop = Math.max(0, heroTopAbs - extraPad - (navOffset > 0 ? 0 : 0))
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

    // ✅ FIX: detect “we are at top of main” based on hero bottom proximity (more stable)
    const isAtTopOfMain = () => {
      const r = el.getBoundingClientRect()
      const navOffset = getNavOffset()
      const threshold = 120
      // when hero bottom is close-ish to nav area -> we’re near the seam (top of main)
      return r.bottom <= navOffset + threshold && r.bottom >= navOffset - 6
    }

    const lock = () => {
      lockRef.current = true
      setTimeout(() => (lockRef.current = false), 700)
    }

    const onWheel = (e) => {
      if (lockRef.current) return
      const dy = e.deltaY

      // down from Hero -> to just under hero (NOT newsletter)
      if (isHeroVisible() && dy > 12) {
        e.preventDefault()
        lock()
        scrollToTarget()
        return
      }

      // up from start of main -> back to hero
      if (!isHeroVisible() && dy < -12 && isAtTopOfMain()) {
        e.preventDefault()
        lock()
        scrollToHero()
      }
    }

    // touch (mobile)
    const onTouchStart = (e) => {
      touchStartY.current = e.touches?.[0]?.clientY ?? 0
    }

    const onTouchEnd = (e) => {
      if (lockRef.current) return
      const endY = e.changedTouches?.[0]?.clientY ?? 0
      const diff = touchStartY.current - endY

      // swipe up (content goes down)
      if (isHeroVisible() && diff > 18) {
        lock()
        scrollToTarget()
      }

      // swipe down (content goes up)
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

  return (
    <section className="hero-intro" ref={heroRef}>
      <div className="hero-inner">
        <div className="hero-media">
          {heroVfxUrl ? (
            <video
              className="hero-vfx"
              src={heroVfxUrl}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : coverUrl ? (
            <img
              src={coverUrl}
              alt="MIREN cover"
              className="hero-cover"
              loading="lazy"
            />
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
