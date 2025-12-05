"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"
import { useNavigate } from "react-router-dom"

const CATEGORIES = ["All", "Sports", "E-Sports", "Photography", "Lifestyle", "Art", "Music", "Movies & Series", "Business", "Science", "Culture", "Health & Fitness", "Travel"]

export default function News() {
  const { user, hasSubscription } = useAuth() // Assume user has hasSubscription boolean
  const [articles, setArticles] = useState([])
  const [filter, setFilter] = useState("All")
  const [selectedArticle, setSelectedArticle] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get("/articles?category=news")
      .then((res) => setArticles(res.data || []))
      .catch(() => setArticles([]))
  }, [])

  const filteredArticles = filter === "All" 
    ? articles 
    : articles.filter(a => a.articleCategory === filter)

  return (
    <div className="page">
      <h2 className="headline">News</h2>
      
      {/* Category Filter - FLEX WRAP FIX */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {CATEGORIES.map(cat => (
            <button 
                key={cat} 
                onClick={() => setFilter(cat)}
                className={`btn ${filter === cat ? "primary" : "ghost"}`}
                style={{ padding: "5px 15px", fontSize: "0.9rem" }}
            >
                {cat}
            </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {filteredArticles.map((article) => {
           const isLocked = article.isPremium && !hasSubscription;

           return (
            <div key={article.id} className="card" style={{ position: "relative", display: "flex", flexDirection: "column" }}>
              
              {/* Premium Label */}
              {article.isPremium && (
                  <div style={{ position: "absolute", top: 10, right: 10, background: "#e63946", color: "white", padding: "2px 8px", borderRadius: 4, fontWeight: "bold", zIndex: 2 }}>
                      🔒 Premium
                  </div>
              )}

              {/* Blur Overlay if Locked */}
              {isLocked && (
                  <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(5px)", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                      <span style={{ fontSize: "3rem" }}>🔒</span>
                      <h3>Premium Content</h3>
                      <button 
                        className="btn primary" 
                        style={{ marginTop: 10 }}
                        onClick={() => navigate("/subscriptions")}
                      >
                          Subscribe to Read
                      </button>
                  </div>
              )}

              {article.imageUrl && (
                <img src={article.imageUrl} alt={article.title} style={{ width: "100%", borderRadius: 8, marginBottom: 12, height: 200, objectFit: "cover" }} />
              )}
              <h3>{article.title}</h3>
              <p className="text-muted" style={{ fontSize: "0.9rem" }}>{new Date(article.date).toLocaleDateString()} • {article.author}</p>
              
              {/* Category Tag */}
              <div style={{margin: "5px 0"}}>
                  <span style={{fontSize: "0.8rem", background: "#eee", padding: "2px 6px", borderRadius: 4}}>{article.articleCategory}</span>
              </div>

              <p style={{flex: 1}}>{article.excerpt}</p>
              
              <button className="btn outline" style={{marginTop: 15}} onClick={() => !isLocked && setSelectedArticle(article)} disabled={isLocked}>
                Read More
              </button>
            </div>
           )
        })}
      </div>

      {/* Modal View */}
      {selectedArticle && (
        <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedArticle(null)}>×</button>
            <h2>{selectedArticle.title}</h2>
            {selectedArticle.imageUrl && <img src={selectedArticle.imageUrl} style={{width:'100%', borderRadius:8}} />}
            <div className="modal-text" style={{marginTop: 20}}>{selectedArticle.text}</div>
          </div>
        </div>
      )}
    </div>
  )
}