"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"

export default function News() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  // State за отворената статия
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    api
      .get("/articles?category=news")
      .then((res) => setArticles(res.data || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><p>Loading...</p></div>

  return (
    <div className="page">
      <h2 className="headline">News</h2>
      <p className="subhead">Latest updates from MIREN</p>

      <div className="stack mt-4">
        {articles.length === 0 ? (
          <p className="text-muted">No news articles yet</p>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="card">
              {article.imageUrl && (
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  style={{ width: "100%", borderRadius: 8, marginBottom: 12, maxHeight: 300, objectFit: "cover" }}
                />
              )}
              <h3 style={{ marginBottom: 8, fontFamily:'Oswald, sans-serif' }}>{article.title}</h3>
              <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: 12 }}>
                {new Date(article.date).toLocaleDateString()} • {article.author}
              </p>
              
              <p style={{marginBottom: 16}}>
                {article.excerpt || article.text.substring(0, 150) + "..."}
              </p>
              
              <button 
                className="btn outline"
                onClick={() => setSelectedArticle(article)}
              >
                Read More
              </button>
            </div>
          ))
        )}
      </div>

      {/* MODAL ЗА ЧЕТЕНЕ НА ЦЕЛИЯ ТЕКСТ */}
      {selectedArticle && (
        <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedArticle(null)}>×</button>
            
            <h2 className="headline" style={{marginTop:0}}>{selectedArticle.title}</h2>
            {selectedArticle.imageUrl && (
               <img src={selectedArticle.imageUrl} style={{width:'100%', borderRadius: 8, marginBottom: 20}} />
            )}
            <div className="modal-text">
              {selectedArticle.text}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}