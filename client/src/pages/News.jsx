"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"

const CATEGORIES = ["All", "Fashion", "Art", "Music", "Photography", "Other"]
const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "likes", label: "❤️ Liked" },
  { key: "comments", label: "💬 Discussed" },
]

function categorySlug(cat) {
  const s = String(cat || "other").toLowerCase().replace(/[^a-z]/g, "")
  const allowed = new Set(["all", "fashion", "art", "music", "photography", "other"])
  return allowed.has(s) ? s : "other"
}

/* ── Comment conversation popup ── */
function CommentConversation({ article, user, navigate, onClose, onCommentAdded }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)
  const [err, setErr] = useState("")
  const bottomRef = useRef()
  const textareaRef = useRef()

  useEffect(() => {
    api.get(`/articles/${article.id}/comments`).then(r => setComments(r.data || [])).catch(() => {})
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [article.id])

  async function post(e) {
    e.preventDefault()
    if (!user) return navigate("/login")
    if (!text.trim() || posting) return
    setPosting(true); setErr("")
    try {
      const res = await api.post(`/articles/${article.id}/comments`, { content: text.trim() })
      const newComment = res.data
      setComments(prev => [...prev, newComment])
      setText("")
      onCommentAdded(article.id)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80)
    } catch (e) {
      setErr(e?.response?.data?.error || "Грешка при изпращане.")
    } finally { setPosting(false) }
  }

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg, #111)", borderRadius: 20, width: "100%", maxWidth: 500, height: "min(600px, 90vh)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)", lineHeight: 1.2 }}>💬 Коментари</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text)", opacity: 0.4, marginTop: 2 }}>{article.title?.slice(0,45)}{article.title?.length > 45 ? "…" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 30, height: 30, color: "var(--text)", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {comments.length === 0 && (
            <div style={{ textAlign: "center", marginTop: "3rem", color: "var(--text)", opacity: 0.35 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: "0.88rem" }}>Бъди първият, който коментира.</div>
            </div>
          )}
          {comments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--oxide-red, #c46a4a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.82rem", flexShrink: 0, marginTop: 2 }}>
                {(c.display_name || c.username || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0 14px 14px 14px", padding: "9px 13px" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--oxide-red, #c46a4a)", marginBottom: 3 }}>
                    {c.display_name || c.username || "Потребител"}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.55, wordBreak: "break-word" }}>{c.content}</p>
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text)", opacity: 0.35, marginTop: 3, paddingLeft: 4 }}>{new Date(c.created_at).toLocaleDateString("bg-BG")}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* input */}
        <div style={{ padding: "10px 14px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {user ? (
            <form onSubmit={post} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--oxide-red, #c46a4a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.82rem", flexShrink: 0, marginBottom: 2 }}>
                {(user.displayName || user.email || "?")[0].toUpperCase()}
              </div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(e) } }}
                placeholder="Напиши коментар... (Enter за изпращане)"
                rows={1}
                maxLength={600}
                style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "9px 14px", color: "var(--text)", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.5, transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "var(--oxide-red, #c46a4a)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px" }}
              />
              <button
                type="submit"
                disabled={posting || !text.trim()}
                style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: text.trim() ? "var(--oxide-red, #c46a4a)" : "rgba(255,255,255,0.08)", color: "#fff", cursor: text.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", flexShrink: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
          ) : (
            <button onClick={() => navigate("/login")} style={{ width: "100%", padding: "11px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
              Влез за да коментираш
            </button>
          )}
          {err && <p style={{ color: "#ef4444", fontSize: "0.78rem", margin: "6px 0 0 44px" }}>{err}</p>}
        </div>
      </div>
    </div>,
    document.body
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
            {st.comments_count || 0} Коментари
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function News() {
  const { user, hasSubscription } = useAuth()
  const [articles, setArticles] = useState([])
  const [statsMap, setStatsMap] = useState({})
  const [filter, setFilter] = useState("All")
  const [sort, setSort] = useState("newest")
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [commentPopup, setCommentPopup] = useState(null)
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
    document.body.style.overflow = selectedArticle || commentPopup ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [selectedArticle, commentPopup])

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

      {/* Category pills */}
      <div className="news-cat-toolbar" role="tablist">
        {CATEGORIES.map(cat => (
          <button key={cat} type="button" role="tab" aria-selected={filter === cat} onClick={() => setFilter(cat)}
            className={`news-cat-pill news-cat-pill--${categorySlug(cat)} ${filter === cat ? "is-active" : ""}`}>{cat}</button>
        ))}
      </div>

      {/* Sort bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {SORTS.map(s => (
          <button key={s.key} type="button" onClick={() => setSort(s.key)} style={{ padding: "6px 16px", borderRadius: 999, border: "1.5px solid", borderColor: sort === s.key ? "var(--oxide-red, #c46a4a)" : "rgba(255,255,255,0.12)", background: sort === s.key ? "rgba(196,106,74,0.15)" : "rgba(255,255,255,0.04)", color: sort === s.key ? "var(--oxide-red, #c46a4a)" : "var(--text)", fontSize: "0.82rem", fontWeight: sort === s.key ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>{s.label}</button>
        ))}
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
                <div style={{ position: "absolute", top: 10, right: 10, background: "var(--oxide-red)", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700, zIndex: 4, fontSize: "0.78rem" }}>🔒 Premium</div>
              )}
              {isLocked && (
                <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--bg) 72%, transparent)", backdropFilter: "blur(5px)", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                  <span style={{ fontSize: "3rem" }}>🔒</span>
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

              {/* bottom action bar — only here, no duplicate above */}
              <div style={{ display: "flex", gap: 6, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10, marginTop: "auto" }} onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={e => toggleLike(e, article)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 999, border: "none", background: st.user_liked ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)", color: st.user_liked ? "#ef4444" : "var(--text)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, transition: "all 0.15s" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={st.user_liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {st.likes || 0}
                </button>
                <button
                  type="button"
                  onClick={e => toggleSave(e, article)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 999, border: "none", background: st.user_saved ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.06)", color: st.user_saved ? "#818cf8" : "var(--text)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, transition: "all 0.15s" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={st.user_saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  {st.saves || 0}
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setCommentPopup(article) }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 999, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--text)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, transition: "all 0.15s" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {st.comments_count || 0}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(article)}
                  style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.12)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, transition: "all 0.15s" }}
                >
                  Прочети →
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} user={user} navigate={navigate} statsMap={statsMap} onStatsUpdate={updateStats} onOpenComments={a => { setSelectedArticle(null); setCommentPopup(a) }} />
      )}

      {commentPopup && (
        <CommentConversation
          article={commentPopup}
          user={user}
          navigate={navigate}
          onClose={() => setCommentPopup(null)}
          statsMap={statsMap}
          onCommentAdded={id => updateStats(id, s => ({ ...s, comments_count: (s.comments_count || 0) + 1 }))}
        />
      )}
    </div>
  )
}
