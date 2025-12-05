"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

const CATEGORIES = ["All", "Music", "Art", "Business", "Culture"]

export default function Events() {
  const { user, hasSubscription } = useAuth()
  const [articles, setArticles] = useState([])
  const [filter, setFilter] = useState("All")
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    api.get("/articles?category=events")
      .then((res) => setArticles(res.data || []))
      .catch(() => setArticles([]))
  }, [])

  const handleReminder = (title) => {
     if(!user) return alert("Please login to set reminders.")
     // API Call simulation
     alert(`✅ Reminder set! We will email you 1 day before "${title}".`)
  }

  const filtered = filter === "All" ? articles : articles.filter(a => a.articleCategory === filter)

  return (
    <div className="page">
      <h2 className="headline">Upcoming Events</h2>
      
      {/* Filter */}
      <div style={{ marginBottom: 20 }}>
         {CATEGORIES.map(c => <button key={c} onClick={()=>setFilter(c)} className={`btn ${filter===c?"primary":"ghost"}`} style={{marginRight: 10}}>{c}</button>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {filtered.map((article) => {
           const isLocked = article.isPremium && !hasSubscription;

           return (
            <div key={article.id} className="card" style={{ position: "relative" }}>
               {isLocked && (
                  <div style={{ position: "absolute", inset:0, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <a href="/subscriptions" className="btn primary">🔒 Subscribe to join</a>
                  </div>
               )}

               {article.imageUrl && <img src={article.imageUrl} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8 }} />}
               
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginTop: 10 }}>
                   <div>
                       <h3 style={{margin:0}}>{article.title}</h3>
                       <p className="text-muted">{new Date(article.date).toLocaleDateString()} @ {article.time || "TBA"} • {article.author}</p>
                   </div>
                   <button onClick={() => handleReminder(article.title)} style={{ fontSize: "1.2rem", border: "none", background: "none", cursor: "pointer" }} title="Set Reminder">⏰</button>
               </div>

               <p style={{ marginTop: 10 }}>{article.excerpt}</p>
               <button className="btn outline" style={{width:"100%", marginTop:10}} onClick={() => setSelectedArticle(article)}>Read More</button>
            </div>
           )
        })}
      </div>

      {/* Modal Logic (same as others) */}
      {selectedArticle && (
        <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
           <div className="modal-content">
              <h2>{selectedArticle.title}</h2>
              <p>{selectedArticle.text}</p>
           </div>
        </div>
      )}
    </div>
  )
}