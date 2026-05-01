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
  { key: "likes", label: "Most Liked" },
  { key: "comments", label: "Most Discussed" },
]

function categorySlug(cat) {
  const s = String(cat || "other").toLowerCase().replace(/[^a-z]/g, "")
  const allowed = new Set(["all", "fashion", "art", "music", "photography", "other"])
  return allowed.has(s) ? s : "other"
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function BookmarkIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ArticleModal({ article, onClose, user, navigate }) {
  const [stats, setStats] = useState({ likes: 0, saves: 0, comments_count: 0, user_liked: false, user_saved: false })
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState("")
  const [posting, setPosting] = useState(false)
  const [commentErr, setCommentErr] = useState("")
  const textareaRef = useRef()

  useEffect(() => {
    api.get(`/articles/${article.id}/stats`).then((r) => setStats(r.data || {})).catch(() => {})
    api.get(`/articles/${article.id}/comments`).then((r) => setComments(r.data || [])).catch(() => {})
  }, [article.id])

  async function toggleLike() {
    if (!user) return navigate("/login")
    const liked = stats.user_liked
    setStats((s) => ({ ...s, likes: liked ? s.likes - 1 : s.likes + 1, user_liked: !liked }))
    try {
      if (liked) await api.delete(`/articles/${article.id}/like`)
      else await api.post(`/articles/${article.id}/like`)
    } catch {
      setStats((s) => ({ ...s, likes: liked ? s.likes + 1 : s.likes - 1, user_liked: liked }))
    }
  }

  async function toggleSave() {
    if (!user) return navigate("/login")
    const saved = stats.user_saved
    setStats((s) => ({ ...s, saves: saved ? s.saves - 1 : s.saves + 1, user_saved: !saved }))
    try {
      if (saved) await api.delete(`/articles/${article.id}/save`)
      else await api.post(`/articles/${article.id}/save`)
    } catch {
      setStats((s) => ({ ...s, saves: saved ? s.saves + 1 : s.saves - 1, user_saved: saved }))
    }
  }

  async function postComment(e) {
    e.preventDefault()
    if (!user) return navigate("/login")
    if (!commentText.trim()) return
    setPosting(true)
    setCommentErr("")
    try {
      const res = await api.post(`/articles/${article.id}/comments`, { content: commentText.trim() })
      setComments((prev) => [res.data, ...prev])
      setStats((s) => ({ ...s, comments_count: s.comments_count + 1 }))
      setCommentText("")
    } catch (err) {
      setCommentErr(err?.response?.data?.error || "Грешка при изпращане.")
    } finally {
      setPosting(false)
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-content--article" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button">×</button>

        <h2 style={{ marginBottom: "0.5rem" }}>{article.title}</h2>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
          {new Date(article.date).toLocaleDateString()} · {article.author}
        </p>

        {article.imageUrl && (
          <img src={article.imageUrl} style={{ width: "100%", borderRadius: 10, marginBottom: 16 }} alt="" />
        )}

        <div className="modal-text" style={{ marginBottom: 20 }}>{article.text}</div>

        {/* Social bar */}
        <div className="article-social-bar">
          <button
            type="button"
            className={`article-social-btn${stats.user_liked ? " article-social-btn--active-heart" : ""}`}
            onClick={toggleLike}
            title="Like"
          >
            <HeartIcon filled={stats.user_liked} />
            <span>{stats.likes || 0}</span>
          </button>
          <button
            type="button"
            className={`article-social-btn${stats.user_saved ? " article-social-btn--active-save" : ""}`}
            onClick={toggleSave}
            title="Save"
          >
            <BookmarkIcon filled={stats.user_saved} />
            <span>{stats.saves || 0}</span>
          </button>
          <span className="article-social-btn article-social-btn--count">
            <CommentIcon />
            <span>{stats.comments_count || 0}</span>
          </span>
        </div>

        {/* Comments */}
        <div className="article-comments">
          <h4 style={{ marginBottom: "0.75rem", fontWeight: 700, fontSize: "1rem" }}>
            Коментари ({stats.comments_count || 0})
          </h4>

          {user ? (
            <form onSubmit={postComment} className="comment-form">
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Напиши коментар..."
                rows={2}
                maxLength={600}
                className="write-input write-textarea"
                style={{ minHeight: 70, resize: "none" }}
              />
              {commentErr && <p style={{ color: "var(--error, #e53935)", fontSize: "0.82rem" }}>{commentErr}</p>}
              <button className="btn primary" type="submit" disabled={posting || !commentText.trim()} style={{ alignSelf: "flex-end", marginTop: 6 }}>
                {posting ? "Изпращане..." : "Коментирай"}
              </button>
            </form>
          ) : (
            <p className="text-muted" style={{ fontSize: "0.88rem", marginBottom: "1rem" }}>
              <button type="button" className="btn ghost" style={{ fontSize: "0.85rem" }} onClick={() => navigate("/login")}>
                Влез в профила
              </button>{" "}за да коментираш.
            </p>
          )}

          <div className="comment-list">
            {comments.length === 0 && <p className="text-muted" style={{ fontSize: "0.88rem" }}>Все още няма коментари.</p>}
            {comments.map((c) => (
              <div key={c.id} className="comment-row">
                <div className="comment-avatar">{(c.display_name || c.username || "?")[0].toUpperCase()}</div>
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-name">{c.display_name || c.username || "Потребител"}</span>
                    <span className="comment-time text-muted">{new Date(c.created_at).toLocaleDateString("bg-BG")}</span>
                  </div>
                  <p className="comment-text">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
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
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get("/articles?category=news")
      .then((res) => {
        const data = res.data || []
        setArticles(data)
        data.forEach((a) => {
          api.get(`/articles/${a.id}/stats`).then((r) => {
            setStatsMap((prev) => ({ ...prev, [a.id]: r.data || {} }))
          }).catch(() => {})
        })
      })
      .catch(() => setArticles([]))
  }, [])

  useEffect(() => {
    document.body.style.overflow = selectedArticle ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [selectedArticle])

  const filtered = filter === "All" ? articles : articles.filter((a) => a.articleCategory === filter)

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

      <div className="news-cat-toolbar" role="tablist" aria-label="Article categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={filter === cat}
            onClick={() => setFilter(cat)}
            className={`news-cat-pill news-cat-pill--${categorySlug(cat)} ${filter === cat ? "is-active" : ""}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="news-sort-bar">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`news-sort-btn${sort === s.key ? " news-sort-btn--active" : ""}`}
            onClick={() => setSort(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {sorted.map((article) => {
          const isLocked = article.isPremium && !hasSubscription
          const tagSlug = categorySlug(article.articleCategory)
          const st = statsMap[article.id] || {}

          return (
            <div key={article.id} className="card" style={{ position: "relative", display: "flex", flexDirection: "column" }}>
              {article.isPremium && (
                <div
                  style={{
                    position: "absolute", top: 10, right: 10,
                    background: "var(--oxide-red)", color: "white",
                    padding: "2px 8px", borderRadius: 4, fontWeight: "bold", zIndex: 2,
                  }}
                >
                  🔒 Premium
                </div>
              )}

              {isLocked && (
                <div
                  style={{
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    background: "color-mix(in srgb, var(--bg) 72%, transparent)",
                    backdropFilter: "blur(5px)", zIndex: 1,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: "3rem" }}>🔒</span>
                  <h3>Premium Content</h3>
                  <button className="btn primary" style={{ marginTop: 10 }} onClick={() => navigate("/subscriptions")} type="button">
                    Subscribe to Read
                  </button>
                </div>
              )}

              {article.imageUrl && (
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  style={{ width: "100%", borderRadius: 8, marginBottom: 12, height: 200, objectFit: "cover" }}
                />
              )}
              <h3>{article.title}</h3>
              <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                {new Date(article.date).toLocaleDateString()} • {article.author}
              </p>

              <div style={{ margin: "8px 0 10px" }}>
                <span className={`article-category-tag article-category-tag--${tagSlug}`}>{article.articleCategory}</span>
              </div>

              <p style={{ flex: 1 }}>{article.excerpt}</p>

              <div className="article-card-social">
                <span className="article-card-stat">
                  <HeartIcon filled={st.user_liked} /> {st.likes || 0}
                </span>
                <span className="article-card-stat">
                  <CommentIcon /> {st.comments_count || 0}
                </span>
                <span className="article-card-stat">
                  <BookmarkIcon filled={st.user_saved} /> {st.saves || 0}
                </span>
              </div>

              <button
                className="btn-read-more"
                onClick={() => !isLocked && setSelectedArticle(article)}
                disabled={isLocked}
                type="button"
              >
                Read More
              </button>
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
        />
      )}
    </div>
  )
}
