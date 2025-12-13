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

  const scrollToTarget = () => {
    const target =
      document.querySelector("#home-newsletter") ||
      document.querySelector("#home-main-content")

    if (target) target.scrollIntoView({ behavior: "smooth" })
    else window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
  }

  const scrollToHero = () => {
    if (heroRef.current) heroRef.current.scrollIntoView({ behavior: "smooth" })
    else window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    const el = heroRef.current
    if (!el) return

    // helper: дали Hero е реално “във view”
    const isHeroVisible = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 800
      // ако горе е близо до top и секцията е видима достатъчно
      return r.top < vh * 0.35 && r.bottom > vh * 0.45
    }

    const isAtTopOfMain = () => {
      const target =
        document.querySelector("#home-newsletter") ||
        document.querySelector("#home-main-content")
      if (!target) return false
      const r = target.getBoundingClientRect()
      // ако target-a е “залепен” близо до top → значи сме горе в main
      return r.top >= -6 && r.top <= 120
    }

    const lock = () => {
      lockRef.current = true
      setTimeout(() => (lockRef.current = false), 700)
    }

    const onWheel = (e) => {
      // само ако е леко движение и не сме заключени
      if (lockRef.current) return
      const dy = e.deltaY

      // надолу от Hero → към newsletter/main
      if (isHeroVisible() && dy > 12) {
        e.preventDefault()
        lock()
        scrollToTarget()
        return
      }

      // нагоре от началото на main → обратно към Hero
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
      if (!isHeroVisible() && diff < -18 && (document.documentElement.scrollTop || window.scrollY) < 140) {
        lock()
        scrollToHero()
      }
    }

    // IMPORTANT: wheel preventDefault requires non-passive
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
