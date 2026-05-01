// client/src/pages/Home.jsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { getLang, t } from "../lib/i18n"
import { api } from "../lib/api"
import HeroIntro from "./HeroIntro"
import { clearCart } from "../lib/cart"
import Loader from "../components/Loader"
import BackToTopButton from "../components/BackToTopButton"

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const ART_TEXT = {
  bg: {
    title: "MIREN ART",
    subtitle: "Нова арт зона за визуални проекти, колаборации и творчески формати.",
    registerLocked: "Затворено",
  },
  en: {
    title: "MIREN ART",
    subtitle: "A new art zone for visual projects, collaborations, and creative formats.",
    registerLocked: "Closed",
  },
}
const WEEK_DAY_LABELS = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
}

function normalizeWeekdayKey(raw) {
  const value = String(raw || "").trim().toLowerCase()
  if (WEEK_DAYS.includes(value)) return value
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ""
  return WEEK_DAYS[(d.getDay() + 6) % 7] || ""
}

function normalizeHomeHeroPayload(data) {
  const calendarRaw = Array.isArray(data?.calendarEvents)
    ? data.calendarEvents
    : Array.isArray(data?.home_calendar_json)
    ? data.home_calendar_json
    : typeof data?.calendarEvents === "string"
    ? (() => { try { const p = JSON.parse(data.calendarEvents); return Array.isArray(p) ? p : [] } catch { return [] } })()
    : typeof data?.home_calendar_json === "string"
    ? (() => { try { const p = JSON.parse(data.home_calendar_json); return Array.isArray(p) ? p : [] } catch { return [] } })()
    : []
  return {
    spotifyPlaylistUrl: String(data?.spotifyPlaylistUrl || data?.spotify_playlist_url || "").trim(),
    calendarEvents: calendarRaw
      .map((ev) => ({ day: normalizeWeekdayKey(ev?.date || ev?.day), title: String(ev?.title || "").trim() }))
      .filter((ev) => ev.day && ev.title),
  }
}

