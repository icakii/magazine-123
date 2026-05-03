import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "../lib/api"

export function PlanBadge({ plan }) {
  if (!plan || plan === "free") return null
  const isYearly = plan === "yearly"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px",
      borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.03em",
      background: isYearly
        ? "linear-gradient(90deg,#b8860b,#d4a017,#b8860b)"
        : "linear-gradient(90deg,#3b5bdb,#4c6ef5)",
      color: "#fff", flexShrink: 0,
    }}>
      {isYearly ? "Yearly" : "Monthly"}
    </span>
  )
}

/* ── Profile mini card ── */
export function ProfileMiniCard({ displayName, anchorRect, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const cardRef = useRef()

  useEffect(() => {
    api.get(`/user/profile/${encodeURIComponent(displayName)}`)
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [displayName])

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const vw = window.innerWidth, vh = window.innerHeight
  const top = anchorRect ? Math.min(anchorRect.bottom + 8, vh - 310) : vh / 2 - 130
  const left = anchorRect ? Math.max(10, Math.min(anchorRect.left, vw - 280)) : vw / 2 - 130

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 10002 }} onClick={onClose}>
      <div
        ref={cardRef}
        style={{
          position: "absolute", top, left, width: 260,
          background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
          animation: "profileCardIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,106,74,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", padding: "20px 18px 18px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.35)", fontSize: "0.88rem" }}>Loading...</div>
          ) : !profile ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.35)", fontSize: "0.88rem" }}>Not found</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
                {profile.pfp_url ? (
                  <img src={profile.pfp_url} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(196,106,74,0.4)" }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--oxide-red, #c46a4a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.3rem", flexShrink: 0, border: "2px solid rgba(196,106,74,0.4)" }}>
                    {(profile.display_name || "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff", lineHeight: 1.2 }}>{profile.display_name}</div>
                  {profile.plan && profile.plan !== "free" && <div style={{ marginTop: 5 }}><PlanBadge plan={profile.plan} /></div>}
                </div>
              </div>
              {profile.instagram_handle && (
                <a
                  href={`https://instagram.com/${profile.instagram_handle}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  @{profile.instagram_handle}
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Likers popup ── */
export function LikersPopup({ articleId, onClose }) {
  const [likers, setLikers] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileCard, setProfileCard] = useState(null)

  useEffect(() => {
    api.get(`/articles/${articleId}/likers`)
      .then(r => setLikers(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [articleId])

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") { if (profileCard) setProfileCard(null); else onClose() } }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, profileCard])

  function openProfile(e, displayName) {
    e.stopPropagation()
    setProfileCard({ displayName, rect: e.currentTarget.getBoundingClientRect() })
  }

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={() => { if (profileCard) setProfileCard(null); else onClose() }}
    >
      <div
        style={{ background: "var(--bg, #111)", borderRadius: 20, width: "100%", maxWidth: 380, maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", animation: "slideUp 0.2s ease" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>Liked by</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 30, height: 30, color: "var(--text)", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.88rem" }}>Loading...</div>}
          {!loading && likers.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.88rem" }}>No likes yet</div>}
          {likers.map((liker, i) => (
            <button
              key={i} type="button"
              onClick={e => openProfile(e, liker.display_name)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {liker.pfp_url ? (
                <img src={liker.pfp_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--oxide-red, #c46a4a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.95rem", flexShrink: 0 }}>
                  {(liker.display_name || "?")[0].toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{liker.display_name}</div>
                {liker.plan && liker.plan !== "free" && <div style={{ marginTop: 3 }}><PlanBadge plan={liker.plan} /></div>}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      </div>
      {profileCard && <ProfileMiniCard displayName={profileCard.displayName} anchorRect={profileCard.rect} onClose={() => setProfileCard(null)} />}
    </div>,
    document.body
  )
}

/* ── Comment conversation popup ── */
export function CommentConversation({ article, user, navigate, onClose, onCommentAdded, isAdmin }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)
  const [err, setErr] = useState("")
  const [profileCard, setProfileCard] = useState(null)
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
      setComments(prev => [...prev, res.data])
      setText("")
      if (onCommentAdded) onCommentAdded(article.id)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80)
    } catch (e) {
      setErr(e?.response?.data?.error || "Error sending.")
    } finally { setPosting(false) }
  }

  async function deleteComment(commentId) {
    if (!window.confirm("Delete this comment?")) return
    try {
      await api.delete(`/admin/comments/${commentId}`)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch {}
  }

  function openProfile(e, displayName) {
    if (!displayName) return
    e.stopPropagation()
    setProfileCard({ displayName, rect: e.currentTarget.getBoundingClientRect() })
  }

  return createPortal(
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={e => { if (profileCard) { setProfileCard(null); return } onClose() }}
      >
        <div
          style={{ background: "var(--bg, #111)", borderRadius: 20, width: "100%", maxWidth: 500, height: "min(600px, 90vh)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          onClick={e => e.stopPropagation()}
        >
          {/* header */}
          <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)", lineHeight: 1.2 }}>Comments</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text)", opacity: 0.4, marginTop: 2 }}>{article.title?.slice(0,45)}{article.title?.length > 45 ? "…" : ""}</div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 30, height: 30, color: "var(--text)", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {comments.length === 0 && (
              <div style={{ textAlign: "center", marginTop: "3rem", color: "var(--text)", opacity: 0.35 }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>—</div>
                <div style={{ fontSize: "0.88rem" }}>Be the first to comment.</div>
              </div>
            )}
            {comments.map(c => {
              const isOwn = user && (c.display_name === user.displayName || c.username === user.displayName)
              return (
                <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <button
                    type="button"
                    onClick={e => openProfile(e, c.display_name)}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0, marginTop: 2 }}
                    title={c.display_name}
                  >
                    {c.pfp_url ? (
                      <img src={c.pfp_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: isOwn ? "var(--oxide-red, #c46a4a)" : "rgba(99,102,241,0.7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.82rem" }}>
                        {(c.display_name || c.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      background: isOwn
                        ? "linear-gradient(135deg, rgba(196,106,74,0.18) 0%, rgba(196,106,74,0.08) 100%)"
                        : "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.06) 100%)",
                      border: isOwn ? "1px solid rgba(196,106,74,0.2)" : "1px solid rgba(99,102,241,0.15)",
                      borderRadius: "0 14px 14px 14px", padding: "9px 13px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <button
                          type="button"
                          onClick={e => openProfile(e, c.display_name)}
                          style={{ background: "none", border: "none", padding: 0, fontWeight: 700, fontSize: "0.78rem", color: isOwn ? "var(--oxide-red, #c46a4a)" : "#818cf8", cursor: "pointer" }}
                        >
                          {c.display_name || c.username || "User"}
                        </button>
                        {isAdmin && !isOwn && (
                          <button
                            type="button"
                            onClick={() => deleteComment(c.id)}
                            title="Delete comment"
                            style={{ marginLeft: "auto", background: "none", border: "none", padding: "2px 6px", borderRadius: 6, color: "#ef4444", cursor: "pointer", fontSize: "0.72rem", opacity: 0.7 }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.55, wordBreak: "break-word" }}>{c.content}</p>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text)", opacity: 0.35, marginTop: 3, paddingLeft: 4 }}>{new Date(c.created_at).toLocaleDateString("bg-BG")}</div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* input */}
          <div style={{ padding: "10px 14px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {user ? (
              <form onSubmit={post} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flexShrink: 0, marginBottom: 2 }}>
                  {user.pfp_url ? (
                    <img src={user.pfp_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--oxide-red, #c46a4a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.82rem" }}>
                      {(user.displayName || user.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(e) } }}
                  placeholder="Write a comment... (Enter to send)"
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
                Log in to comment
              </button>
            )}
            {err && <p style={{ color: "#ef4444", fontSize: "0.78rem", margin: "6px 0 0 44px" }}>{err}</p>}
          </div>
        </div>
      </div>
      {profileCard && <ProfileMiniCard displayName={profileCard.displayName} anchorRect={profileCard.rect} onClose={() => setProfileCard(null)} />}
    </>,
    document.body
  )
}

/* ── Article bottom action bar ── */
export function ArticleActionBar({ article, st, user, navigate, onToggleLike, onToggleSave, onComment, onRead, onLikersOpen }) {
  const pill = "var(--action-pill, rgba(0,0,0,0.07))"
  const pillDiv = "var(--action-pill-div, rgba(0,0,0,0.1))"

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", borderTop: "1px solid var(--border, rgba(0,0,0,0.08))", paddingTop: 10, marginTop: "auto" }} onClick={e => e.stopPropagation()}>
      {/* like: split button */}
      <div style={{ display: "flex", alignItems: "center", borderRadius: 999, overflow: "hidden", background: st.user_liked ? "rgba(239,68,68,0.15)" : pill }}>
        <button
          type="button"
          onClick={e => onToggleLike(e, article)}
          style={{ display: "flex", alignItems: "center", padding: "7px 8px 7px 13px", border: "none", background: "transparent", color: st.user_liked ? "#ef4444" : "var(--text)", cursor: "pointer", transition: "all 0.15s" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={st.user_liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); if ((st.likes || 0) > 0 && onLikersOpen) onLikersOpen(article.id) }}
          style={{ padding: "7px 12px 7px 4px", border: "none", borderLeft: `1px solid ${pillDiv}`, background: "transparent", color: st.user_liked ? "#ef4444" : "var(--text)", cursor: (st.likes || 0) > 0 ? "pointer" : "default", fontSize: "0.85rem", fontWeight: 600, transition: "all 0.15s" }}
        >
          {st.likes || 0}
        </button>
      </div>

      <button
        type="button"
        onClick={e => onToggleSave(e, article)}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 999, border: "none", background: st.user_saved ? "rgba(99,102,241,0.15)" : pill, color: st.user_saved ? "#818cf8" : "var(--text)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, transition: "all 0.15s" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={st.user_saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        {st.saves || 0}
      </button>

      <button
        type="button"
        onClick={e => { e.stopPropagation(); onComment(article) }}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 999, border: "none", background: pill, color: "var(--text)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, transition: "all 0.15s" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        {st.comments_count || 0}
      </button>

      {onRead && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRead(article) }}
          style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 999, border: "1.5px solid var(--border, rgba(0,0,0,0.12))", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
        >
          Read
        </button>
      )}
    </div>
  )
}
