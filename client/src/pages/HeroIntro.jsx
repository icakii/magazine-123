import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function HeroIntro() {
  const [coverUrl, setCoverUrl] = useState(null)
  const [heroVfxUrl, setHeroVfxUrl] = useState(null)

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

  const scrollDown = () => {
    const target = document.querySelector("#home-main-content")
    if (target) target.scrollIntoView({ behavior: "smooth" })
    else window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
  }

  return (
    <section className="hero-intro" aria-label="MIREN Intro">
      <div className="hero-intro__inner">
        {/* LEFT: VFX / Cover */}
        <div className="hero-intro__media">
          <div className="hero-intro__mediaFrame">
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

            {/* floating elements */}
            <div className="hero-orb hero-orb-1" />
            <div className="hero-orb hero-orb-2" />
            <div className="hero-orb hero-orb-3" />
          </div>
        </div>

        {/* RIGHT: text */}
        <div className="hero-intro__copy">
          <p className="hero-kicker">{t("hero_kicker")}</p>
          <h1 className="hero-title">MIREN</h1>
          <p className="hero-subtitle">{t("hero_subtitle")}</p>

          <button className="hero-scroll" onClick={scrollDown} type="button">
            <span className="hero-scroll-icon">↓</span>
            <span className="hero-scroll-label">{t("hero_swipe")}</span>
          </button>

          <div className="hero-hint">{t("hero_hint")}</div>
        </div>
      </div>
    </section>
  )
}