export default function Home() {
  const { user, hasSubscription } = useAuth()
  const navigate = useNavigate()

  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [galleryItems, setGalleryItems] = useState([])
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState("")
  const [calendarEvents, setCalendarEvents] = useState([])
  const [song, setSong] = useState("")
  const [artist, setArtist] = useState("")
  const [reqMsg, setReqMsg] = useState("")
  const [selectedGame, setSelectedGame] = useState("wordle")
  const [artLang, setArtLang] = useState(() => getLang())
  const [welcomeFlipped, setWelcomeFlipped] = useState(false)
  const [reminderIds, setReminderIds] = useState(new Set())
  const [communityArticles, setCommunityArticles] = useState([])

  useEffect(() => {
    if (selectedArticle) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [selectedArticle])

  const isAdmin = !!user?.isAdmin
  const canAccessArt = isAdmin
  const artCopy = ART_TEXT[artLang] || ART_TEXT.bg

  useEffect(() => {
    const navEntries = performance.getEntriesByType("navigation")
    const navType = navEntries[0] && "type" in navEntries[0] ? navEntries[0].type : ""
    if (navType === "reload") window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    const url = new URL(window.location.href)
    if (url.searchParams.get("order_success") === "true") {
      clearCart()
      document.body.classList.remove("cart-open")
      url.searchParams.delete("order_success")
      window.history.replaceState({}, "", url.pathname + url.search)
    }
  }, [])

  useEffect(() => {
    const onLangChange = (e) => setArtLang(e?.detail?.lang || getLang())
    window.addEventListener("lang:change", onLangChange)
    return () => window.removeEventListener("lang:change", onLangChange)
  }, [])

  useEffect(() => {
    if (!user) { setReminderIds(new Set()); return }
    api.get("/events/reminders")
      .then((res) => setReminderIds(new Set(res.data?.articleIds || [])))
      .catch(() => {})
  }, [user])

  const handleHomeEventReminder = async (eventId) => {
    if (!user) { navigate("/profile"); return }
    const was = reminderIds.has(eventId)
    setReminderIds((prev) => { const n = new Set(prev); was ? n.delete(eventId) : n.add(eventId); return n })
    try {
      await api.post(`/events/${eventId}/reminder`, { enabled: !was })
      setUpcomingEvents((prev) =>
        prev.map((a) => a.id === eventId ? { ...a, reminderCount: (a.reminderCount || 0) + (was ? -1 : 1) } : a)
      )
    } catch {
      setReminderIds((prev) => { const n = new Set(prev); was ? n.add(eventId) : n.delete(eventId); return n })
    }
  }

  useEffect(() => {
    api.get("/hero", { params: { t: Date.now() } })
      .then((res) => {
        const n = normalizeHomeHeroPayload(res.data || {})
        setSpotifyPlaylistUrl(n.spotifyPlaylistUrl)
        setCalendarEvents(n.calendarEvents)
      })
      .catch(() => { setSpotifyPlaylistUrl(""); setCalendarEvents([]) })
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const [homeRes, eventsRes, galleryRes, communityRes] = await Promise.all([
          api.get("/articles", { params: { category: "home" } }),
          api.get("/articles", { params: { category: "events" } }),
          api.get("/articles", { params: { category: "gallery" } }),
          api.get("/community/articles", { params: { limit: 2 } }).catch(() => ({ data: [] })),
        ])
        if (alive) {
          setArticles(Array.isArray(homeRes.data) ? homeRes.data : [])
          const today = new Date().toISOString().slice(0, 10)
          const upcoming = (Array.isArray(eventsRes.data) ? eventsRes.data : [])
            .filter((e) => e.date >= today)
            .slice(0, 4)
          setUpcomingEvents(upcoming)
          setGalleryItems((Array.isArray(galleryRes.data) ? galleryRes.data : []).slice(0, 4))
          setCommunityArticles(Array.isArray(communityRes.data) ? communityRes.data : [])
        }
      } catch {
        if (alive) setArticles([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const featured = useMemo(() => (Array.isArray(articles) ? articles : []).slice(0, 6), [articles])

  const eventMap = useMemo(() => {
    const m = new Map()
    for (const e of calendarEvents) {
      const key = normalizeWeekdayKey(e?.day || e?.date)
      if (key) m.set(key, String(e?.title || ""))
    }
    return m
  }, [calendarEvents])

  const weeklySchedule = useMemo(
    () => WEEK_DAYS.map((day) => ({ day, title: eventMap.get(day) || "—" })),
    [eventMap]
  )

  const sendSpotifyRequest = async () => {
    if (!user) { setReqMsg("Please register or log in."); navigate("/register"); return }
    const today = new Date().toISOString().slice(0, 10)
    const key = `spotify_req_${today}_${user.email}`
    if (localStorage.getItem(key)) { setReqMsg("⚠️ One request per day."); return }
    if (!song.trim() || !artist.trim()) { setReqMsg("Add both Song and Artist."); return }
    try {
      await api.post("/contact", {
        email: user.email,
        message: `Spotify request\nSong: ${song}\nArtist: ${artist}\nUser: ${user.displayName || "Unknown"}`,
      })
      localStorage.setItem(key, "1")
      setReqMsg("✅ Request sent.")
      setSong(""); setArtist("")
    } catch {
      setReqMsg("Could not send request right now.")
    }
  }

  return (
    <div className="home-shell">
      <HeroIntro />

      <div className="home-content" id="home-main-content">

        {/* ── Featured Articles ── */}
        <section className="home-section">
          <h2 className="home-section-title">{t("featured")}</h2>
          {loading ? (
            <Loader />
          ) : featured.length > 0 ? (
            <div className="home-featured-grid">
              {featured.map((f) => {
                const isLocked = !!f.isPremium && !hasSubscription
                return (
                  <div key={f.id} className="home-featured-card glass-card">
                    {f.isPremium && (
                      <div className="featured-premium-badge">🔒 Premium</div>
                    )}
                    {isLocked && (
                      <div className="featured-lock-overlay">
                        <span>🔒</span>
                        <p>{t("premium_content")}</p>
                        <a href="/subscriptions" className="btn primary">{t("subscribe_unlock")}</a>
                      </div>
                    )}
                    {f.imageUrl && (
                      <img src={f.imageUrl} className="home-featured-img" alt={f.title} loading="lazy" />
                    )}
                    <div className="home-featured-body">
                      <h3 className="home-featured-title">{f.title}</h3>
                      {f.excerpt && <p className="home-featured-excerpt">{f.excerpt}</p>}
                      <button
                        className="btn outline home-featured-btn"
                        onClick={() => !isLocked && setSelectedArticle(f)}
                        disabled={isLocked}
                        type="button"
                      >
                        {t("read_more")}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </section>

        {/* ── Write Your Own Article ── */}
        <section className="home-section">
          <div style={{
            borderRadius: 20,
            padding: "36px 32px",
            background: "linear-gradient(135deg, rgba(196,106,74,0.12) 0%, rgba(160,82,45,0.08) 100%)",
            border: "1.5px solid rgba(196,106,74,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>✍️</div>
              <h3 style={{ fontWeight: 900, fontSize: "1.5rem", color: "var(--text)", marginBottom: 8, lineHeight: 1.2 }}>
                {artLang === "bg" ? "Публикувай твоята статия" : "Publish Your Article"}
              </h3>
              <p style={{ color: "var(--text)", opacity: 0.6, fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
                {artLang === "bg"
                  ? "Сподели историята си с общността на MIREN. Одобрените статии се публикуват в News."
                  : "Share your story with the MIREN community. Approved articles get published in News."}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", fontSize: "0.82rem", color: "var(--text)", opacity: 0.45 }}>
                <span>🌸 Безплатно за всички</span>
                <span>·</span>
                <span>⭐ Premium → в хартиеното списание</span>
              </div>
            </div>
            <a
              href="/write"
              style={{
                display: "inline-block",
                padding: "14px 32px",
                borderRadius: 999,
                background: "linear-gradient(135deg, var(--oxide-red, #c46a4a), #a0522d)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "1rem",
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(196,106,74,0.35)",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(196,106,74,0.5)" }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(196,106,74,0.35)" }}
            >
              {artLang === "bg" ? "Напиши статия" : "Write an Article"}
            </a>
          </div>
        </section>

        {/* ── Welcome card (flip) ── */}
        <section className="home-section">
          <div
            className={`home-welcome-flip${welcomeFlipped ? " is-flipped" : ""}`}
            onClick={() => setWelcomeFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setWelcomeFlipped((f) => !f)}
            aria-label="Flip card"
          >
            <div className="flip-card-inner">
              <div className="flip-card-front">
                <p className="flip-welcome-title">
                  {user ? `${t("welcome")}, ${user.displayName}!` : t("home_title")}
                </p>
              </div>
              <div className="flip-card-back">
                <p className="flip-back-text">Read the news here</p>
                <a
                  className="btn primary"
                  href="/news"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("read_news")}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Upcoming Events ── */}
        <section className="home-section">
          <h2 className="home-section-title">{artLang === "bg" ? "Предстоящи Събития" : "Upcoming Events"}</h2>
          {upcomingEvents.length === 0 ? (
            <div className="home-none-box glass-card">
              <p className="text-muted">{artLang === "bg" ? "Няма предстоящи събития." : "No upcoming events."}</p>
            </div>
          ) : (
            <div className="home-featured-grid">
              {upcomingEvents.map((ev) => {
                const isNotified = reminderIds.has(ev.id)
                return (
                  <div key={ev.id} className="ev-card glass-card">
                    {ev.imageUrl && (
                      <div className="ev-card-img-wrap">
                        <img src={ev.imageUrl} alt={ev.title} className="ev-card-img" loading="lazy" />
                      </div>
                    )}
                    <div className="ev-card-body">
                      <div className="ev-card-meta">
                        <span className="ev-card-date">📅 {ev.date}{ev.time ? ` · ${ev.time}` : ""}</span>
                        {ev.price && <span className="ev-card-price">{ev.price}</span>}
                      </div>
                      <h3 className="ev-card-title">{ev.title}</h3>
                      {ev.excerpt && <p className="ev-card-desc">{ev.excerpt}</p>}
                      <div className="ev-card-footer">
                        <a href="/events" className="btn outline ev-card-btn">
                          {artLang === "bg" ? "Прочети повече" : "Read more"}
                        </a>
                        <div className="ev-notify-wrap">
                          <label className="ev-checkbox-container">
                            <input type="checkbox" checked={isNotified} onChange={() => handleHomeEventReminder(ev.id)} />
                            <div className="ev-checkmark" />
                            <span className="ev-notify-label">{isNotified ? (artLang === "bg" ? "Ще бъда уведомен" : "I'll be notified") : (artLang === "bg" ? "Уведоми ме" : "Notify me")}</span>
                          </label>
                          {ev.reminderCount > 0 && (
                            <span className="ev-notify-count">{ev.reminderCount} {artLang === "bg" ? "души искат напомняне" : "want a reminder"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="/events" className="btn ghost">{artLang === "bg" ? "Виж всички събития →" : "See all events →"}</a>
          </div>
        </section>

        {/* ── MIREN ART + Discord ── */}
        <section className="home-section">
          <div className="home-pair-grid">
            {/* MIREN ART */}
            <div className="home-art-card glass-card">
              <div className="home-art-icon" aria-hidden="true">
                <span>🎨</span>
              </div>
              <div className="home-art-content">
                <div className="home-art-head">
                  <h3>{artCopy.title}</h3>
                </div>
                <p>{artCopy.subtitle}</p>
                <div className="home-art-actions">
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={!canAccessArt}
                    onClick={() => {
                      if (!canAccessArt) return
                      if (!user) { navigate("/register"); return }
                      navigate("/miren-art")
                    }}
                  >
                    🔒 {artCopy.registerLocked}
                  </button>
                </div>
              </div>
            </div>

            {/* Discord */}
            <a
              className="home-discord-card discord-card glass-card"
              href="https://discord.gg/Gpdmt8ztcA"
              target="_blank"
              rel="noreferrer"
            >
              <div className="home-discord-icon discord-icon" aria-hidden="true">
                <svg viewBox="0 0 245 240" role="img">
                  <path fill="currentColor" d="M104.4 104.8c-5.7 0-10.2 5-10.2 11.1 0 6.2 4.6 11.2 10.2 11.2 5.7 0 10.3-5 10.2-11.2 0-6.1-4.5-11.1-10.2-11.1Zm36.2 0c-5.7 0-10.2 5-10.2 11.1 0 6.2 4.6 11.2 10.2 11.2 5.7 0 10.3-5 10.2-11.2 0-6.1-4.5-11.1-10.2-11.1Z" />
                  <path fill="currentColor" d="M189.5 20h-134C24.8 20 0 44.8 0 75.5v89C0 195.2 24.8 220 55.5 220h113.2l-5.3-18.4 12.8 11.8 12.1 11.2L210 244V75.5C210 44.8 185.2 20 154.5 20Zm-39.1 145s-3.7-4.4-6.8-8.4c13.6-3.9 18.8-12.5 18.8-12.5-4.3 2.8-8.3 4.8-11.9 6.2-5.1 2.1-9.9 3.5-14.7 4.3-9.8 1.8-18.9 1.3-26.8-.2-6-1.1-11.1-2.8-15.2-4.4-2.3-.9-4.8-2-7.3-3.3-.3-.1-.5-.2-.8-.4-.2-.1-.3-.2-.5-.3-2.2-1.2-3.4-2-3.4-2s5 8.4 18.1 12.4c-3.1 4-6.9 8.7-6.9 8.7-22.8-.7-31.5-15.7-31.5-15.7 0-33.3 14.9-60.3 14.9-60.3 14.9-11.2 29-10.9 29-10.9l1 1.2c-18.6 5.4-27.2 13.5-27.2 13.5s2.3-1.3 6.1-3.1c11-4.8 19.8-6.1 23.4-6.4.6-.1 1.1-.1 1.7-.2 6.1-.8 13.1-1 20.3-.2 9.5 1.1 19.7 3.8 30 9.3 0 0-8.2-7.7-25.9-13.1l1.4-1.6s14.2-.3 29 10.9c0 0 14.9 27 14.9 60.3 0 0-8.8 15-31.6 15.7Z" />
                </svg>
              </div>
              <div className="home-discord-content">
                <h3>{t("home_discord_title")}</h3>
                <p>{t("home_discord_text")}</p>
                <span className="home-discord-btn">{t("home_discord_btn")}</span>
              </div>
            </a>
          </div>
        </section>

        {/* ── Games + Spotify ── */}
        <section className="home-section">
          <div className="home-pair-grid">
            {/* Games */}
            <div className="work-card glass-card games-card">
              <div className="spotify-card-top">
                <div className="spotify-card-icon games-card-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" role="img">
                    <path fill="currentColor" d="M21 6H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1ZM7 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-1h-2v-2h2v2Zm2 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4h-4v-2h4v2Z" />
                  </svg>
                </div>
                <div className="spotify-card-content">
                  <h4>{t("home_games_title")}</h4>
                </div>
              </div>
              <p className="text-muted spotify-limit">{t("home_games_label")}</p>
              <select className="input" value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)}>
                <option value="wordle">{t("home_games_word")}</option>
              </select>
              <div className="btn-group" style={{ marginTop: 12 }}>
                <a className="btn primary" href="/games">{t("home_games_play")}</a>
                <a className="btn ghost" href="/leaderboards">{t("home_games_board")}</a>
              </div>
              <p className="text-muted" style={{ marginTop: 8, fontSize: "0.82rem" }}>{t("home_games_note")}</p>
            </div>

            {/* Spotify */}
            <div className="work-card glass-card spotify-card">
              <div className="spotify-card-top">
                <div className="spotify-card-icon" aria-hidden="true">
                  <svg viewBox="0 0 168 168" role="img">
                    <path fill="currentColor" d="M84 0a84 84 0 1 0 0 168 84 84 0 0 0 0-168Zm38.5 121.2a5.3 5.3 0 0 1-7.3 1.8c-20-12.2-45.1-15-74.6-8.4a5.3 5.3 0 1 1-2.3-10.3c32.2-7.2 60-4 82.4 9.5a5.3 5.3 0 0 1 1.8 7.4Zm10.5-23.3a6.6 6.6 0 0 1-9.1 2.2c-22.9-14.1-57.8-18.2-84.9-9.8a6.6 6.6 0 1 1-3.8-12.7c30.9-9.3 69.3-4.8 95.6 11.3a6.6 6.6 0 0 1 2.2 9Zm.9-24.3c-27.4-16.3-72.7-17.8-98.8-9.7a8 8 0 1 1-4.7-15.3c30-9.1 79.9-7.3 111.7 11.5a8 8 0 0 1-8.2 13.5Z" />
                  </svg>
                </div>
                <div className="spotify-card-content">
                  <h4>{t("home_spotify_title")}</h4>
                  {spotifyPlaylistUrl ? (
                    <a href={spotifyPlaylistUrl} target="_blank" rel="noreferrer" className="btn outline spotify-open-btn">
                      {t("home_spotify_open")}
                    </a>
                  ) : (
                    <p className="text-muted spotify-open-unset">{t("home_spotify_not_set")}</p>
                  )}
                </div>
              </div>
              <p className="text-muted spotify-limit">{t("home_spotify_limit")}</p>
              <div className="spotify-form-grid">
                <input className="input" placeholder={t("home_spotify_song")} value={song} onChange={(e) => setSong(e.target.value)} />
                <input className="input" placeholder={t("home_spotify_artist")} value={artist} onChange={(e) => setArtist(e.target.value)} />
              </div>
              <button className="btn primary spotify-send-btn" type="button" onClick={sendSpotifyRequest}>
                {t("home_spotify_send")}
              </button>
              {reqMsg && <p className="text-muted" style={{ marginTop: 8 }}>{reqMsg}</p>}
            </div>
          </div>
        </section>

        {/* ── Community Writers (admin-only for now) ── */}
        {isAdmin && communityArticles.length > 0 && (
          <section className="home-section">
            <h2 className="home-section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              ✍️ {artLang === "bg" ? "От общността" : "From the Community"}
              <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "rgba(196,106,74,0.15)", color: "var(--oxide-red, #c46a4a)", marginLeft: 4 }}>ADMIN</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
              {communityArticles.map((a) => (
                <div key={a.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {a.cover_url && (
                    <img src={a.cover_url} alt={a.title} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 10 }} />
                  )}
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>{a.title}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text)", opacity: 0.5 }}>
                    ✍️ {a.author_name} · {new Date(a.created_at).toLocaleDateString("bg-BG")}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Work / Partnership ── */}
        <section className="home-section">
          <div className="work-wide glass-card">
            <h3>{t("home_work_title")}</h3>
            <p>{t("home_work_text")}</p>
            <a className="btn primary work-wide-cta" href="/opportunities">{t("home_work_cta")}</a>
          </div>
        </section>

        {/* ── Gallery Preview ── */}
        {galleryItems.length > 0 && (
          <section className="home-section">
            <h2 className="home-section-title">{artLang === "bg" ? "Галерия" : "Gallery"}</h2>
            <div className="home-featured-grid">
              {galleryItems.map((item) => (
                <div key={item.id} className="gal-card">
                  <div className="gal-card-img-wrap">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.title || "Gallery"} className="gal-card-img" loading="lazy" />
                      : <div className="gal-card-placeholder" />
                    }
                    <div className="gal-card-overlay">
                      <a href="/gallery" className="gal-see-more">{artLang === "bg" ? "Виж повече" : "See more"}</a>
                    </div>
                  </div>
                  {item.title && <p className="gal-card-title">{item.title}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Weekly Schedule ── */}
        <section className="home-section">
          <div className="calendar-card glass-card">
            <h4>{t("home_weekly_schedule")}</h4>
            <div className="weekly-schedule-grid">
              {weeklySchedule.map((item) => (
                <div key={item.day} className={`weekly-row${item.title !== "—" ? " weekly-row-has-event" : ""}`}>
                  <div className="weekly-day">{WEEK_DAY_LABELS[item.day]}</div>
                  <div className="weekly-title">{item.title}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            <BackToTopButton />
          </div>
        </section>

      </div>

      {selectedArticle && createPortal(
        <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedArticle(null)} type="button">×</button>
            <h2 className="headline" style={{ textAlign: "center" }}>{selectedArticle.title}</h2>
            {selectedArticle.imageUrl && (
              <img src={selectedArticle.imageUrl} style={{ width: "100%", borderRadius: 8, marginBottom: 20 }} alt={selectedArticle.title} />
            )}
            <div className="modal-text">{selectedArticle.text}</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
