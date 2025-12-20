import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

const CLOUDINARY_IMAGE_URL = "https://api.cloudinary.com/v1_1/dwezdx5zn/image/upload"
const CLOUDINARY_VIDEO_URL = "https://api.cloudinary.com/v1_1/dwezdx5zn/video/upload"
const UPLOAD_PRESET = "ml_default"
const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]
const [orders, setOrders] = useState([])

const NEWS_CATEGORIES = [
  "Sports",
  "E-Sports",
  "Photography",
  "Lifestyle",
  "Art",
  "Music",
  "Movies & Series",
  "Business",
  "Science",
  "Culture",
  "Health & Fitness",
  "Travel",
]

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

export default function AdminPanel() {
  const { user, loading } = useAuth()

  const [activeTab, setActiveTab] = useState("home")
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [msg, setMsg] = useState("")
  const [uploading, setUploading] = useState(false)

  // Newsletter
  const [subscribers, setSubscribers] = useState([])
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  // HERO (VFX)
  const [heroIssue, setHeroIssue] = useState(null)
  const [heroVfxUrl, setHeroVfxUrl] = useState("")

  // Article Form
  const [articleForm, setArticleForm] = useState({
    title: "",
    text: "",
    excerpt: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    imageUrl: "",
    articleCategory: "Lifestyle", // само за news
    isPremium: false,
  })

  // Magazine Form
  const [magForm, setMagForm] = useState({
    issueNumber: "",
    month: "January",
    year: new Date().getFullYear(),
    isLocked: true,
    coverUrl: "",
    pages: [],
    heroVfxUrl: "", // NEW
  })

  // добавяме hero tab
  const tabs = ["home", "news", "events", "gallery", "magazine", "hero", "newsletter", "orders"]

  useEffect(() => {
    if (!loading && user && ADMIN_EMAILS.includes(user.email)) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, activeTab])

  async function loadData() {
    try {
      if (activeTab === "magazine") {
        const res = await api.get("/magazines")
        setItems(res.data || [])
      } else if (activeTab === "hero") {
        const res = await api.get("/magazines")
        const list = res.data || []
        const first = list[0] || null
        setHeroIssue(first)
        setHeroVfxUrl(first?.heroVfxUrl || "")
      } else if (activeTab === "newsletter") {
        const res = await api.get("/newsletter/subscribers")
        setSubscribers(res.data || [])
      }
      else if (activeTab === "orders") {
  const res = await api.get("/admin/store/orders")
  setOrders(res.data || [])
}
 else {
        const res = await api.get(`/articles?category=${activeTab}`)
        setItems(res.data || [])
      }
      
    } catch (err) {
      console.error(err)
    }
  }

  // ---------------- IMAGE UPLOAD ----------------
  async function handleImageUpload(e, type) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", UPLOAD_PRESET)

    try {
      const res = await fetch(CLOUDINARY_IMAGE_URL, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (data.secure_url) {
        if (type === "cover") {
          setMagForm(prev => ({ ...prev, coverUrl: data.secure_url }))
        } else if (type === "page") {
          setMagForm(prev => ({ ...prev, pages: [...prev.pages, data.secure_url] }))
        } else {
          setArticleForm(prev => ({ ...prev, imageUrl: data.secure_url }))
        }
        setMsg("Image uploaded successfully! ✅")
      }
    } catch (error) {
      console.error(error)
      setMsg("Upload failed.")
    } finally {
      setUploading(false)
      e.target.value = null
    }
  }

  // ---------------- VIDEO UPLOAD (HERO VFX) ----------------
  async function handleHeroVideoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setMsg("")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", UPLOAD_PRESET)

    try {
      const res = await fetch(CLOUDINARY_VIDEO_URL, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (data.secure_url) {
        setHeroVfxUrl(data.secure_url)
        setMsg("Hero VFX video uploaded ✅ (don’t forget Save)")
      } else {
        setMsg("Video upload failed.")
      }
    } catch (error) {
      console.error(error)
      setMsg("Video upload failed.")
    } finally {
      setUploading(false)
      e.target.value = null
    }
  }

  async function saveHeroVfx() {
    if (!heroIssue?.id) {
      setMsg("No magazine issue found. Create an Issue first in Magazine tab.")
      return
    }
    try {
      setUploading(true)
      await api.put(`/magazines/${heroIssue.id}`, {
        ...heroIssue,
        heroVfxUrl: heroVfxUrl || null,
      })
      setMsg("Hero VFX saved ✅")
      loadData()
    } catch (err) {
      console.error(err)
      setMsg("Error saving Hero VFX.")
    } finally {
      setUploading(false)
    }
  }

  function removePage(indexToRemove) {
    setMagForm(prev => ({
      ...prev,
      pages: prev.pages.filter((_, idx) => idx !== indexToRemove),
    }))
  }

  // ---------------- SAVE ----------------
  async function handleSave(e) {
    e.preventDefault()
    try {
      if (activeTab === "magazine") {
        const dataToSave = {
          ...magForm,
          year: parseInt(magForm.year, 10) || new Date().getFullYear(),
          isLocked: !!magForm.isLocked,
          heroVfxUrl: magForm.heroVfxUrl || null,
        }
        if (editingId) {
          await api.put(`/magazines/${editingId}`, dataToSave)
        } else {
          await api.post("/magazines", dataToSave)
        }
        setMsg("Magazine saved!")
      } else if (activeTab === "newsletter" || activeTab === "hero") {
        return
      } else {
        const payload = {
          title: articleForm.title,
          text: activeTab === "gallery" ? "" : articleForm.text,
          excerpt: activeTab === "gallery" ? "" : articleForm.excerpt,
          date: articleForm.date,
          time: activeTab === "events" ? articleForm.time : null,
          imageUrl: articleForm.imageUrl,
          category: activeTab, // home | news | events | gallery
          articleCategory: activeTab === "news" ? articleForm.articleCategory : null,
          isPremium: articleForm.isPremium,
          author: user.displayName || "Admin",
        }

        if (editingId) {
          await api.put(`/articles/${editingId}`, payload)
        } else {
          await api.post("/articles", payload)
        }
        setMsg("Article saved!")
      }

      setTimeout(() => {
        resetForms()
        loadData()
      }, 800)
    } catch (err) {
      console.error(err)
      setMsg("Error: " + (err.response?.data?.error || err.message))
    }
  }

  // ---------------- DELETE ----------------
  async function handleDelete(id) {
    if (!window.confirm("Delete this item?")) return
    try {
      if (activeTab === "magazine") {
        await api.delete(`/magazines/${id}`)
      } else {
        await api.delete(`/articles/${id}`)
      }
      loadData()
    } catch (err) {
      alert("Error deleting.")
    }
  }

  // ---------------- NEWSLETTER SEND ----------------
  async function handleSendEmail(e) {
    e.preventDefault()
    try {
      const res = await api.post("/newsletter/send", {
        subject: emailSubject,
        body: emailBody,
      })
      setMsg(`Sent to ${res.data.count} subscribers.`)
      setEmailSubject("")
      setEmailBody("")
    } catch (err) {
      setMsg("Error sending emails.")
    }
  }

  // ---------------- EDIT ----------------
  function handleEdit(item) {
    setEditingId(item.id)

    if (activeTab === "magazine" || item.issueNumber) {
      setActiveTab("magazine")
      setMagForm({
        issueNumber: item.issueNumber || "",
        month: item.month || "January",
        year: item.year || new Date().getFullYear(),
        isLocked: !!item.isLocked,
        coverUrl: item.coverUrl || "",
        pages: Array.isArray(item.pages) ? item.pages : [],
        heroVfxUrl: item.heroVfxUrl || "",
      })
    } else if (activeTab === "newsletter" || activeTab === "hero") {
      return
    } else {
      setArticleForm({
        title: item.title || "",
        text: item.text || "",
        excerpt: item.excerpt || "",
        date: item.date ? item.date.split("T")[0] : new Date().toISOString().split("T")[0],
        time: item.time || "",
        imageUrl: item.imageUrl || "",
        articleCategory: item.articleCategory || "Lifestyle",
        isPremium: !!item.isPremium,
      })
    }

    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function resetForms() {
    setEditingId(null)
    setShowForm(false)
    setMsg("")
    setArticleForm({
      title: "",
      text: "",
      excerpt: "",
      date: new Date().toISOString().split("T")[0],
      time: "",
      imageUrl: "",
      articleCategory: "Lifestyle",
      isPremium: false,
    })
    setMagForm({
      issueNumber: "",
      month: "January",
      year: new Date().getFullYear(),
      isLocked: true,
      coverUrl: "",
      pages: [],
      heroVfxUrl: "",
    })
  }

  if (loading) return <div className="page"><p>Loading...</p></div>
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return <div className="page"><p>Access denied.</p></div>
  }

  return (
    <div className="page">
      <h2 className="headline">Admin Panel</h2>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
          borderBottom: "2px solid #ccc",
          paddingBottom: 12,
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              resetForms()
            }}
            className={`btn ${activeTab === tab ? "primary" : "ghost"}`}
            style={{ textTransform: "capitalize" }}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* HERO TAB */}
      {activeTab === "hero" && (
        <div className="stack">
          <h3>Hero Intro VFX</h3>
          <p style={{ color: "var(--text-muted)" }}>
            Upload a video that will show in the Home HeroIntro (autoplay, muted, loop).
          </p>

          {!heroIssue ? (
            <div className="card" style={{ padding: 18 }}>
              <p><strong>No magazine issue found.</strong></p>
              <p>Create at least one issue in the <b>Magazine</b> tab first.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ marginBottom: 10 }}>
                Current issue: <b>{heroIssue.issueNumber}</b> {heroIssue.month} {heroIssue.year}
              </div>

              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  background: "var(--bg-muted)",
                  border: "1px dashed var(--nav-border)",
                  borderRadius: 10,
                }}
              >
                <label style={{ fontWeight: "bold" }}>Upload Hero Video (mp4/webm)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleHeroVideoUpload}
                  disabled={uploading}
                  style={{ marginTop: 6, display: "block" }}
                />

                <div style={{ marginTop: 12 }}>
                  <label style={{ fontWeight: 700, fontSize: ".9rem" }}>Or paste URL</label>
                  <input
                    className="input"
                    placeholder="https://..."
                    value={heroVfxUrl}
                    onChange={(e) => setHeroVfxUrl(e.target.value)}
                    style={{ marginTop: 6 }}
                  />
                </div>

                {heroVfxUrl && (
                  <div style={{ marginTop: 14 }}>
                    <video
                      src={heroVfxUrl}
                      controls
                      style={{ width: "100%", borderRadius: 12, border: "1px solid var(--nav-border)" }}
                    />
                  </div>
                )}
              </div>

              <button
                className="btn primary"
                type="button"
                onClick={saveHeroVfx}
                disabled={uploading}
              >
                Save Hero VFX
              </button>

              {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
            </div>
          )}
        </div>
      )}

      {/* Newsletter tab */}
      {activeTab === "newsletter" && (
        <div className="stack">
          <h3>Newsletter Manager</h3>
          <p>
            Total Subscribers: <strong>{subscribers.length}</strong>
          </p>

          <div className="card" style={{ padding: 20 }}>
            <form onSubmit={handleSendEmail} className="form">
              <input
                className="input"
                placeholder="Subject"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                required
              />
              <textarea
                className="textarea"
                placeholder="Message."
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                required
                style={{ minHeight: 150 }}
              />
              <button
                className="btn primary"
                style={{ backgroundColor: "#e63946", color: "white" }}
              >
                Send to All
              </button>
            </form>
            {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
          </div>
        </div>
      )}

      {/* Add button */}
      {activeTab !== "newsletter" && activeTab !== "hero" && !showForm && (
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
          }}
          className="btn primary"
          style={{
            marginBottom: 24,
            backgroundColor: "#e63946",
            color: "white",
          }}
          type="button"
        >
          + Create New {activeTab === "magazine" ? "Issue" : "Article"}
        </button>
      )}

      {/* FORM */}
      {showForm && activeTab !== "newsletter" && activeTab !== "hero" && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 10 }}>
            {editingId ? "Edit" : "Create New"}{" "}
            {activeTab === "magazine" ? "Magazine Issue" : activeTab}
          </h3>

          <form onSubmit={handleSave}>
            {activeTab === "magazine" ? (
              // MAGAZINE FORM
              <div className="stack">
                <input
                  className="input"
                  placeholder="Issue Number (e.g. #1)"
                  value={magForm.issueNumber}
                  onChange={e =>
                    setMagForm(prev => ({ ...prev, issueNumber: e.target.value }))
                  }
                  required
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <select
                    className="input"
                    value={magForm.month}
                    onChange={e =>
                      setMagForm(prev => ({ ...prev, month: e.target.value }))
                    }
                  >
                    {MONTHS.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    value={magForm.year}
                    onChange={e =>
                      setMagForm(prev => ({ ...prev, year: e.target.value }))
                    }
                  />
                </div>

                <div
                  style={{
                    marginBottom: 10,
                    padding: 10,
                    background: "#f9f9f9",
                    border: "1px dashed #ccc",
                  }}
                >
                  <label style={{ fontWeight: "bold" }}>Cover Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleImageUpload(e, "cover")}
                    disabled={uploading}
                    style={{ marginTop: 5 }}
                  />
                  {magForm.coverUrl && (
                    <img
                      src={magForm.coverUrl}
                      alt="Cover"
                      style={{ height: 120, marginTop: 10, borderRadius: 5 }}
                    />
                  )}
                </div>

                <div
                  style={{
                    marginBottom: 10,
                    padding: 10,
                    background: "#f9f9f9",
                    border: "1px dashed #ccc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>Pages</span>
                    <label
                      style={{
                        padding: "6px 12px",
                        background: "#e63946",
                        color: "white",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      + Add Page
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleImageUpload(e, "page")}
                        style={{ display: "none" }}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  {magForm.pages.length === 0 && (
                    <p style={{ fontSize: "0.9rem" }}>No pages yet.</p>
                  )}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {magForm.pages.map((p, idx) => (
                      <div key={idx} style={{ position: "relative" }}>
                        <img
                          src={p}
                          alt={`Page ${idx + 1}`}
                          style={{ height: 100, borderRadius: 4 }}
                        />
                        <button
                          type="button"
                          onClick={() => removePage(idx)}
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            borderRadius: "50%",
                            border: "none",
                            background: "#e63946",
                            color: "white",
                            width: 20,
                            height: 20,
                            cursor: "pointer",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={magForm.isLocked}
                    onChange={e =>
                      setMagForm(prev => ({
                        ...prev,
                        isLocked: e.target.checked,
                      }))
                    }
                  />
                  <span
                    style={{
                      fontWeight: "bold",
                      color: magForm.isLocked ? "#e63946" : "green",
                    }}
                  >
                    {magForm.isLocked
                      ? "🔒 Premium Locked"
                      : "🔓 Free for Everyone"}
                  </span>
                </label>
              </div>
            ) : (
              // ARTICLE FORM
              <>
                <input
                  className="input"
                  type="text"
                  placeholder="Title"
                  value={articleForm.title}
                  onChange={e =>
                    setArticleForm(prev => ({ ...prev, title: e.target.value }))
                  }
                  required
                  style={{ width: "100%", marginBottom: 10 }}
                />

                {/* Image */}
                <div
                  style={{
                    marginBottom: 10,
                    padding: 10,
                    background: "#f9f9f9",
                    border: "1px dashed #ccc",
                  }}
                >
                  <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                    Article Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={e => handleImageUpload(e, "article")}
                    style={{ marginTop: 5 }}
                  />
                  {uploading && <span>Uploading...</span>}
                  {articleForm.imageUrl && (
                    <img
                      src={articleForm.imageUrl}
                      alt="preview"
                      style={{ height: 100, marginTop: 10, borderRadius: 5 }}
                    />
                  )}
                  <input
                    className="input"
                    placeholder="Or paste image URL"
                    value={articleForm.imageUrl}
                    onChange={e =>
                      setArticleForm(prev => ({
                        ...prev,
                        imageUrl: e.target.value,
                      }))
                    }
                    style={{ width: "100%", marginTop: 10 }}
                  />
                </div>

                {/* Date + Time */}
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <input
                    className="input"
                    type="date"
                    value={articleForm.date}
                    onChange={e =>
                      setArticleForm(prev => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    style={{ flex: 1 }}
                  />
                  {activeTab === "events" && (
                    <input
                      className="input"
                      type="time"
                      value={articleForm.time}
                      onChange={e =>
                        setArticleForm(prev => ({
                          ...prev,
                          time: e.target.value,
                        }))
                      }
                      style={{ flex: 1 }}
                    />
                  )}
                </div>

                {/* News category dropdown */}
                {activeTab === "news" && (
                  <select
                    className="input"
                    value={articleForm.articleCategory}
                    onChange={e =>
                      setArticleForm(prev => ({
                        ...prev,
                        articleCategory: e.target.value,
                      }))
                    }
                    style={{ width: "100%", marginBottom: 10 }}
                  >
                    {NEWS_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}

                {/* Short text & Long text (без gallery) */}
                {activeTab !== "gallery" && (
                  <>
                    <textarea
                      className="textarea"
                      placeholder="Short text (excerpt)..."
                      value={articleForm.excerpt}
                      onChange={e =>
                        setArticleForm(prev => ({
                          ...prev,
                          excerpt: e.target.value,
                        }))
                      }
                      style={{ width: "100%", minHeight: 60, marginBottom: 10 }}
                    />
                    <textarea
                      className="textarea"
                      placeholder="Full text..."
                      value={articleForm.text}
                      onChange={e =>
                        setArticleForm(prev => ({
                          ...prev,
                          text: e.target.value,
                        }))
                      }
                      style={{ width: "100%", minHeight: 120, marginBottom: 10 }}
                    />
                  </>
                )}

                {/* Premium checkbox */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={articleForm.isPremium}
                    onChange={e =>
                      setArticleForm(prev => ({
                        ...prev,
                        isPremium: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    {articleForm.isPremium ? "🔒 Premium only" : "🔓 Public (free)"}
                  </span>
                </label>
              </>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                type="submit"
                className="btn primary"
                style={{ backgroundColor: "#e63946", color: "white" }}
                disabled={uploading}
              >
                {editingId ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={resetForms}
                className="btn ghost"
              >
                Cancel
              </button>
            </div>
          </form>

          {msg && (
            <p
              style={{
                marginTop: 10,
                color: msg.startsWith("Error") ? "red" : "green",
              }}
            >
              {msg}
            </p>
          )}
        </div>
      )}

      {/* LIST */}
      {activeTab !== "newsletter" && activeTab !== "hero" && (
        <div className="stack">
          {items.map(item => (
            <div
              key={item.id}
              className="card inline"
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 10,
                borderBottom: "1px solid #eee",
              }}
            >
              <span>
                <strong>{item.title || `Issue #${item.issueNumber}`}</strong>{" "}
                {item.month || item.date}
              </span>
              <div>
                <button
                  onClick={() => handleEdit(item)}
                  style={{ marginRight: 10 }}
                  type="button"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{ color: "red" }}
                  type="button"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === "orders" && (
  <div className="stack">
    <h3>Orders</h3>
    <p style={{ color: "var(--text-muted)" }}>
      Paid orders from Stripe Checkout (no DB).
    </p>

    <button className="btn primary" type="button" onClick={loadData}>
      Refresh
    </button>

    {orders.length === 0 ? (
      <div className="card" style={{ padding: 18 }}>
        <p>No paid orders yet.</p>
      </div>
    ) : (
      <div className="stack">
        {orders.map((o) => (
          <div key={o.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div><b>Order:</b> {o.id}</div>
                <div className="text-muted">
                  {new Date((o.created || 0) * 1000).toLocaleString()}
                </div>
              </div>
              <div>
                <b>Total:</b> {(o.amount_total || 0) / 100} {String(o.currency || "").toUpperCase()}
              </div>
            </div>

            <hr style={{ margin: "12px 0" }} />

            <div><b>Three names:</b> {o.full_name || "-"}</div>
            <div><b>Email:</b> {o.customer_email || "-"}</div>
            <div><b>Phone:</b> {o.customer_phone || "-"}</div>

            {o.shipping_address && (
              <div style={{ marginTop: 10 }}>
                <b>Address:</b>
                <div className="text-muted">
                  {o.shipping_name ? <div>{o.shipping_name}</div> : null}
                  <div>{o.shipping_address.line1 || ""}</div>
                  {o.shipping_address.line2 ? <div>{o.shipping_address.line2}</div> : null}
                  <div>
                    {(o.shipping_address.postal_code || "")} {(o.shipping_address.city || "")}
                  </div>
                  <div>{o.shipping_address.country || ""}</div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <b>Items:</b>
              <div className="text-muted" style={{ marginTop: 6 }}>
                {(o.line_items || []).length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {o.line_items.map((li, idx) => (
                      <li key={idx}>
                        {li.description} x{li.quantity}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>-</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

    </div>
  )
}
