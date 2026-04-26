"use client"
import { useState, useEffect } from "react"
import { api } from "../lib/api"

export default function Gallery() {
  const [articles, setArticles] = useState([])

  useEffect(() => {
    api.get("/articles?category=gallery")
      .then((res) => setArticles(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
  }, [])

  return (
    <div className="page">
      <h2 className="headline">Галерия</h2>

      {articles.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "48px 0" }}>Няма снимки в галерията.</p>
      ) : (
        <div className="gal-grid">
          {articles.map((item) => (
            <div key={item.id} className="gal-card">
              <div className="gal-card-img-wrap">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.title || "Gallery"} className="gal-card-img" loading="lazy" />
                  : <div className="gal-card-placeholder" />
                }
                <div className="gal-card-overlay" />
              </div>
              {item.title && (
                <p className="gal-card-title">{item.title}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
