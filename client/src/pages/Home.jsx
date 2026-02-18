// client/src/pages/Home.jsx
"use client"

import { useEffect, useMemo, useState } from "react"
import NewsletterManager from "../components/NewsletterManager"
import { useAuth } from "../hooks/useAuth"
import { t } from "../lib/i18n"
import { api } from "../lib/api"
import HeroIntro from "./HeroIntro"
import { clearCart } from "../lib/cart"

function monthMatrix(year, monthIndex0) {
  const first = new Date(year, monthIndex0, 1)
  const last = new Date(year, monthIndex0 + 1, 0)
  const startDay = (first.getDay() + 6) % 7
  const total = last.getDate()
  const cells = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
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
    calendarEvents: calendarRaw,
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

  const now = new Date()
  const calendarDays = useMemo(() => monthMatrix(now.getFullYear(), now.getMonth()), [now])
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

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
      const key = String(e?.date || "")
      if (!key) continue
      m.set(key, String(e?.title || ""))
    }
    return m
  }, [calendarEvents])

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
        <div id="home-newsletter">
          <NewsletterManager user={user} type="static" />
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
          <p className="subhead">Loading…</p>
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
                      <h4 style={{ marginBottom: 12 }}>{f.title}</h4>

                     
                      {f.excerpt && <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: 15 }}>{f.excerpt}</p>}
                      <div style={{ marginTop: "auto" }}><button className="btn outline" onClick={() => !isLocked && setSelectedArticle(f)} disabled={isLocked} type="button">{t("read_more")}</button></div>
                    </div>
                  </div>
                )
              })}
            </div>
              <section className="home-work-grid">
              <div className="work-wide glass-card">
                <h3>Work with us ✨</h3>
                <p>Partnerships, sponsorships and custom brand campaigns with MIREN MAG. Let’s build something bold together.</p>
                <a className="btn primary" href="/opportunities">Open Partnerships</a>
              </div>

              <div className="work-card glass-card">
                <h4>Spotify Playlist Request 🎵</h4>
 {spotifyPlaylistUrl ? (
                  <a
                    href={spotifyPlaylistUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="spotify-link"
                    title="Open Spotify playlist"
                  >
                    {spotifyPlaylistUrl}
                  </a>
                ) : (
                  <p className="text-muted">Playlist link is not set yet.</p>
                )}                <p className="text-muted">1 request per day.</p>
                <input className="input" placeholder="Song" value={song} onChange={(e) => setSong(e.target.value)} />
                <input className="input" placeholder="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} style={{ marginTop: 8 }} />
                <button className="btn primary" type="button" style={{ marginTop: 10 }} onClick={sendSpotifyRequest}>Send request</button>
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
                <h4>{monthLabel} Calendar</h4>
                <div className="calendar-grid">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="cal-head">{d}</div>)}
                  {calendarDays.map((d, idx) => {
                    if (!d) return <div key={`e_${idx}`} className="cal-cell cal-empty" />
                    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                    const ev = eventMap.get(key)
                    return (
                      <div key={key} className={`cal-cell ${ev ? "cal-has-event" : ""}`} title={ev || ""}>
                        <div className="cal-day">{d}</div>
                        {ev && <div className="cal-event">{ev}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <p className="subhead">No featured articles yet.</p>
        )}

        {selectedArticle && (
          <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
               <button className="modal-close" onClick={() => setSelectedArticle(null)} type="button">×</button>
              <h2 className="headline" style={{ textAlign: "center" }}>{selectedArticle.title}</h2>
              {selectedArticle.imageUrl && <img src={selectedArticle.imageUrl} style={{ width: "100%", borderRadius: 8, marginBottom: 20 }} alt={selectedArticle.title} />}

              <div className="modal-text">{selectedArticle.text}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
