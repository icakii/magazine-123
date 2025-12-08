"use client"

import { useEffect, useState } from "react"
import NewsletterManager from "../components/NewsletterManager"
import { useAuth } from "../hooks/useAuth"
import { t } from "../lib/i18n"
import { api } from "../lib/api"
import { Link } from "react-router-dom"

export default function Home() {
  const { user, hasSubscription } = useAuth()
  const [featured, setFeatured] = useState([])
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    // Теглим статиите за начална страница (category=home)
    api
      .get("/articles?category=home")
      .then((res) => setFeatured(res.data || []))
      .catch(() => {})
  }, [])

  return (
    <div className="page anim-fade-up">
      {/* --- NEWSLETTER SECTION --- */}
      <NewsletterManager
        user={user}
        title="📩 Abonirai se za novini!"
        text="Budi v krak s nai-novoto v sveta na MIREN. Poluchavai izvestiq za novi statii i subitiq."
      />

      <div
        className="hero-bg anim-zoom-in anim-delay-1"
        style={{ padding: "40px 20px", textAlign: "center", marginBottom: 40 }}
      >
        <h1 className="headline" style={{ fontSize: "3rem" }}>
          {user ? `Welcome, ${user.displayName}!` : t("home_title")}
        </h1>
        <p className="subhead" style={{ fontSize: "1.2rem" }}>
          {user ? "Explore our latest content." : t("home_sub")}
        </p>

        <div className="btn-group mt-3" style={{ justifyContent: "center" }}>
          {!user && (
            <a className="btn primary" href="/register">
              {t("start")}
            </a>
          )}
          <a className="btn ghost" href="/news">
            Read News
          </a>
        </div>
      </div>

      {/* Featured Section */}
      {featured.length > 0 && (
        <div className="stack anim-fade-up anim-delay-2">
          <h3 className="headline">Featured</h3>
          <div className="grid">
            {featured.map((f, idx) => {
              const isLocked = f.isPremium && !hasSubscription

              return (
                <div key={f.id} className="col-6 anim-fade-up anim-delay-1">
                  {/* КАРТА С ЦЕНТРИРАН ТЕКСТ */}
                  <div
                    className="card"
                    style={{
                      position: "relative",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    {/* Premium badge */}
                    {f.isPremium && (
                      <div
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          background: "#e63946",
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

                    {/* LOCK OVERLAY за free акаунти */}
                    {isLocked && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(255,255,255,0.7)",
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
                        <p style={{ marginTop: 8, marginBottom: 12 }}>
                          Premium content
                        </p>
                        <a href="/subscriptions" className="btn primary">
                          Subscribe to unlock
                        </a>
                      </div>
                    )}

                    {f.imageUrl && (
                      <img
                        src={f.imageUrl}
                        style={{
                          width: "100%",
                          height: 200,
                          objectFit: "cover",
                          borderRadius: 8,
                          marginBottom: 15,
                        }}
                        alt={f.title}
                      />
                    )}

                    <h4 style={{ marginBottom: 12 }}>{f.title}</h4>

                    {f.excerpt && (
                      <p
                        style={{
                          color: "#666",
                          fontSize: "0.95rem",
                          marginBottom: 15,
                        }}
                      >
                        {f.excerpt}
                      </p>
                    )}

                    {/* Бутон – отваря модал САМО ако не е заключено */}
                    <div style={{ marginTop: "auto" }}>
                      <button
                        className="btn outline"
                        onClick={() => !isLocked && setSelectedArticle(f)}
                        disabled={isLocked}
                      >
                        Read More
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL за избран featured article */}
      {selectedArticle && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedArticle(null)}
            >
              ×
            </button>
            <h2 className="headline" style={{ textAlign: "center" }}>
              {selectedArticle.title}
            </h2>
            {selectedArticle.imageUrl && (
              <img
                src={selectedArticle.imageUrl}
                style={{
                  width: "100%",
                  borderRadius: 8,
                  marginBottom: 20,
                }}
                alt={selectedArticle.title}
              />
            )}
            <div className="modal-text">{selectedArticle.text}</div>
          </div>
        </div>
      )}
    </div>
  )
}
