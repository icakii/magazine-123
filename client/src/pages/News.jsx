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

function HeartIcon({ filled, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
function BookmarkIcon({ filled, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function CommentIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/* ── Comment popup ── */
function CommentPopup({ article, user, navigate, onClose, statsMap, onStatsUpdate }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)
  const [err, setErr] = useState("")
  const textareaRef = useRef()

  useEffect(() => {
    api.get(`/articles/${article.id}/comments`).then(r => setComments(r.data || [])).catch(() => {})
    setTimeout(() => textareaRef.current?.focus(), 80)
  }, [article.id])

  async function post(e) {
    e.preventDefault()
    if (!user) return navigate("/login")
    if (!text.trim()) return
    setPosting(true); setErr("")
    try {
      const res = await api.post(`/articles/${article.id}/comments`, { content: text.trim() })
      setComments(prev => [res.data, ...prev])
      onStatsUpdate(article.id, s => ({ ...s, comments_count: (s.comments_count || 0) + 1 }))
      setText("")
    } catch (e) {
      setErr(e?.response?.data?.error || "Грешка при изпращане.")
    } finally {
      setPosting(false) }
  }

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 0 0" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg, #111)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 580, maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 -8px 40px rgba(0,0,0,0.4)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px" }}>
          <div>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.15)", margin: "0 auto 10px" }} />
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
              Коментари · {article.title?.slice(0, 30)}{article.title?.length > 30 ? "…" : ""}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text)", opacity: 0.5, fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* comment list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 12px" }}>
          {comments.length === 0 && <p style={{ color: "var(--text)", opacity: 0.4, fontSize: "0.88rem", textAlign: "center", margin: "1.5rem 0" }}>Все още няма коментари.</p>}
          {comments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--oxide-red, #c46a4a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", flexShrink: 0 }}>
                {(c.display_name || c.username || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)" }}>{c.display_name || c.username || "Потребител"}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text)", opacity: 0.4 }}>{new Date(c.created_at).toLocaleDateString("bg-BG")}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text)", opacity: 0.85, lineHeight: 1.5, wordBreak: "break-word" }}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* input bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 16px" }}>
          {user ? (
            <form onSubmit={post} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Напиши коментар..."
                rows={1}
                maxLength={600}
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", color: "var(--text)", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.5 }}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px" }}
              />
              <button
                type="submit"
                disabled={posting || !text.trim()}
                style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "var(--oxide-red, #c46a4a)", color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: posting ? "not-allowed" : "pointer", opacity: posting || !text.trim() ? 0.5 : 1, flexShrink: 0 }}
              >
                {posting ? "…" : "Изпрати"}
              </button>
            </form>
          ) : (
            <button onClick={() => navigate("/login")} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
              Влез за да коментираш
            </button>
          )}
          {err && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "6px 0 0" }}>{err}</p>}
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Article modal (no comments, just like/save) ── */
function ArticleModal({ article, onClose, user, navigate, statsMap, onStatsUpdate, onOpenComments }) {
  const st = statsMap[article.id] || {}

  async function toggleLike() {
    if (!user) return navigate("/login")
    const liked = st.user_liked
    onStatsUpdate(article.id, s => ({ ...s, likes: liked ? s.likes - 1 : s.likes + 1, user_liked: !liked }))
    try {
      if (liked) await api.delete(`/articles/${article.id}/like`)
      else await api.post(`/articles/${article.id}/like`)
    } catch {
      onStatsUpdate(article.id, s => ({ ...s, likes: liked ? s.likes + 1 : s.likes - 1, user_liked: liked }))
    }
  }

  async function toggleSave() {
    if (!user) return navigate("/login")
    const saved = st.user_saved
    onStatsUpdate(article.id, s => ({ ...s, saves: saved ? s.saves - 1 : s.saves + 1, user_saved: !saved }))
    try {
      if (saved) await api.delete(`/articles/${article.id}/save`)
      else await api.post(`/articles/${article.id}/save`)
    } catch {
      onStatsUpdate(article.id, s => ({ ...s, saves: saved ? s.saves + 1 : s.saves - 1, user_saved: saved }))
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 680, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button">×</button>
        <h2 style={{ marginBottom: 4 }}>{article.title}</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text)", opacity: 0.5, marginBottom: "1rem" }}>
          {new Date(article.date).toLocaleDateString()} · {article.author}
        </p>
        {article.imageUrl && <img src={article.imageUrl} style={{ width: "100%", borderRadius: 10, marginBottom: 16 }} alt="" />}
        <div className="modal-text" style={{ marginBottom: 20 }}>{article.text}</div>

        {/* social bar */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
          <button
            type="button"
            onClick={toggleLike}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, border: "none", background: st.user_liked ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)", color: st.user_liked ? "#ef4444" : "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem", transition: "all 0.15s" }}
          >
            <HeartIcon filled={st.user_liked} size={17} /> {st.likes || 0}
          </button>
          <button
            type="button"
            onClick={toggleSave}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, border: "none", background: st.user_saved ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.06)", color: st.user_saved ? "#818cf8" : "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem", transition: "all 0.15s" }}
          >
            <BookmarkIcon filled={st.user_saved} size={17} /> {st.saves || 0}
          </button>
          <button
            type="button"
            onClick={() => onOpenComments(article)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem", transition: "all 0.15s" }}
          >
            <CommentIcon size={17} /> {st.comments_count || 0} Коментари
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Card social hover buttons ── */
function CardSocial({ article, user, navigate, statsMap, onStatsUpdate, onOpenComments }) {
  const st = statsMap[article.id] || {}

  async function toggleLike(e) {
    e.stopPropagation()
    if (!user) return navigate("/login")
    const liked = st.user_liked
    onStatsUpdate(article.id, s => ({ ...s, likes: liked ? s.likes - 1 : s.likes + 1, user_liked: !liked }))
    try {
      if (liked) await api.delete(`/articles/${article.id}/like`)
      else await api.post(`/articles/${article.id}/like`)
    } catch {
      onStatsUpdate(article.id, s => ({ ...s, likes: liked ? s.likes + 1 : s.likes - 1, user_liked: liked }))
    }
  }

  async function toggleSave(e) {
    e.stopPropagation()
    if (!user) return navigate("/login")
    const saved = st.user_saved
    onStatsUpdate(article.id, s => ({ ...s, saves: saved ? s.saves - 1 : s.saves + 1, user_saved: !saved }))
    try {
      if (saved) await api.delete(`/articles/${article.id}/save`)
      else await api.post(`/articles/${article.id}/save`)
    } catch {
      onStatsUpdate(article.id, s => ({ ...s, saves: saved ? s.saves + 1 : s.saves - 1, user_saved: saved }))
    }
  }

  return (
    <div className="card-social-hover">
      <button className={`card-social-btn${st.user_liked ? " card-social-btn--liked" : ""}`} onClick={toggleLike} title="Like" type="button">
        <HeartIcon filled={st.user_liked} size={15} />
        <span>{st.likes || 0}</span>
      </button>
      <button className={`card-social-btn${st.user_saved ? " card-social-btn--saved" : ""}`} onClick={toggleSave} title="Save" type="button">
        <BookmarkIcon filled={st.user_saved} size={15} />
        <span>{st.saves || 0}</span>
      </button>
      <button
        className="card-social-btn"
        type="button"
        title="Comment"
        onClick={e => { e.stopPropagation(); onOpenComments(article) }}
      >
        <CommentIcon size={15} />
        <span>{st.comments_count || 0}</span>
      </button>
    </div>
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
          <button
            key={cat} type="button" role="tab" aria-selected={filter === cat}
            onClick={() => setFilter(cat)}
            className={`news-cat-pill news-cat-pill--${categorySlug(cat)} ${filter === cat ? "is-active" : ""}`}
          >{cat}</button>
        ))}
      </div>

      {/* Sort bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {SORTS.map(s => (
          <button
            key={s.key} type="button"
            onClick={() => setSort(s.key)}
            style={{
              padding: "6px 16px", borderRadius: 999, border: "1.5px solid",
              borderColor: sort === s.key ? "var(--oxide-red, #c46a4a)" : "rgba(255,255,255,0.12)",
              background: sort === s.key ? "rgba(196,106,74,0.15)" : "rgba(255,255,255,0.04)",
              color: sort === s.key ? "var(--oxide-red, #c46a4a)" : "var(--text)",
              fontSize: "0.82rem", fontWeight: sort === s.key ? 700 : 500,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {sorted.map(article => {
          const isLocked = article.isPremium && !hasSubscription
          const tagSlug = categorySlug(article.articleCategory)
          const st = statsMap[article.id] || {}

          return (
            <div
              key={article.id}
              className="card news-card"
              style={{ position: "relative", display: "flex", flexDirection: "column", cursor: isLocked ? "default" : "pointer" }}
              onClick={() => !isLocked && setSelectedArticle(article)}
            >
              {article.isPremium && (
                <div style={{ position: "absolute", top: 10, right: 10, background: "var(--oxide-red)", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700, zIndex: 2, fontSize: "0.78rem" }}>
                  🔒 Premium
                </div>
              )}

              {isLocked && (
                <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--bg) 72%, transparent)", backdropFilter: "blur(5px)", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                  <span style={{ fontSize: "3rem" }}>🔒</span>
                  <h3>Premium Content</h3>
                  <button className="btn primary" style={{ marginTop: 10 }} onClick={() => navigate("/subscriptions")} type="button">Subscribe</button>
                </div>
              )}

              {article.imageUrl && (
                <div style={{ position: "relative", overflow: "hidden", borderRadius: 8, marginBottom: 12 }}>
                  <img src={article.imageUrl} alt={article.title} style={{ width: "100%", height: 200, objectFit: "cover", display: "block", transition: "transform 0.3s" }} />
                  {/* hover social overlay on image */}
                  {!isLocked && (
                    <CardSocial article={article} user={user} navigate={navigate} statsMap={statsMap} onStatsUpdate={updateStats} onOpenComments={setCommentPopup} />
                  )}
                </div>
              )}

              <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem" }}>{article.title}</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text)", opacity: 0.5, margin: "0 0 8px" }}>
                {new Date(article.date).toLocaleDateString()} · {article.author}
              </p>

              <div style={{ marginBottom: 10 }}>
                <span className={`article-category-tag article-category-tag--${tagSlug}`}>{article.articleCategory}</span>
              </div>

              <p style={{ flex: 1, fontSize: "0.9rem", margin: "0 0 12px", opacity: 0.8 }}>{article.excerpt}</p>

              {/* stats row at bottom */}
              <div style={{ display: "flex", gap: 14, alignItems: "center", opacity: 0.5, fontSize: "0.8rem", color: "var(--text)", marginTop: "auto" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><HeartIcon filled={st.user_liked} /> {st.likes || 0}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CommentIcon /> {st.comments_count || 0}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BookmarkIcon filled={st.user_saved} /> {st.saves || 0}</span>
              </div>
            </div>
          )
        })}
      </div>

      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          user={user}
          navigate={navigate}
          statsMap={statsMap}
          onStatsUpdate={updateStats}
          onOpenComments={(a) => { setSelectedArticle(null); setCommentPopup(a) }}
        />
      )}

      {commentPopup && (
        <CommentPopup
          article={commentPopup}
          user={user}
          navigate={navigate}
          onClose={() => setCommentPopup(null)}
          statsMap={statsMap}
          onStatsUpdate={updateStats}
        />
      )}
    </div>
  )
}
