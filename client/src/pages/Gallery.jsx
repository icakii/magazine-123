"use client"
import { useState, useEffect } from "react"
import { api } from "../lib/api"

export default function Gallery() {
  const [articles, setArticles] = useState([])
  const [fullscreen, setFullscreen] = useState(null)

  useEffect(() => {
    api.get("/articles?category=gallery")
      .then((res) => setArticles(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setFullscreen(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <div className="page">
        <h2 className="headline">Галерия</h2>

        {articles.length === 0 ? (
          <p className="text-muted" style={{ textAlign: "center", padding: "48px 0" }}>Няма снимки в галерията.</p>
        ) : (
          <div className="gal-grid">
            {articles.map((item) => (
              <div key={item.id} className="gal-card" onClick={() => setFullscreen(item)} style={{ cursor: "pointer" }}>
                <div className="gal-card-img-wrap">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.title || "Gallery"} className="gal-card-img" loading="lazy" />
                    : <div className="gal-card-placeholder" />
                  }
                  <div className="gal-card-overlay">
                    <span className="gal-see-more">Виж повече</span>
                  </div>
                </div>
                {item.title && <p className="gal-card-title">{item.title}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {fullscreen && (
        <div className="fs-backdrop" onClick={() => setFullscreen(null)}>
          <div className="fs-modal fs-modal--img" onClick={(e) => e.stopPropagation()}>
            <button className="fs-close" onClick={() => setFullscreen(null)} type="button">×</button>
            {fullscreen.imageUrl && (
              <img src={fullscreen.imageUrl} alt={fullscreen.title || "Gallery"} className="fs-img fs-img--full" />
            )}
            {fullscreen.title && <p className="fs-gal-title">{fullscreen.title}</p>}
          </div>
        </div>
      )}
    </>
  )
}
