"use client"

import { useEffect, useState } from "react"
// PROMENI TEZI IMPORTI SPORED TVOYA PROEKT:
import NewsletterManager from "../components/NewsletterManager"
import { useAuth } from "../hooks/useAuth"
import { t } from "../lib/i18n"
import { api } from "../lib/api"

export default function Home() {
  const { user } = useAuth()
  const [featured, setFeatured] = useState([])
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    // Teglim statiite za nachalna stranica
    api.get("/articles?category=home")
        .then(res => setFeatured(res.data || []))
        .catch(() => {})
  }, [])

  return (
    <div className="page">
      
      {/* --- NEWSLETTER SECTION (Nai-gore) --- */}
      <NewsletterManager 
        user={user} 
        title="📩 Abonirai se za novini!" 
        text="Budi v krak s nai-novoto v sveta na MIREN. Poluchavai izvestiq za novi statii i subitiq." 
      />

      <div className="hero-bg" style={{padding: '40px 20px', textAlign: 'center', marginBottom: 40}}>
        <h1 className="headline" style={{fontSize: '3rem'}}>{user ? `Welcome, ${user.displayName}!` : t("home_title")}</h1>
        <p className="subhead" style={{fontSize: '1.2rem'}}>{user ? "Explore our latest content." : t("home_sub")}</p>
        
        <div className="btn-group mt-3" style={{justifyContent: 'center'}}>
          {!user && <a className="btn primary" href="/register">{t("start")}</a>}
          <a className="btn ghost" href="/news">Read News</a>
        </div>
      </div>

      {/* Featured Section */}
      {featured.length > 0 && (
        <div className="stack">
          <h3 className="headline">Featured</h3>
          <div className="grid">
            {featured.map(f => (
              <div key={f.id} className="col-6">
                 <div className="card">
                    {f.imageUrl && <img src={f.imageUrl} style={{width:'100%', height: 200, objectFit:'cover', borderRadius:8, marginBottom:12}} alt={f.title} />}
                    <h4>{f.title}</h4>
                    <p>{f.excerpt}</p>
                    <button className="btn outline" onClick={() => setSelectedArticle(f)}>Read More</button>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedArticle && (
        <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedArticle(null)}>×</button>
            <h2 className="headline">{selectedArticle.title}</h2>
            {selectedArticle.imageUrl && <img src={selectedArticle.imageUrl} style={{width:'100%', borderRadius:8, marginBottom:20}} alt={selectedArticle.title} />}
            <div className="modal-text">{selectedArticle.text}</div>
          </div>
        </div>
      )}
    </div>
  )
}