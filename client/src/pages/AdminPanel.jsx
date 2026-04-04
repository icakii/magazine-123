// client/src/pages/AdminPanel.jsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"

const ADMIN_EMAILS = ["icaki@mirenmagazine.com", "info@mirenmagazine.com", "info@mirenmagaizne.com"]
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
const TABS = [
  { key: "hero", label: "Hero" },            // ✅ single hero (no list)
  { key: "magazines", label: "Magazines" },  // ✅ full magazine issues (cover/pages/premium)
  { key: "home", label: "Home" },
  { key: "news", label: "News" },
  { key: "gallery", label: "Gallery" },
  { key: "events", label: "Events" },
  { key: "store", label: "Store Items" },
  { key: "orders", label: "Orders" },
  { key: "newsletter", label: "Newsletter" },
]

const NEWS_ARTICLE_CATEGORIES = [
  "Sports",
  "E-Sports",
  "Photography",
  "Lifestyle",
  "Fashion",
  "Art",
  "Music",
  "Movies & Series",
  "Business",
  "Science",
  "Culture",
  "Health & Fitness",
  "Travel",
]

function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email)
}

async function uploadToCloudinary(file) {
  const fd = new FormData()
  fd.append("file", file)

  const res = await api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  })

  return {
    url: res.data?.secure_url || res.data?.url || "",
    public_id: res.data?.public_id || "",
  }
}

