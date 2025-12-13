import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function HeroIntro() {
  const [coverUrl, setCoverUrl] = useState(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Взимаме първото списание като "cover" за херо секцията
    api
      .get("/magazines")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCoverUrl(res.data[0].coverUrl || null)
        }
      })
      .catch(() => {})
  }, [])

  // hide hero intro when user scrolls a bit
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 10) setHidden(true)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollDown = () => {
    const target = document.querySelector("#home-main-content")
    if (target) {
      target.scrollIntoView({ behavior: "smooth" })
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
    }
    setHidden(true)
  }

  if (hidden) return null

  return (
    <section className="hero-intro">
      <div className="hero-inner">
        <div className="hero-media">
          {coverUrl ? (
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

          {/* леко "3D" усещане с плаващи кръгове */}
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        <div className="hero-copy">
          <p className="hero-kicker">{t("hero_kicker")}</p>
          <h1 className="hero-title">MIREN Magazine</h1>
          <p className="hero-subtitle">{t("hero_subtitle")}</p>

          <button className="hero-scroll" onClick={scrollDown}>
            <span className="hero-scroll-text">{t("hero_scroll")}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
