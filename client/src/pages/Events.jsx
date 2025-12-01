"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"

export default function Events() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    api
      .get("/articles?category=events")
      .then((res) => setArticles(res.data || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><p>Loading...</p></div>

  return (
    <div className="page">
      <h2 className="headline">Upcoming Events</h2>
      <p className="subhead">Join our community gatherings and workshops.</p>

      <div className="grid mt-4">
        {articles.length === 0 ? (
          <div className="col-12"><p className="text-muted">No upcoming events scheduled.</p></div>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="col-6">
              <div className="card" style={{height: '100%', display:'flex', flexDirection:'column'}}>
                {article.imageUrl && (
                  <img src={article.imageUrl} alt={article.title} style={{ width: "100%", borderRadius: 8, marginBottom: 12, height: 180, objectFit: "cover" }} />
                )}
                <h3 style={{ marginBottom: 8 }}>{article.title}</h3>
                <div style={{flex:1}}>
                   <p>{article.excerpt || article.text.substring(0, 100)}...</p>
                </div>
                <button 
                  className="btn primary mt-3"
                  onClick={() => setSelectedArticle(article)}
                  style={{width:'100%'}}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedArticle && (
        <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedArticle(null)}>×</button>
            <h2 className="headline" style={{marginTop:0}}>{selectedArticle.title}</h2>
            {selectedArticle.imageUrl && <img src={selectedArticle.imageUrl} style={{width:'100%', borderRadius: 8, marginBottom: 20}} />}
            <div className="modal-text">{selectedArticle.text}</div>
          </div>
        </div>
      )}
    </div>
  )
}