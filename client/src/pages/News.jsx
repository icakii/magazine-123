"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"
import { useNavigate } from "react-router-dom"

const CATEGORIES = ["All", "Fashion", "Art", "Music", "Photography", "Other"]

function categorySlug(cat) {
  const s = String(cat || "other")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
  const allowed = new Set(["all", "fashion", "art", "music", "photography", "other"])
  return allowed.has(s) ? s : "other"
}

export default function News() {
  const { hasSubscription } = useAuth()
  const [articles, setArticles] = useState([])
  const [filter, setFilter] = useState("All")
  const [selectedArticle, setSelectedArticle] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get("/articles?category=news")
      .then((res) => setArticles(res.data || []))
      .catch(() => setArticles([]))
  }, [])
  useEffect(() => {
    if (selectedArticle) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [selectedArticle])

  const filteredArticles = filter === "All" ? articles : articles.filter((a) => a.articleCategory === filter)

  return (
    <div className="page">
      <h2 className="headline">News</h2>

      <div className="news-cat-toolbar" role="tablist" aria-label="Article categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={filter === cat}
            onClick={() => setFilter(cat)}
            className={`news-cat-pill news-cat-pill--${categorySlug(cat)} ${filter === cat ? "is-active" : ""}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {filteredArticles.map((article) => {
          const isLocked = article.isPremium && !hasSubscription
          const tagSlug = categorySlug(article.articleCategory)

          return (
            <div key={article.id} className="card" style={{ position: "relative", display: "flex", flexDirection: "column" }}>
              {article.isPremium && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "var(--oxide-red)",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontWeight: "bold",
                    zIndex: 2,
                  }}
                >
                  🔒 Premium
                </div>
              )}

              {isLocked && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "color-mix(in srgb, var(--bg) 72%, transparent)",
                    backdropFilter: "blur(5px)",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: "3rem" }}>🔒</span>
                  <h3>Premium Content</h3>
                  <button className="btn primary" style={{ marginTop: 10 }} onClick={() => navigate("/subscriptions")} type="button">
                    Subscribe to Read
                  </button>
                </div>
              )}

              {article.imageUrl && (
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  style={{ width: "100%", borderRadius: 8, marginBottom: 12, height: 200, objectFit: "cover" }}
                />
              )}
              <h3>{article.title}</h3>
              <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                {new Date(article.date).toLocaleDateString()} • {article.author}
              </p>

              <div style={{ margin: "8px 0 10px" }}>
                <span className={`article-category-tag article-category-tag--${tagSlug}`}>{article.articleCategory}</span>
              </div>

              <p style={{ flex: 1 }}>{article.excerpt}</p>

              <button className="btn-read-more" onClick={() => !isLocked && setSelectedArticle(article)} disabled={isLocked} type="button">
                Read More
              </button>
            </div>
          )
        })}
      </div>

      {selectedArticle && createPortal(
        <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedArticle(null)} type="button">×</button>
            <h2>{selectedArticle.title}</h2>
            {selectedArticle.imageUrl && <img src={selectedArticle.imageUrl} style={{ width: "100%", borderRadius: 8 }} alt="" />}
            <div className="modal-text" style={{ marginTop: 20 }}>{selectedArticle.text}</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