function ymd(ts) {
  try {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ""
    return d.toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(String(url || ""))
}
function normalizeWeekdayKey(raw) {
  const value = String(raw || "").trim().toLowerCase()
  if (WEEK_DAYS.includes(value)) return value
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ""
  const idx = (d.getDay() + 6) % 7
  return WEEK_DAYS[idx] || ""
}
function normalizeHeroPayload(data) {
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

  const calendarEvents = calendarRaw
    .map((ev) => ({
      date: normalizeWeekdayKey(ev?.date || ev?.day),
      title: String(ev?.title || "").trim(),
    }))
    .filter((ev) => ev.date && ev.title)

  return {
    heroVfxUrl: String(data?.heroVfxUrl || data?.hero_vfx_url || "").trim(),
    heroMediaUrl: String(data?.heroMediaUrl || data?.hero_media_url || "").trim(),
    spotifyPlaylistUrl: String(data?.spotifyPlaylistUrl || data?.spotify_playlist_url || "").trim(),
    calendarEvents,
  }
}


export default function AdminPanel() {
  const { user, loading } = useAuth()

  const [activeTab, setActiveTab] = useState("hero")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)

  const authedEmail = user?.email || ""
  const canAccess = !loading && isAdminEmail(authedEmail)

  const currentCategory = useMemo(() => {
    if (["home", "news", "gallery", "events"].includes(activeTab)) return activeTab
    return null
  }, [activeTab])

  // ---------------- HERO (single) ----------------
const [heroVfxUrl, setHeroVfxUrl] = useState("")
  const [heroMediaUrl, setHeroMediaUrl] = useState("")
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState("")
  const [calendarJson, setCalendarJson] = useState("[]")
  const [calendarDraftDay, setCalendarDraftDay] = useState("monday")
  const [calendarDraftTitle, setCalendarDraftTitle] = useState("")

  const applyHeroState = (rawData) => {
    const normalized = normalizeHeroPayload(rawData || {})
    setHeroVfxUrl(normalized.heroVfxUrl)
    setHeroMediaUrl(normalized.heroMediaUrl)
    setSpotifyPlaylistUrl(normalized.spotifyPlaylistUrl)
    setCalendarJson(JSON.stringify(normalized.calendarEvents, null, 2))
    setCalendarDraftDay("monday")
    setCalendarDraftTitle("")
  }
  const loadHero = async () => {
    try {
            const res = await api.get("/hero", { params: { t: Date.now() } })
      applyHeroState(res.data || {})
    } catch (e) {
      setMsg((prev) => prev || e?.response?.data?.error || "Could not refresh hero settings right now.")
    }
  }

 const calendarEvents = useMemo(() => {
    try {
      const parsed = JSON.parse(calendarJson || "[]")
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((ev) => ({
          date: normalizeWeekdayKey(ev?.date || ev?.day),
          title: String(ev?.title || "").trim(),
        }))
        .filter((ev) => ev.date && ev.title)
         .sort((a, b) => WEEK_DAYS.indexOf(a.date) - WEEK_DAYS.indexOf(b.date))
    } catch {
      return []
    }
  }, [calendarJson])

  const applyCalendarEvents = (events) => {
    const normalized = Array.isArray(events)
      ? events
          .map((ev) => ({
            date: normalizeWeekdayKey(ev?.date || ev?.day),
            title: String(ev?.title || "").trim(),
          }))
          .filter((ev) => ev.date && ev.title)
      : []
    setCalendarJson(JSON.stringify(normalized, null, 2))
  }

  const addCalendarEvent = () => {
    const date = calendarDraftDay.trim()  
    const title = calendarDraftTitle.trim()
    if (!date || !title) {
        setMsg("Day and title are required for schedule item.")
      return
    }

    const next = [...calendarEvents]
    const idx = next.findIndex((ev) => ev.date === date)
    if (idx >= 0) {
      next[idx] = { date, title }
    } else {
      next.push({ date, title })
    }

    applyCalendarEvents(next)
    setCalendarDraftTitle("")
    setMsg("✅ Calendar event updated locally. Click Save Hero.")
  }

  const removeCalendarEvent = (date) => {
    const next = calendarEvents.filter((ev) => ev.date !== date)
    applyCalendarEvents(next)
    setMsg("✅ Calendar event removed locally. Click Save Hero.")
  }

  const editCalendarEvent = (eventItem) => {
    setCalendarDraftDay(eventItem?.date || "monday")
    setCalendarDraftTitle(eventItem?.title || "")
  }

  const saveHero = async () => {
    try {
      setBusy(true)
      setMsg("")
      let payloadCalendarEvents = []
      try {
        const parsed = JSON.parse(calendarJson || "[]")
        if (!Array.isArray(parsed)) {
          setMsg("Calendar JSON must be an array.")
          setBusy(false)
          return
        }
        payloadCalendarEvents = parsed
          .map((ev) => ({
            date: normalizeWeekdayKey(ev?.date || ev?.day),
            title: String(ev?.title || "").trim(),
          }))
          .filter((ev) => ev.date && ev.title)
              } catch {
        setMsg("Calendar JSON is invalid.")
        setBusy(false)
        return
      }

      const res = await api.put("/admin/hero", { heroVfxUrl, heroMediaUrl, spotifyPlaylistUrl, calendarEvents: payloadCalendarEvents })
      applyHeroState(res.data || {})
      setMsg("✅ Hero/Home settings updated.")
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to save hero settings.")
        } finally {
      setBusy(false)
    }
  }

  const onPickHeroVfx = async (file) => {
    if (!file) return
    try {
      setBusy(true)
 setMsg("Uploading hero media...")
      const out = await uploadToCloudinary(file)
      setHeroVfxUrl(out?.url || "")
      setMsg("✅ Uploaded. Now click Save.")
    } catch (e) {
      setMsg(e?.response?.data?.details || e?.response?.data?.error || "Hero media upload failed.")
      } finally {
      setBusy(false)
    }
  }

   const onPickHeroMedia = async (file) => {
    if (!file) return
    try {
      setBusy(true)
      setMsg("Uploading hero media...")
      const out = await uploadToCloudinary(file)
      setHeroMediaUrl(out?.url || "")
      setMsg("✅ Hero media uploaded. Now click Save.")
    } catch (e) {
      setMsg(e?.response?.data?.details || e?.response?.data?.error || "Hero media upload failed.")
    } finally {
      setBusy(false)
    }
  }

  // ---------------- MAGAZINES (full issues) ----------------
  const [issues, setIssues] = useState([])
  const [editingIssueId, setEditingIssueId] = useState(null)

  const [issueForm, setIssueForm] = useState({
    issueNumber: "",
    month: "",
    year: new Date().getFullYear(),
    isLocked: false,     // treat as Premium (locked)
    coverUrl: "",
    pages: [],           // array of URLs
  })

  const resetIssueForm = () => {
    setEditingIssueId(null)
    setIssueForm({
      issueNumber: "",
      month: "",
      year: new Date().getFullYear(),
      isLocked: false,
      coverUrl: "",
      pages: [],
    })
  }

  const startEditIssue = (it) => {
    setEditingIssueId(it.id)
    setIssueForm({
      issueNumber: it.issueNumber || "",
      month: it.month || "",
      year: it.year || new Date().getFullYear(),
      isLocked: !!it.isLocked,
      coverUrl: it.coverUrl || "",
      pages: Array.isArray(it.pages) ? it.pages : [],
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const saveIssue = async () => {
    try {
      setBusy(true)
      setMsg("")
      if (!issueForm.issueNumber.trim()) return setMsg("Issue number is required.")
      if (!issueForm.month.trim()) return setMsg("Month is required.")

      const payload = { ...issueForm }

      if (editingIssueId) {
        await api.put(`/magazines/${editingIssueId}`, payload)
        setMsg("✅ Magazine issue updated.")
      } else {
        await api.post("/magazines", payload)
        setMsg("✅ Magazine issue created.")
      }

      const res = await api.get("/magazines")
      setIssues(Array.isArray(res.data) ? res.data : [])
      resetIssueForm()
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to save magazine issue.")
    } finally {
      setBusy(false)
    }
  }

  const deleteIssue = async (id) => {
    if (!id) return
    try {
      setBusy(true)
      setMsg("")
      await api.delete(`/magazines/${id}`)
      setIssues((p) => p.filter((x) => x.id !== id))
      setMsg("🗑️ Deleted.")
      if (editingIssueId === id) resetIssueForm()
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to delete.")
    } finally {
      setBusy(false)
    }
  }

  const onPickCover = async (file) => {
    if (!file) return
    try {
      setBusy(true)
      setMsg("Uploading cover...")
      const out = await uploadToCloudinary(file)
      setIssueForm((p) => ({ ...p, coverUrl: out?.url || "" }))
      setMsg("✅ Cover uploaded.")
    } catch (e) {
      setMsg(e?.response?.data?.details || e?.response?.data?.error || "Cover upload failed.")
    } finally {
      setBusy(false)
    }
  }

  const onPickPages = async (files) => {
    const arr = Array.from(files || []).filter(Boolean)
    if (!arr.length) return
    try {
      setBusy(true)
      setMsg("Uploading pages...")
      const uploads = []
      for (const f of arr) {
        // eslint-disable-next-line no-await-in-loop
        const out = await uploadToCloudinary(f)
        if (out?.url) uploads.push(out.url)
      }
      setIssueForm((p) => ({ ...p, pages: [...(p.pages || []), ...uploads] }))
      setMsg("✅ Pages uploaded.")
    } catch (e) {
      setMsg(e?.response?.data?.details || e?.response?.data?.error || "Pages upload failed.")
    } finally {
      setBusy(false)
    }
  }

  const removePageAt = (idx) => {
    setIssueForm((p) => ({
      ...p,
      pages: (p.pages || []).filter((_, i) => i !== idx),
    }))
  }

  // ---------------- ARTICLES ----------------
  const [articles, setArticles] = useState([])
  const [editingArticleId, setEditingArticleId] = useState(null)

  const [articleForm, setArticleForm] = useState({
    title: "",
    text: "",
    excerpt: "",
    imageUrl: "",
    author: "MIREN",
    date: new Date().toISOString().slice(0, 10),
    category: "home",
    articleCategory: "",
    isPremium: false,
    time: "",
    reminderEnabled: false,
  })

  const resetArticleForm = () => {
    setEditingArticleId(null)
    setArticleForm({
      title: "",
      text: "",
      excerpt: "",
      imageUrl: "",
      author: "MIREN",
      date: new Date().toISOString().slice(0, 10),
      category: currentCategory || "home",
      articleCategory: "",
      isPremium: false,
      time: "",
      reminderEnabled: false,
    })
  }

  const startEditArticle = (a) => {
    setEditingArticleId(a.id)
    setArticleForm({
      title: a.title || "",
      text: a.text || "",
      excerpt: a.excerpt || "",
      imageUrl: a.imageUrl || "",
      author: a.author || "MIREN",
      date: a.date ? String(a.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      category: a.category || currentCategory || "home",
      articleCategory: a.articleCategory || "",
      isPremium: !!a.isPremium,
      time: a.time || "",
      reminderEnabled: !!a.reminderEnabled,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const saveArticle = async () => {
    if (!articleForm.title.trim()) return setMsg("Title is required.")
    const targetCategory = currentCategory || articleForm.category || "home"
    if (!targetCategory) return setMsg("Category is required.")

    try {
      setBusy(true)
      setMsg("")
      const payload = { ...articleForm, category: targetCategory }

      if (editingArticleId) {
        await api.put(`/articles/${editingArticleId}`, payload)
        setMsg("✅ Article updated.")
      } else {
        await api.post("/articles", payload)
        setMsg("✅ Article created.")
      }

      if (currentCategory) {
        const res = await api.get(`/articles?category=${encodeURIComponent(currentCategory)}`)
        setArticles(Array.isArray(res.data) ? res.data : [])
      }
      resetArticleForm()
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to save article.")
    } finally {
      setBusy(false)
    }
  }

  const deleteArticle = async (id) => {
    if (!id) return
    try {
      setBusy(true)
      setMsg("")
      await api.delete(`/articles/${id}`)
      setMsg("🗑️ Deleted.")
      setArticles((prev) => prev.filter((x) => x.id !== id))
      if (editingArticleId === id) resetArticleForm()
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to delete.")
    } finally {
      setBusy(false)
    }
  }

  const onPickArticleMedia = async (file) => {
    if (!file) return
    try {
      setBusy(true)
      setMsg("Uploading...")
      const out = await uploadToCloudinary(file)
      setArticleForm((p) => ({ ...p, imageUrl: out?.url || "" }))
      setMsg("✅ Uploaded.")
    } catch (e) {
      setMsg(e?.response?.data?.details || e?.response?.data?.error || "Upload failed.")
    } finally {
      setBusy(false)
    }
  }

  // ---------------- STORE/ORDERS/NEWSLETTER loaders ----------------
  const [storeItems, setStoreItems] = useState([])
  const [orders, setOrders] = useState([])
  const [subscribers, setSubscribers] = useState([])
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  const sendNewsletter = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) return setMsg("Subject and body are required.")
    try {
      setBusy(true)
      setMsg("")
      const res = await api.post("/newsletter/send", { subject: emailSubject, body: emailBody })
      setMsg(`✅ Sent to ${res?.data?.count || 0} recipients.`)
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to send newsletter.")
    } finally {
      setBusy(false)
    }
  }

  // ----------- Main loader by tab -----------
  useEffect(() => {
    if (!canAccess) return

    const load = async () => {
      try {
        setMsg("")

        if (activeTab === "hero") {
          await loadHero()
          return
        }

        if (activeTab === "magazines") {
          const res = await api.get("/magazines")
          setIssues(Array.isArray(res.data) ? res.data : [])
          return
        }

        if (currentCategory) {
          const res = await api.get(`/articles?category=${encodeURIComponent(currentCategory)}`)
          setArticles(Array.isArray(res.data) ? res.data : [])
          return
        }

        if (activeTab === "store") {
          const res = await api.get("/store/items")
          setStoreItems(Array.isArray(res.data) ? res.data : [])
          return
        }

        if (activeTab === "orders") {
          const res = await api.get("/admin/store/orders")
          setOrders(Array.isArray(res.data) ? res.data : [])
          return
        }

        if (activeTab === "newsletter") {
          const res = await api.get("/newsletter/subscribers")
          setSubscribers(Array.isArray(res.data) ? res.data : [])
          return
        }
      } catch (e) {
        setMsg(e?.response?.data?.error || e?.response?.data?.details || "Failed to load admin data.")
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, canAccess, currentCategory])

  if (loading) return <div className="page"><p>Loading…</p></div>

  if (!canAccess) {
    return (
      <div className="page">
        <h2 className="headline">Admin</h2>
        <p className="msg warning">Access denied.</p>
      </div>
    )
  }

  return (
    <div className="page admin-page">
      <div className="admin-top">
        <h2 className="headline">Admin Panel</h2>
        <p className="subhead">
          Logged in as: <b>{authedEmail}</b>
        </p>

        {msg && (
          <p className={`msg ${msg.startsWith("✅") ? "success" : msg.startsWith("🗑️") ? "warning" : ""}`}>
            {msg}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="admin-tabs" role="tablist" aria-label="Admin tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab ${activeTab === t.key ? "tab--on" : ""}`}
            onClick={() => {
              setActiveTab(t.key)
              setMsg("")
              if (["home", "news", "gallery", "events"].includes(t.key)) resetArticleForm()
              if (t.key !== "magazines") {
                setEditingIssueId(null)
                resetIssueForm()
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* HERO (single) */}
      {activeTab === "hero" && (
        <div className="admin-grid admin-grid--single">
          <div className="admin-card">
            <h3 className="headline">Hero</h3>
   <p className="text-muted">Hero is separate from the latest magazine cover. Configure VFX, fallback media and home widgets here.</p>
            <div className="upload-row">
              <div className="upload-box" style={{ width: "100%" }}>
 <div className="upload-title">Hero main media (image, GIF, or video)</div>
                {heroVfxUrl ? (
isVideoUrl(heroVfxUrl) ? (
                    <video className="preview-video" src={heroVfxUrl} controls />
                  ) : (
                    <img className="preview-img" src={heroVfxUrl} alt="Hero main media" />
                  )
                
                ) : (
                  <div className="preview-ph">No main media</div>
                )}

                <input type="file" accept="image/*,video/*" onChange={(e) => onPickHeroVfx(e.target.files?.[0])} disabled={busy} />
              </div>
            </div>

                        <div className="upload-row" style={{ marginTop: 12 }}>
              <div className="upload-box" style={{ width: "100%" }}>
                <div className="upload-title">Hero fallback media (separate from magazine cover)</div>
                {heroMediaUrl ? (
                  isVideoUrl(heroMediaUrl) ? (
                    <video className="preview-video" src={heroMediaUrl} controls />
                  ) : (
                    <img className="preview-img" src={heroMediaUrl} alt="Hero media" />
                  )                ) : (
                  <div className="preview-ph">No fallback media</div>
                )}
                <input type="file" accept="image/*,video/*" onChange={(e) => onPickHeroMedia(e.target.files?.[0])} disabled={busy} />
                <input value={heroMediaUrl} onChange={(e) => setHeroMediaUrl(e.target.value)} placeholder="https://..." style={{ marginTop: 8 }} />
              </div>
            </div>

            <div className="upload-row" style={{ marginTop: 12 }}>
              <div className="upload-box" style={{ width: "100%" }}>
                <div className="upload-title">Spotify playlist link</div>
                <input value={spotifyPlaylistUrl} onChange={(e) => setSpotifyPlaylistUrl(e.target.value)} placeholder="https://open.spotify.com/..." />
                                {spotifyPlaylistUrl && (
                  <a href={spotifyPlaylistUrl} target="_blank" rel="noreferrer" className="spotify-link" style={{ marginTop: 10 }}>
                    Open current playlist
                  </a>
                )}
              </div>
            </div>

            <div className="upload-row" style={{ marginTop: 12 }}>
              <div className="upload-box" style={{ width: "100%" }}>
                <div className="upload-title">Home calendar manager</div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, alignItems: "end", marginBottom: 12 }}>
                  <label className="field" style={{ margin: 0 }}>
                                       <span>Day</span>
                    <select value={calendarDraftDay} onChange={(e) => setCalendarDraftDay(e.target.value)}>
                      {WEEK_DAYS.map((day) => (
                        <option key={day} value={day}>
                          {WEEK_DAY_LABELS[day]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field" style={{ margin: 0 }}>
                    <span>Title</span>
                    <input
                      value={calendarDraftTitle}
                      onChange={(e) => setCalendarDraftTitle(e.target.value)}
                      placeholder="Launch / Editorial / Event..."
                    />
                  </label>
                  <button className="btn ghost" type="button" onClick={addCalendarEvent}>
                    Add / Update
                  </button>
                </div>

                <div className="preview-ph" style={{ textAlign: "left", minHeight: 72 }}>
                  {calendarEvents.length === 0 ? (
                    <span>No calendar events yet.</span>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {calendarEvents.map((ev) => (
                        <div
                          key={ev.date}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <code>{WEEK_DAY_LABELS[ev.date] || ev.date}</code>
                          <span>{ev.title}</span>
                          <button className="btn ghost" type="button" onClick={() => editCalendarEvent(ev)}>
                            Edit
                          </button>
                          <button className="btn ghost" type="button" onClick={() => removeCalendarEvent(ev.date)}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <details style={{ marginTop: 10 }}>
                  <summary>Advanced: edit raw JSON</summary>
                  <div className="upload-title" style={{ marginTop: 8 }}>
 {'Weekly schedule JSON (e.g. [{"day":"monday","title":"Launch"}])'}
                   </div>
                  <textarea rows={8} style={{ width: "100%" }} value={calendarJson} onChange={(e) => setCalendarJson(e.target.value)} />
                </details>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn primary" onClick={saveHero} disabled={busy} type="button">
                Save Hero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAGAZINES (full) */}
      {activeTab === "magazines" && (
        <div className="admin-grid">
          <div className="admin-card">
            <h3 className="headline">Magazine Issue</h3>

            <div className="form-grid">
              <label className="field">
                <span>Issue Number</span>
                <input value={issueForm.issueNumber} onChange={(e) => setIssueForm((p) => ({ ...p, issueNumber: e.target.value }))} />
              </label>

              <label className="field">
                <span>Month</span>
                <input value={issueForm.month} onChange={(e) => setIssueForm((p) => ({ ...p, month: e.target.value }))} />
              </label>

              <label className="field">
                <span>Year</span>
                <input type="number" value={issueForm.year} onChange={(e) => setIssueForm((p) => ({ ...p, year: Number(e.target.value) }))} />
              </label>

              <label className="field row">
                <input
                  type="checkbox"
                  checked={!!issueForm.isLocked}
                  onChange={(e) => setIssueForm((p) => ({ ...p, isLocked: e.target.checked }))}
                />
                <span>Premium (locked)</span>
              </label>
            </div>

            <div className="upload-row">
              <div className="upload-box">
                <div className="upload-title">Cover Image</div>
                {issueForm.coverUrl ? <img src={issueForm.coverUrl} alt="cover" className="preview-img" /> : <div className="preview-ph">No cover</div>}
                <input type="file" accept="image/*" onChange={(e) => onPickCover(e.target.files?.[0])} disabled={busy} />
              </div>

              <div className="upload-box">
                <div className="upload-title">Pages (multiple)</div>
                <div className="preview-ph" style={{ textAlign: "left" }}>
                  Upload pages or paste URLs below.
                </div>
                <input type="file" accept="image/*" multiple onChange={(e) => onPickPages(e.target.files)} disabled={busy} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="upload-title">Pages URLs</div>
              <textarea
                rows={6}
                value={(issueForm.pages || []).join("\n")}
                onChange={(e) =>
                  setIssueForm((p) => ({
                    ...p,
                    pages: String(e.target.value || "")
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="One URL per line..."
              />

              {Array.isArray(issueForm.pages) && issueForm.pages.length > 0 && (
                <div className="pages-list">
                  {issueForm.pages.map((u, i) => (
                    <div key={`${u}-${i}`} className="pages-row">
                      <span className="pages-url">{u}</span>
                      <button className="btn secondary" type="button" onClick={() => removePageAt(i)} disabled={busy}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="btn-row">
              <button className="btn primary" onClick={saveIssue} disabled={busy} type="button">
                {editingIssueId ? "Update Issue" : "Create Issue"}
              </button>

              <button className="btn ghost" onClick={resetIssueForm} disabled={busy} type="button">
                Reset
              </button>

              {editingIssueId && (
                <button className="btn secondary" onClick={() => deleteIssue(editingIssueId)} disabled={busy} type="button">
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="admin-card">
            <h3 className="headline">Existing Issues</h3>

            {issues.length === 0 ? (
              <p className="text-muted">No issues yet.</p>
            ) : (
              <div className="list">
                {issues.map((it) => (
                  <div key={it.id} className="list-row">
                    <div className="list-main">
                      <div className="list-title">
                        #{it.issueNumber} • {it.month} {it.year} {it.isLocked ? "🔒" : "🌍"}
                      </div>
                      <div className="list-sub text-muted">
                        cover: {it.coverUrl ? "yes" : "no"} • pages: {Array.isArray(it.pages) ? it.pages.length : 0}
                      </div>
                    </div>
                    <div className="list-actions">
                      <button className="btn ghost" type="button" onClick={() => startEditIssue(it)}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ARTICLES (Home/News/Gallery/Events) */}
      {currentCategory && (
        <div className="admin-grid">
          <div className="admin-card">
            <h3 className="headline">Articles ({currentCategory.toUpperCase()})</h3>

            <div className="form-grid">
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Title</span>
                <input value={articleForm.title} onChange={(e) => setArticleForm((p) => ({ ...p, title: e.target.value }))} />
              </label>

              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Excerpt</span>
                <textarea rows={3} value={articleForm.excerpt} onChange={(e) => setArticleForm((p) => ({ ...p, excerpt: e.target.value }))} />
              </label>

              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Text</span>
                <textarea rows={8} value={articleForm.text} onChange={(e) => setArticleForm((p) => ({ ...p, text: e.target.value }))} />
              </label>

              <label className="field">
                <span>Date</span>
                <input type="date" value={articleForm.date} onChange={(e) => setArticleForm((p) => ({ ...p, date: e.target.value }))} />
              </label>

              <label className="field">
                <span>Author</span>
                <input value={articleForm.author} onChange={(e) => setArticleForm((p) => ({ ...p, author: e.target.value }))} />
              </label>

              {currentCategory === "news" && (
                <label className="field">
                  <span>News Category (optional)</span>
                  <select
                    value={articleForm.articleCategory}
                    onChange={(e) => setArticleForm((p) => ({ ...p, articleCategory: e.target.value }))}
                  >
                    <option value="">Select a category</option>
                    {NEWS_ARTICLE_CATEGORIES.map((categoryOption) => (
                      <option key={categoryOption} value={categoryOption}>
                        {categoryOption}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {currentCategory === "events" && (
                <>
                  <label className="field">
                    <span>Time (optional)</span>
                    <input value={articleForm.time} onChange={(e) => setArticleForm((p) => ({ ...p, time: e.target.value }))} placeholder="18:30" />
                  </label>

                  <label className="field row">
                    <input
                      type="checkbox"
                      checked={!!articleForm.reminderEnabled}
                      onChange={(e) => setArticleForm((p) => ({ ...p, reminderEnabled: e.target.checked }))}
                    />
                    <span>Reminder Enabled</span>
                  </label>
                </>
              )}

              <label className="field row">
                <input type="checkbox" checked={!!articleForm.isPremium} onChange={(e) => setArticleForm((p) => ({ ...p, isPremium: e.target.checked }))} />
                <span>Premium</span>
              </label>
            </div>

            <div className="upload-row" style={{ marginTop: 10 }}>
              <div className="upload-box" style={{ width: "100%" }}>
                <div className="upload-title">Image / Media URL</div>

                {articleForm.imageUrl ? (
                  isVideoUrl(articleForm.imageUrl) ? (
                    <video className="preview-video" src={articleForm.imageUrl} controls />
                  ) : (
                    <img className="preview-img" src={articleForm.imageUrl} alt="article" />
                  )
                ) : (
                  <div className="preview-ph">No media</div>
                )}

                <div className="upload-inline">
                  <input
                    value={articleForm.imageUrl}
                    onChange={(e) => setArticleForm((p) => ({ ...p, imageUrl: e.target.value }))}
                    placeholder="https://..."
                    style={{ flex: 1 }}
                  />
                  <label className="btn ghost" style={{ cursor: busy ? "not-allowed" : "pointer" }}>
                    Upload
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => onPickArticleMedia(e.target.files?.[0])}
                      disabled={busy}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn primary" onClick={saveArticle} disabled={busy} type="button">
                {editingArticleId ? "Update Article" : "Create Article"}
              </button>
              <button className="btn ghost" onClick={resetArticleForm} disabled={busy} type="button">
                Reset
              </button>
              {editingArticleId && (
                <button className="btn secondary" onClick={() => deleteArticle(editingArticleId)} disabled={busy} type="button">
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="admin-card">
            <h3 className="headline">{currentCategory.toUpperCase()} list</h3>

            {articles.length === 0 ? (
              <p className="text-muted">No articles.</p>
            ) : (
              <div className="list">
                {articles.map((a) => (
                  <div key={a.id} className="list-row">
                    <div className="list-main">
                      <div className="list-title">
                        {a.title} {a.isPremium ? "🔒" : ""}
                      </div>
                      <div className="list-sub text-muted">
                        {String(a.date || "").slice(0, 10)} • {a.author || "MIREN"}
                      </div>
                    </div>
                    <div className="list-actions">
                      <button className="btn ghost" type="button" onClick={() => startEditArticle(a)}>
                        Edit
                      </button>
                      <button className="btn secondary" type="button" onClick={() => deleteArticle(a.id)} disabled={busy}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STORE ITEMS */}
      {activeTab === "store" && (
        <div className="admin-card">
          <h3 className="headline">Store Items (read-only here)</h3>
          <p className="text-muted">CRUD можеш да го държиш в отделния ти UI или да кажеш и ще добавя.</p>

          {storeItems.length === 0 ? (
            <p className="text-muted">No items.</p>
          ) : (
            <div className="list">
              {storeItems.map((it) => (
                <div className="list-row" key={it.id || it.priceId}>
                  <div className="list-main">
                    <div className="list-title">{it.title}</div>
                    <div className="list-sub text-muted">
                      {it.priceId} • active: {String(!!it.isActive)} • release: {it.releaseAt ? ymd(it.releaseAt) : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS */}
      {activeTab === "orders" && (
        <div className="admin-card">
          <h3 className="headline">Orders</h3>

          {orders.length === 0 ? (
            <p className="text-muted">No paid orders.</p>
          ) : (
            <div className="list">
              {orders.map((o) => (
                <div key={o.id} className="list-row">
                  <div className="list-main">
                    <div className="list-title">
                      {o.full_name ? `${o.full_name} • ` : ""}
                      {o.customer_email || "(no email)"}
                    </div>

                    <div className="list-sub text-muted">
                      {new Date((o.created || 0) * 1000).toLocaleString()} • {(o.amount_total || 0) / 100}{" "}
                      {String(o.currency || "").toUpperCase()} • {o.customer_phone || "no phone"}
                    </div>

                    {Array.isArray(o.line_items) && o.line_items.length > 0 && (
                      <div className="mini">
                        {o.line_items.map((li, idx) => (
                          <div key={idx} className="mini-row">
                            • {li.description} x{li.quantity}
                          </div>
                        ))}
                      </div>
                    )}

                    {o.shipping_address && (
                      <div className="mini text-muted">
                        {o.shipping_name || ""} • {o.shipping_address.line1 || ""},{" "}
                        {o.shipping_address.city || ""} {o.shipping_address.postal_code || ""},{" "}
                        {o.shipping_address.country || ""}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NEWSLETTER */}
      {activeTab === "newsletter" && (
        <div className="admin-grid">
          <div className="admin-card">
            <h3 className="headline">Audience</h3>
            {subscribers.length === 0 ? (
              <p className="text-muted">No newsletter subscribers yet.</p>
            ) : (
              <div className="list">
                {subscribers.map((s, i) => (
                  <div key={s.email || i} className="list-row">
                    <div className="list-main">
                      <div className="list-title">{s.email}</div>
                      <div className="list-sub text-muted">{s.created_at ? new Date(s.created_at).toLocaleString() : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-card">
            <h3 className="headline">Send Newsletter</h3>
                        <p className="text-muted">Sends to all registered accounts + newsletter subscribers.</p>
            <label className="field">
              <span>Subject</span>
              <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </label>

            <label className="field">
              <span>Body (HTML allowed)</span>
              <textarea rows={10} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
            </label>

            <button className="btn primary" onClick={sendNewsletter} disabled={busy} type="button">
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
