"use client"

import { useEffect, useState } from "react"
import NewsletterManager from "../components/NewsletterManager"
import { useAuth } from "../hooks/useAuth"
import { t } from "../lib/i18n"
import { api } from "../lib/api"
import HeroIntro from "./HeroIntro"
import { clearCart } from "../lib/cart"

export default function Home() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const ok = url.searchParams.get("order_success") === "true"
    if (ok) {
      clearCart()
      document.body.classList.remove("cart-open")

      // махаме query-то, за да не чисти пак при refresh
      url.searchParams.delete("order_success")
      window.history.replaceState({}, "", url.pathname + url.search)
    }
  }, [])

  return (
    <div className="home-shell">
      {/* FULLSCREEN HERO INTRO (always visible at top) */}
      <HeroIntro />

      {/* MAIN SITE CONTENT */}
      <div id="home-main-content" className="page anim-fade-up">
        {/* ✅ IMPORTANT FIX: Target for Hero scroll */}
        <div id="home-newsletter">
          <NewsletterManager user={user} type="static" />
        </div>

        <div
          className="hero-bg anim-zoom-in anim-delay-1"
          style={{ padding: "40px 20px", textAlign: "center", marginBottom: 40 }}
        >
          <h1 className="headline" style={{ fontSize: "3rem" }}>
            {user ? `${t("welcome")}, ${user.displayName}!` : t("home_title")}
          </h1>
          <p className="subhead" style={{ fontSize: "1.2rem" }}>
            {user ? t("home_user_sub") : t("home_sub")}
          </p>

          <div className="btn-group mt-3" style={{ justifyContent: "center" }}>
            {!user && (
              <a className="btn primary" href="/register">
                {t("start")}
              </a>
            )}
            <a className="btn ghost" href="/news">
              {t("read_news")}
            </a>
          </div>
        </div>

        {featured.length > 0 && (
          <div className="stack anim-fade-up anim-delay-2">
            <h3 className="headline">{t("featured")}</h3>
            <div className="grid">
              {featured.map((f) => {
                const isLocked = f.isPremium && !hasSubscription

                return (
                  <div key={f.id} className="col-6 anim-fade-up anim-delay-1">
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
                            {t("premium_content")}
                          </p>
                          <a href="/subscriptions" className="btn primary">
                            {t("subscribe_unlock")}
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
                            color: "var(--text-muted)",
                            fontSize: "0.95rem",
                            marginBottom: 15,
                          }}
                        >
                          {f.excerpt}
                        </p>
                      )}

                      <div style={{ marginTop: "auto" }}>
                        <button
                          className="btn outline"
                          onClick={() => !isLocked && setSelectedArticle(f)}
                          disabled={isLocked}
                        >
                          {t("read_more")}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {selectedArticle && (
          <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedArticle(null)}>
                ×
              </button>
              <h2 className="headline" style={{ textAlign: "center" }}>
                {selectedArticle.title}
              </h2>
              {selectedArticle.imageUrl && (
                <img
                  src={selectedArticle.imageUrl}
                  style={{ width: "100%", borderRadius: 8, marginBottom: 20 }}
                  alt={selectedArticle.title}
                />
              )}
              <div className="modal-text">{selectedArticle.text}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
