"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import { CommentConversation, LikersPopup, ArticleActionBar } from "../components/ArticleSocial"

const CATEGORIES = ["All", "Fashion", "Art", "Music", "Photography", "Other"]
const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "likes", label: "Most liked" },
  { key: "comments", label: "Most discussed" },
]

function categorySlug(cat) {
  const s = String(cat || "other").toLowerCase().replace(/[^a-z]/g, "")
  const allowed = new Set(["all", "fashion", "art", "music", "photography", "other"])
  return allowed.has(s) ? s : "other"
}

/* ── Sort dropdown ── */
function SortDropdown({ sort, setSort }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const currentLabel = SORTS.find(s => s.key === sort)?.label || "Sort"

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 7, padding: "7px 16px",
          borderRadius: 999, border: "1.5px solid",
          borderColor: open ? "var(--oxide-red, #c46a4a)" : "rgba(255,255,255,0.12)",
          background: open ? "rgba(196,106,74,0.12)" : "rgba(255,255,255,0.04)",
          color: open ? "var(--oxide-red, #c46a4a)" : "var(--text)",
          fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg>
        {currentLabel}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      <div style={{
        position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 180,
        background: "var(--bg, #111)", borderRadius: 14,
        border: "1.5px solid rgba(255,255,255,0.1)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        overflow: "hidden", zIndex: 200,
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.18s ease, transform 0.18s ease",
        transformOrigin: "top left",
      }}>
        {SORTS.map((s, i) => (
          <button
            key={s.key} type="button"
            onClick={() => { setSort(s.key); setOpen(false) }}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 8, padding: "10px 14px", background: "transparent", border: "none",
              borderBottom: i < SORTS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              color: sort === s.key ? "var(--oxide-red, #c46a4a)" : "var(--text)",
              fontWeight: sort === s.key ? 700 : 500, fontSize: "0.87rem",
              cursor: "pointer", textAlign: "left",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {s.label}
            {sort === s.key && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Article read modal ── */
function ArticleModal({ article, onClose, user, navigate, statsMap, onStatsUpdate, onOpenComments }) {
  const st = statsMap[article.id] || {}

  async function toggleLike() {
    if (!user) return navigate("/login")
    const liked = st.user_liked
    onStatsUpdate(article.id, s => ({ ...s, likes: liked ? s.likes - 1 : s.likes + 1, user_liked: !liked }))
    try {
      if (liked) await api.delete(`/articles/${article.id}/like`)
      else await api.post(`/articles/${article.id}/like`)
    } catch { onStatsUpdate(article.id, s => ({ ...s, likes: liked ? s.likes + 1 : s.likes - 1, user_liked: liked })) }
  }

  async function toggleSave() {
    if (!user) return navigate("/login")
    const saved = st.user_saved
    onStatsUpdate(article.id, s => ({ ...s, saves: saved ? s.saves - 1 : s.saves + 1, user_saved: !saved }))
    try {
      if (saved) await api.delete(`/articles/${article.id}/save`)
      else await api.post(`/articles/${article.id}/save`)
    } catch { onStatsUpdate(article.id, s => ({ ...s, saves: saved ? s.saves + 1 : s.saves - 1, user_saved: saved })) }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 680, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button">×</button>
        <h2 style={{ marginBottom: 4 }}>{article.title}</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text)", opacity: 0.5, marginBottom: "1rem" }}>{new Date(article.date).toLocaleDateString()} · {article.author}</p>
        {article.imageUrl && <img src={article.imageUrl} style={{ width: "100%", borderRadius: 10, marginBottom: 16 }} alt="" />}
        <div className="modal-text" style={{ marginBottom: 24 }}>{article.text}</div>
        <div style={{ display: "flex", gap: 8, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
          <button onClick={toggleLike} type="button" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 999, border: "none", background: st.user_liked ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.07)", color: st.user_liked ? "#ef4444" : "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.15s" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={st.user_liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {st.likes || 0}
          </button>
          <button onClick={toggleSave} type="button" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 999, border: "none", background: st.user_saved ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.07)", color: st.user_saved ? "#818cf8" : "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.15s" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={st.user_saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            {st.saves || 0}
          </button>
          <button onClick={() => { onClose(); onOpenComments(article) }} type="button" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 999, border: "none", background: "rgba(255,255,255,0.07)", color: "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.15s" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {st.comments_count || 0} Comments
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function News() {
  const { user, hasSubscription } = useAuth()
  const isAdmin = user?.isAdmin
  const [articles, setArticles] = useState([])
  const [statsMap, setStatsMap] = useState({})
  const [filter, setFilter] = useState("All")
  const [sort, setSort] = useState("newest")
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [commentPopup, setCommentPopup] = useState(null)
  const [likersPopup, setLikersPopup] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get("/articles?category=news")
      .then(res => {
        const data = res.data || []
        setArticles(data)
        data.forEach(a => {
          api.get(`/articles/${a.id}/stats`).then(r => {
            setStatsMap(prev => ({ ...prev, [a.id]: r.data || {} }))
          }).catch(() => {})
        })
      })
      .catch(() => setArticles([]))
  }, [])

  useEffect(() => {
    document.body.style.overflow = selectedArticle || commentPopup || likersPopup ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [selectedArticle, commentPopup, likersPopup])

  function updateStats(id, updater) {
    setStatsMap(prev => ({ ...prev, [id]: updater(prev[id] || {}) }))
  }

  async function toggleLike(e, article) {
    e.stopPropagation()
    if (!user) return navigate("/login")
    const st = statsMap[article.id] || {}
    const liked = st.user_liked
    updateStats(article.id, s => ({ ...s, likes: liked ? (s.likes||0) - 1 : (s.likes||0) + 1, user_liked: !liked }))
    try {
      if (liked) await api.delete(`/articles/${article.id}/like`)
      else await api.post(`/articles/${article.id}/like`)
    } catch {
      updateStats(article.id, s => ({ ...s, likes: liked ? (s.likes||0) + 1 : (s.likes||0) - 1, user_liked: liked }))
    }
  }

  async function toggleSave(e, article) {
    e.stopPropagation()
    if (!user) return navigate("/login")
    const st = statsMap[article.id] || {}
    const saved = st.user_saved
    updateStats(article.id, s => ({ ...s, saves: saved ? (s.saves||0) - 1 : (s.saves||0) + 1, user_saved: !saved }))
    try {
      if (saved) await api.delete(`/articles/${article.id}/save`)
      else await api.post(`/articles/${article.id}/save`)
    } catch {
      updateStats(article.id, s => ({ ...s, saves: saved ? (s.saves||0) + 1 : (s.saves||0) - 1, user_saved: saved }))
    }
  }

  const filtered = filter === "All" ? articles : articles.filter(a => a.articleCategory === filter)
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "newest") return new Date(b.date) - new Date(a.date)
    if (sort === "oldest") return new Date(a.date) - new Date(b.date)
    if (sort === "likes") return (statsMap[b.id]?.likes || 0) - (statsMap[a.id]?.likes || 0)
    if (sort === "comments") return (statsMap[b.id]?.comments_count || 0) - (statsMap[a.id]?.comments_count || 0)
    return 0
  })

  return (
    <div className="page">
      <h2 className="headline">News</h2>

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div className="news-cat-toolbar" role="tablist" style={{ flex: 1, margin: 0 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} type="button" role="tab" aria-selected={filter === cat} onClick={() => setFilter(cat)}
              className={`news-cat-pill news-cat-pill--${categorySlug(cat)} ${filter === cat ? "is-active" : ""}`}>{cat}</button>
          ))}
        </div>
        <SortDropdown sort={sort} setSort={setSort} />
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {sorted.map(article => {
          const isLocked = article.isPremium && !hasSubscription
          const tagSlug = categorySlug(article.articleCategory)
          const st = statsMap[article.id] || {}

          return (
            <div
              key={article.id}
              className="card news-card"
              style={{ position: "relative", display: "flex", flexDirection: "column", cursor: isLocked ? "default" : "pointer", overflow: "hidden" }}
              onClick={() => !isLocked && setSelectedArticle(article)}
            >
              {article.isPremium && (
                <div style={{ position: "absolute", top: 10, right: 10, background: "var(--oxide-red)", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700, zIndex: 4, fontSize: "0.78rem" }}>Premium</div>
              )}
              {isLocked && (
                <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--bg) 72%, transparent)", backdropFilter: "blur(5px)", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                  <h3>Premium Content</h3>
                  <button className="btn primary" style={{ marginTop: 10 }} onClick={() => navigate("/subscriptions")} type="button">Subscribe</button>
                </div>
              )}

              {article.imageUrl && (
                <img src={article.imageUrl} alt={article.title} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8, marginBottom: 12, display: "block" }} />
              )}

              <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem", lineHeight: 1.3 }}>{article.title}</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text)", opacity: 0.5, margin: "0 0 8px" }}>
                {new Date(article.date).toLocaleDateString()} · {article.author}
              </p>
              <div style={{ marginBottom: 10 }}>
                <span className={`article-category-tag article-category-tag--${tagSlug}`}>{article.articleCategory}</span>
              </div>
              <p style={{ flex: 1, fontSize: "0.9rem", margin: "0 0 14px", opacity: 0.8, lineHeight: 1.55 }}>{article.excerpt}</p>

              <ArticleActionBar
                article={article} st={st} user={user} navigate={navigate}
                onToggleLike={toggleLike} onToggleSave={toggleSave}
                onComment={a => setCommentPopup(a)}
                onRead={a => setSelectedArticle(a)}
                onLikersOpen={id => setLikersPopup(id)}
              />
            </div>
          )
        })}
      </div>

      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} user={user} navigate={navigate} statsMap={statsMap} onStatsUpdate={updateStats} onOpenComments={a => { setSelectedArticle(null); setCommentPopup(a) }} />
      )}

      {commentPopup && (
        <CommentConversation
          article={commentPopup} user={user} navigate={navigate}
          onClose={() => setCommentPopup(null)} isAdmin={isAdmin}
          onCommentAdded={id => updateStats(id, s => ({ ...s, comments_count: (s.comments_count || 0) + 1 }))}
        />
      )}

      {likersPopup !== null && <LikersPopup articleId={likersPopup} onClose={() => setLikersPopup(null)} />}
    </div>
  )
}
