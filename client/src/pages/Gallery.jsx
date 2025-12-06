"use client"
import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

export default function Gallery() {
  const { hasSubscription } = useAuth()
  const [articles, setArticles] = useState([])

  useEffect(() => {
    api
      .get("/articles?category=gallery")
      .then((res) => setArticles(res.data || []))
      .catch(() => {})
  }, [])

  return (
    <div className="page hero-bg">
      <h2 className="headline">Gallery</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "30px",
        }}
      >
        {articles.map((item) => {
          const isLocked = item.isPremium && !hasSubscription

          return (
            <div
              key={item.id}
              className="gallery-item"
              style={{ position: "relative", overflow: "hidden" }}
            >
              {/* Premium badge */}
              {item.isPremium && (
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

              {/* LOCK overlay */}
              {isLocked && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(4px)",
                    zIndex: 3,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    textAlign: "center",
                    padding: 16,
                  }}
                >
                  <span style={{ fontSize: "2.5rem", marginBottom: 8 }}>🔒</span>
                  <p style={{ marginBottom: 10 }}>Premium Gallery Image</p>
                  <a href="/subscriptions" className="btn primary">
                    Subscribe to view
                  </a>
                </div>
              )}

              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  style={{
                    width: "100%",
                    height: 400,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                  alt={item.title || "Gallery image"}
                />
              )}

              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  background: "rgba(0,0,0,0.6)",
                  color: "white",
                  padding: "10px",
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  zIndex: 1,
                }}
              >
                <p style={{ margin: 0, fontWeight: "bold" }}>
                  {item.author || "MIREN"}
                </p>
                <p style={{ margin: 0, fontSize: "0.8rem" }}>
                  {item.date
                    ? new Date(item.date).toLocaleDateString()
                    : ""}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
