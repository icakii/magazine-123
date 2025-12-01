"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function Gallery() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadArticles()
  }, [])

  async function loadArticles() {
    try {
      const res = await api.get("/articles?category=gallery")
      setArticles(res.data || [])
    } catch (err) {
      console.error("Error loading gallery:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading)
    return (
      <div className="page">
        <p>{t("loading")}</p>
      </div>
    )

  return (
    <div className="page hero-bg">
      <h2 className="headline">{t("gallery")}</h2>
      <div className="grid">
        {articles.length === 0 ? (
          <p className="text-muted">No gallery items yet</p>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="col-4">
              <div className="gallery-item">
                {article.imageUrl && (
                  <img
                    src={article.imageUrl || "/placeholder.svg"}
                    alt={article.title}
                    style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8, marginBottom: 12 }}
                  />
                )}
                <h4 style={{ marginBottom: 4 }}>{article.title}</h4>
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 8 }}>
                  {article.date && new Date(article.date).toLocaleDateString()}
                </p>
                <p style={{ fontSize: "0.95rem", marginBottom: 0 }}>
                  {article.excerpt || article.text.substring(0, 80)}...
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
