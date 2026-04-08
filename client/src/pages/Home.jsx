// client/src/pages/Home.jsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "../hooks/useAuth"
import { t } from "../lib/i18n"
import { api } from "../lib/api"
import HeroIntro from "./HeroIntro"
import { clearCart } from "../lib/cart"

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const WEEK_DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}
function normalizeWeekdayKey(raw) {
  const value = String(raw || "").trim().toLowerCase()
  if (WEEK_DAYS.includes(value)) return value
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ""
  const idx = (d.getDay() + 6) % 7
  return WEEK_DAYS[idx] || ""
}

function normalizeHomeHeroPayload(data) {
    const calendarRaw = Array.isArray(data?.calendarEvents)
    ? data.calendarEvents
    : Array.isArray(data?.home_calendar_json)
    ? data.home_calendar_json
    : typeof data?.calendarEvents === "string"
    ? (() => {
        try {
          const parsed = JSON.parse(data.calendarEvents)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      })()
    : typeof data?.home_calendar_json === "string"
    ? (() => {
        try {
          const parsed = JSON.parse(data.home_calendar_json)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      })()
    : []
  return {
    spotifyPlaylistUrl: String(data?.spotifyPlaylistUrl || data?.spotify_playlist_url || "").trim(),
        calendarEvents: calendarRaw
      .map((ev) => ({
        day: normalizeWeekdayKey(ev?.date || ev?.day),
        title: String(ev?.title || "").trim(),
      }))
      .filter((ev) => ev.day && ev.title),                                                                           
  }
}

export default function Home() {
  const { user, hasSubscription } = useAuth()

  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState(null)

const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState("")
  const [calendarEvents, setCalendarEvents] = useState([])
  const [song, setSong] = useState("")
  const [artist, setArtist] = useState("")
  const [reqMsg, setReqMsg] = useState("")

  const [selectedGame, setSelectedGame] = useState("wordle")

  useEffect(() => {
    const url = new URL(window.location.href)
    const ok = url.searchParams.get("order_success") === "true"
    if (ok) {
      clearCart()
      document.body.classList.remove("cart-open")
      url.searchParams.delete("order_success")
      window.history.replaceState({}, "", url.pathname + url.search)
    }
  }, [])

  useEffect(() => {
api
      .get("/hero", { params: { t: Date.now() } })
      .then((res) => {
const normalized = normalizeHomeHeroPayload(res.data || {})
        setSpotifyPlaylistUrl(normalized.spotifyPlaylistUrl)
        setCalendarEvents(normalized.calendarEvents)
      })
      .catch(() => {
        setSpotifyPlaylistUrl("")
        setCalendarEvents([])
      })
  }, [])

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        setLoading(true)
        const res = await api.get("/articles", { params: { category: "home" } })
        const arr = Array.isArray(res.data) ? res.data : []
        if (!alive) return
        setArticles(arr)
      } catch {
        if (!alive) return
        setArticles([])
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const featured = useMemo(() => {
    const arr = Array.isArray(articles) ? articles : []
    return arr.slice(0, 6)
  }, [articles])

  const eventMap = useMemo(() => {
    const m = new Map()
    for (const e of calendarEvents) {
       const key = normalizeWeekdayKey(e?.day || e?.date)
      if (!key) continue
      m.set(key, String(e?.title || ""))
    }
    return m
  }, [calendarEvents])
  const weeklySchedule = useMemo(
    () => WEEK_DAYS.map((day) => ({ day, title: eventMap.get(day) || "—" })),
    [eventMap]
  )

  const sendSpotifyRequest = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const key = `spotify_req_${today}_${user?.email || "guest"}`
    if (localStorage.getItem(key)) {
      setReqMsg("⚠️ You can send one request per day.")
      return
    }
    if (!song.trim() || !artist.trim()) {
      setReqMsg("Add both Song and Artist.")
      return
    }

    try {
      await api.post("/contact", {
        email: user?.email || "spotify@miren.local",
        message: `Spotify request\nSong: ${song}\nArtist: ${artist}\nUser: ${user?.displayName || "Guest"}`,
      })
      localStorage.setItem(key, "1")
      setReqMsg("✅ Request sent.")
      setSong("")
      setArtist("")
    } catch {
      setReqMsg("Could not send request right now.")
    }
  }

  return (
    <div className="home-shell">
      <HeroIntro />

      <div id="home-main-content" className="page anim-fade-up">
    <div className="home-discord-wrap anim-fade-up anim-delay-1">
          <a
            className="home-discord-card"
            href="https://discord.gg/Gpdmt8ztcA"
            target="_blank"
            rel="noreferrer"
            aria-label="Join Miren Magazine Discord server"
          >
            <div className="home-discord-icon" aria-hidden="true">
              <svg viewBox="0 0 245 240" role="img">
                <path
                  fill="currentColor"
                  d="M104.4 104.8c-5.7 0-10.2 5-10.2 11.1 0 6.2 4.6 11.2 10.2 11.2 5.7 0 10.3-5 10.2-11.2 0-6.1-4.5-11.1-10.2-11.1Zm36.2 0c-5.7 0-10.2 5-10.2 11.1 0 6.2 4.6 11.2 10.2 11.2 5.7 0 10.3-5 10.2-11.2 0-6.1-4.5-11.1-10.2-11.1Z"
                />
                <path
                  fill="currentColor"
                  d="M189.5 20h-134C24.8 20 0 44.8 0 75.5v89C0 195.2 24.8 220 55.5 220h113.2l-5.3-18.4 12.8 11.8 12.1 11.2L210 244V75.5C210 44.8 185.2 20 154.5 20Zm-39.1 145s-3.7-4.4-6.8-8.4c13.6-3.9 18.8-12.5 18.8-12.5-4.3 2.8-8.3 4.8-11.9 6.2-5.1 2.1-9.9 3.5-14.7 4.3-9.8 1.8-18.9 1.3-26.8-.2-6-1.1-11.1-2.8-15.2-4.4-2.3-.9-4.8-2-7.3-3.3-.3-.1-.5-.2-.8-.4-.2-.1-.3-.2-.5-.3-2.2-1.2-3.4-2-3.4-2s5 8.4 18.1 12.4c-3.1 4-6.9 8.7-6.9 8.7-22.8-.7-31.5-15.7-31.5-15.7 0-33.3 14.9-60.3 14.9-60.3 14.9-11.2 29-10.9 29-10.9l1 1.2c-18.6 5.4-27.2 13.5-27.2 13.5s2.3-1.3 6.1-3.1c11-4.8 19.8-6.1 23.4-6.4.6-.1 1.1-.1 1.7-.2 6.1-.8 13.1-1 20.3-.2 9.5 1.1 19.7 3.8 30 9.3 0 0-8.2-7.7-25.9-13.1l1.4-1.6s14.2-.3 29 10.9c0 0 14.9 27 14.9 60.3 0 0-8.8 15-31.6 15.7Z"
                />
              </svg>
            </div>
            <div className="home-discord-content">
              <h3>{t("home_discord_title")}</h3>
              <p>{t("home_discord_text")}</p>
              <span className="home-discord-btn">{t("home_discord_btn")}</span>
            </div>
          </a>
        </div>
                <div className="hero-bg anim-zoom-in anim-delay-1" style={{ padding: "40px 20px", textAlign: "center", marginBottom: 40 }}>
          <h1 className="headline" style={{ fontSize: "3rem" }}>
            {user ? `${t("welcome")}, ${user.displayName}!` : t("home_title")}
          </h1>

          <p className="subhead" style={{ fontSize: "1.2rem" }}>
            {user ? t("home_user_sub") : t("home_sub")}
          </p>

          <div className="btn-group mt-3" style={{ justifyContent: "center" }}>
            {!user && (
              <a className="btn primary" href="/register">{t("start")}</a>
            )}
             <a className="btn ghost" href="/news">{t("read_news")}</a>
          </div>
        </div>

        {loading ? (
          <p className="subhead">{t("loading")}</p>
        ) : featured.length > 0 ? (
          <div className="stack anim-fade-up anim-delay-2">
            <h3 className="headline">{t("featured")}</h3>

            <div className="grid">
              {featured.map((f) => {
                const isLocked = !!f.isPremium && !hasSubscription

                return (
                  <div key={f.id} className="col-6 anim-fade-up anim-delay-1">
                    <div className="card" style={{ position: "relative", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                      {f.isPremium && <div style={{ position: "absolute", top: 10, right: 10, background: "#e63946", color: "white", padding: "2px 8px", borderRadius: 4, fontWeight: "bold", zIndex: 2 }}>🔒 Premium</div>}
                      {isLocked && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(5px)", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8 }}><span style={{ fontSize: "3rem" }}>🔒</span><p style={{ marginTop: 8, marginBottom: 12 }}>{t("premium_content")}</p><a href="/subscriptions" className="btn primary">{t("subscribe_unlock")}</a></div>}
                      {f.imageUrl && <img src={f.imageUrl} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8, marginBottom: 15 }} alt={f.title} loading="lazy" />}
<h4 className="featured-card-title" style={{ marginBottom: 12 }}>{f.title}</h4>
                     
{f.excerpt && <p className="featured-card-excerpt" style={{ color: "var(--text-muted)", marginBottom: 15 }}>{f.excerpt}</p>}
                      <div style={{ marginTop: "auto" }}><button className="btn outline" onClick={() => !isLocked && setSelectedArticle(f)} disabled={isLocked} type="button">{t("read_more")}</button></div>
                    </div>
                  </div>
                )
              })}
            </div>
                        </div>
        ) : (
          <p className="subhead">{t("home_no_featured")}</p>
        )}

        <section className="home-work-grid">
              <div className="work-wide glass-card">
                               <h3>{t("home_work_title")}</h3>
                <p>{t("home_work_text")}</p>
<a className="btn primary work-wide-cta" href="/opportunities">{t("home_work_cta")}</a>
              </div>

              <div className="work-card glass-card spotify-card">
                <div className="spotify-card-top">
                  <div className="spotify-card-icon" aria-hidden="true">
                    <svg viewBox="0 0 168 168" role="img">
                      <path fill="currentColor" d="M84 0a84 84 0 1 0 0 168 84 84 0 0 0 0-168Zm38.5 121.2a5.3 5.3 0 0 1-7.3 1.8c-20-12.2-45.1-15-74.6-8.4a5.3 5.3 0 1 1-2.3-10.3c32.2-7.2 60-4 82.4 9.5a5.3 5.3 0 0 1 1.8 7.4Zm10.5-23.3a6.6 6.6 0 0 1-9.1 2.2c-22.9-14.1-57.8-18.2-84.9-9.8a6.6 6.6 0 1 1-3.8-12.7c30.9-9.3 69.3-4.8 95.6 11.3a6.6 6.6 0 0 1 2.2 9Zm.9-24.3c-27.4-16.3-72.7-17.8-98.8-9.7a8 8 0 1 1-4.7-15.3c30-9.1 79.9-7.3 111.7 11.5a8 8 0 0 1-8.2 13.5Z" />
                    </svg>
                  </div>
                  <div className="spotify-card-content">
                    <h4>Spotify Playlist Request 🎵</h4>
                    {spotifyPlaylistUrl ? (
                      <a
                        href={spotifyPlaylistUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn outline spotify-open-btn"
                        title="Open Spotify playlist"
                      >
                        Open Spotify Playlist
                      </a>
                    ) : (
                      <p className="text-muted spotify-open-unset">Playlist link is not set yet.</p>
                    )}
                  </div>
                </div>
                <p className="text-muted spotify-limit">1 request per day.</p>
                <div className="spotify-form-grid">
                  <input className="input" placeholder="Song" value={song} onChange={(e) => setSong(e.target.value)} />
                  <input className="input" placeholder="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
                </div>
                  <button className="btn primary spotify-send-btn" type="button" onClick={sendSpotifyRequest}>Send request</button>
                {reqMsg && <p className="text-muted" style={{ marginTop: 8 }}>{reqMsg}</p>}
              </div>

              <div className="work-card glass-card">
                <h4>Games Hub 🎮</h4>
                <label className="text-muted">Game</label>
                <select className="input" value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)}>
                  <option value="wordle">Word Game</option>
                </select>
                <div className="btn-group" style={{ marginTop: 10 }}>
                  <a className="btn primary" href="/games">Play</a>
                  <a className="btn ghost" href="/leaderboards">Leaderboard</a>
                </div>
                <p className="text-muted" style={{ marginTop: 8 }}>Ready for multi-game support later.</p>
              </div>

              <div className="calendar-card glass-card">
                                <h4>{t("home_weekly_schedule")}</h4>
                <div className="weekly-schedule-grid">
                  {weeklySchedule.map((item) => (
                    <div key={item.day} className={`weekly-row ${item.title !== "—" ? "weekly-row-has-event" : ""}`}>
                      <div className="weekly-day">{WEEK_DAY_LABELS[item.day]}</div>
                      <div className="weekly-title">{item.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

        {selectedArticle && createPortal(
          <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
               <button className="modal-close" onClick={() => setSelectedArticle(null)} type="button">×</button>
              <h2 className="headline" style={{ textAlign: "center" }}>{selectedArticle.title}</h2>
              {selectedArticle.imageUrl && <img src={selectedArticle.imageUrl} style={{ width: "100%", borderRadius: 8, marginBottom: 20 }} alt={selectedArticle.title} />}

              <div className="modal-text">{selectedArticle.text}</div>
            </div>
                    </div>,
          document.body
        )}
      </div>
    </div>
  )
}
