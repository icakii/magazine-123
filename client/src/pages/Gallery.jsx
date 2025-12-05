"use client"
import { useState, useEffect } from "react"
import { api } from "../lib/api"

const CATEGORIES = ["All", "Photography", "Art", "Travel", "Nature"]

export default function Gallery() {
  const [articles, setArticles] = useState([])
  const [filter, setFilter] = useState("All")

  useEffect(() => {
    api.get("/articles?category=gallery").then(res => setArticles(res.data || [])).catch(()=>{})
  }, [])

  const filtered = filter === "All" ? articles : articles.filter(a => a.articleCategory === filter)

  return (
    <div className="page hero-bg">
      <h2 className="headline">Gallery</h2>
      <div style={{marginBottom: 20}}>
         {CATEGORIES.map(c => <button key={c} onClick={()=>setFilter(c)} className={`btn ${filter===c?"primary":"ghost"}`} style={{marginRight: 10}}>{c}</button>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        {filtered.map((item) => (
           <div key={item.id} className="gallery-item" style={{ position: "relative" }}>
               <img src={item.imageUrl} style={{ width: "100%", height: 400, objectFit: "cover", borderRadius: 8 }} />
               <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", background: "rgba(0,0,0,0.6)", color: "white", padding: "10px", borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                   <p style={{ margin: 0, fontWeight: "bold" }}>{item.author}</p>
                   <p style={{ margin: 0, fontSize: "0.8rem" }}>{new Date(item.date).toLocaleDateString()}</p>
               </div>
           </div>
        ))}
      </div>
    </div>
  )
}