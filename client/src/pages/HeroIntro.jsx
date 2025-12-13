import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { getLang, t } from "../lib/i18n"

export default function HeroIntro() {
  const [coverUrl, setCoverUrl] = useState(null)

  // ✅ rerender on language change
  const [lang, setLangState] = useState(getLang())
  useEffect(() => {
    const onLangChange = (e) => setLangState(e.detail.lang)
    window.addEventListener("lang:change", onLangChange)
    return () => window.removeEventListener("lang:change", onLangChange)
  }, [])

  useEffect(() => {
    api
      .get("/magazines")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCoverUrl(res.data[0].coverUrl || null)
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
    <section className="hero-intro" aria-label="MIREN intro">
      <div className="hero-inner">
        <div className="hero-media">
          {coverUrl ? (
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
          <h1 className="hero-title">{t("brand")}</h1>
          <p className="hero-subtitle">{t("hero_subtitle")}</p>

          <button className="hero-scroll" onClick={scrollDown} type="button">
            <span className="hero-scroll-text">↓</span>
            <span className="hero-scroll-label">{t("hero_scroll_label")}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
