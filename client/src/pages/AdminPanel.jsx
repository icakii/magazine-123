// client/src/pages/AdminPanel.jsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]

const TABS = [
  { key: "hero", label: "Hero" },
  { key: "home", label: "Home" },
  { key: "news", label: "News" },
  { key: "gallery", label: "Gallery" },
  { key: "events", label: "Events" },
  { key: "store", label: "Store Items" },
  { key: "orders", label: "Orders" },
  { key: "newsletter", label: "Newsletter" },
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
  url: res.data?.secure_url || res.data?.url,
  public_id: res.data?.public_id,
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

export default function AdminPanel() {
  const { user, loading } = useAuth()

  const [activeTab, setActiveTab] = useState("hero")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)

  // Articles per category
  const [articles, setArticles] = useState([])
  const [selectedArticle, setSelectedArticle] = useState(null)

  // Magazine issues (Hero)
  const [issues, setIssues] = useState([])
  const [issueForm, setIssueForm] = useState({
    issueNumber: "",
    month: "",
    year: new Date().getFullYear(),
    isLocked: true,
    coverUrl: "",
    heroVfxUrl: "",
    pages: [],
  })
  const [editingIssueId, setEditingIssueId] = useState(null)

  // Store items
  const [storeItems, setStoreItems] = useState([])

  // Orders
  const [orders, setOrders] = useState([])

  // Newsletter
  const [subscribers, setSubscribers] = useState([])
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  // Article form
  const [articleForm, setArticleForm] = useState({
    title: "",
    text: "",
    excerpt: "",
    imageUrl: "",
    author: "MIREN",
    date: new Date().toISOString().slice(0, 10),
    category: "home", // home|news|gallery|events
    articleCategory: "", // optional extra category for "news" if you use it
    isPremium: false,
    time: "", // events time
    reminderEnabled: false,
  })
  const [editingArticleId, setEditingArticleId] = useState(null)

  const authedEmail = user?.email || ""
  const canAccess = !loading && isAdminEmail(authedEmail)

  const currentCategory = useMemo(() => {
    if (["home", "news", "gallery", "events"].includes(activeTab)) return activeTab
    return null
  }, [activeTab])

  // Loaders
  useEffect(() => {
    if (!canAccess) return

    const load = async () => {
      try {
        setMsg("")
        if (activeTab === "hero") {
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
        setMsg(e?.response?.data?.error || "Failed to load admin data.")
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, canAccess, currentCategory])

  // ======== ARTICLES CRUD ========
  const resetArticleForm = () => {
    setEditingArticleId(null)
    setSelectedArticle(null)
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
    setSelectedArticle(a)
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
    if (!articleForm.category) return setMsg("Category is required.")

    try {
      setBusy(true)
      setMsg("")

      const payload = { ...articleForm }

      if (editingArticleId) {
        await api.put(`/articles/${editingArticleId}`, payload)
        setMsg("✅ Article updated.")
      } else {
        await api.post("/articles", payload)
        setMsg("✅ Article created.")
      }

      // reload
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

  const onPickArticleImage = async (file) => {
    if (!file) return
    try {
      setBusy(true)
      setMsg("Uploading...")
      const out = await uploadToCloudinary(file)
      // IMPORTANT: set https url returned by cloudinary
      setArticleForm((p) => ({ ...p, imageUrl: out?.url || "" }))
      setMsg("✅ Uploaded.")
    } catch (e) {
      setMsg(e?.response?.data?.error || "Upload failed.")
    } finally {
      setBusy(false)
    }
  }

  // ======== HERO / MAGAZINES ========
  const resetIssueForm = () => {
    setEditingIssueId(null)
    setIssueForm({
      issueNumber: "",
      month: "",
      year: new Date().getFullYear(),
      isLocked: true,
      coverUrl: "",
      heroVfxUrl: "",
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
      heroVfxUrl: it.heroVfxUrl || "",
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
        setMsg("✅ Issue updated.")
      } else {
        await api.post("/magazines", payload)
        setMsg("✅ Issue created.")
      }

      const res = await api.get("/magazines")
      setIssues(Array.isArray(res.data) ? res.data : [])
      resetIssueForm()
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to save issue.")
    } finally {
      setBusy(false)
    }
  }

  const deleteIssue = async (id) => {
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
      setMsg(e?.response?.data?.error || "Cover upload failed.")
    } finally {
      setBusy(false)
    }
  }

  const onPickHeroVfx = async (file) => {
    if (!file) return
    try {
      setBusy(true)
      setMsg("Uploading hero video...")
      const out = await uploadToCloudinary(file)
      setIssueForm((p) => ({ ...p, heroVfxUrl: out?.url || "" }))
      setMsg("✅ Hero video uploaded.")
    } catch (e) {
      setMsg(e?.response?.data?.error || "Video upload failed.")
    } finally {
      setBusy(false)
    }
  }

  // ======== NEWSLETTER ========
  const sendNewsletter = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      return setMsg("Subject and body are required.")
    }
    try {
      setBusy(true)
      setMsg("")
      const res = await api.post("/newsletter/send", {
        subject: emailSubject,
        body: emailBody,
      })
      setMsg(`✅ Sent to ${res?.data?.count || 0} subscribers.`)
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to send newsletter.")
    } finally {
      setBusy(false)
    }
  }

  // ======== UI helpers ========
  const CategoryChips = () => (
    <div className="admin-chips">
      {["home", "news", "gallery", "events"].map((k) => (
        <button
          key={k}
          type="button"
          className={`chip ${activeTab === k ? "chip--on" : ""}`}
          onClick={() => {
            setActiveTab(k)
            resetArticleForm()
          }}
        >
          {k.toUpperCase()}
        </button>
      ))}
    </div>
  )

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
    <div className="page">
      <div className="admin-top">
        <h2 className="headline">Admin Panel</h2>
        <p className="subhead">Logged in as: <b>{authedEmail}</b></p>
        {msg && <p className={`msg ${msg.startsWith("✅") ? "success" : msg.startsWith("🗑️") ? "warning" : ""}`}>{msg}</p>}
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab ${activeTab === t.key ? "tab--on" : ""}`}
            onClick={() => {
              setActiveTab(t.key)
              setMsg("")
              if (["home", "news", "gallery", "events"].includes(t.key)) resetArticleForm()
              if (t.key !== "hero") setEditingIssueId(null)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* HERO TAB */}
      {activeTab === "hero" && (
        <div className="admin-grid">
          <div className="admin-card">
            <h3 className="headline">Hero / Magazine Issue</h3>

            <div className="form-grid">
              <label className="field">
                <span>Issue Number</span>
                <input value={issueForm.issueNumber} onChange={(e) => setIssueForm(p => ({ ...p, issueNumber: e.target.value }))} />
              </label>

              <label className="field">
                <span>Month</span>
                <input value={issueForm.month} onChange={(e) => setIssueForm(p => ({ ...p, month: e.target.value }))} />
              </label>

              <label className="field">
                <span>Year</span>
                <input type="number" value={issueForm.year} onChange={(e) => setIssueForm(p => ({ ...p, year: Number(e.target.value) }))} />
              </label>

              <label className="field row">
                <input
                  type="checkbox"
                  checked={!!issueForm.isLocked}
                  onChange={(e) => setIssueForm((p) => ({ ...p, isLocked: e.target.checked }))}
                />
                <span>Locked</span>
              </label>
            </div>

            <div className="upload-row">
              <div className="upload-box">
                <div className="upload-title">Cover Image</div>
                {issueForm.coverUrl ? (
                  <img src={issueForm.coverUrl} alt="cover" className="preview-img" />
                ) : (
                  <div className="preview-ph">No cover</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickCover(e.target.files?.[0])}
                  disabled={busy}
                />
              </div>

              <div className="upload-box">
                <div className="upload-title">Hero VFX Video</div>
                {issueForm.heroVfxUrl ? (
                  <video className="preview-video" src={issueForm.heroVfxUrl} controls />
                ) : (
                  <div className="preview-ph">No video</div>
                )}
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => onPickHeroVfx(e.target.files?.[0])}
                  disabled={busy}
                />
              </div>
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
                        #{it.issueNumber} • {it.month} {it.year} {it.isLocked ? "🔒" : "✅"}
                      </div>
                      <div className="list-sub text-muted">
                        cover: {it.coverUrl ? "yes" : "no"} • vfx: {it.heroVfxUrl ? "yes" : "no"}
                      </div>
                    </div>
                    <div className="list-actions">
                      <button className="btn ghost" type="button" onClick={() => startEditIssue(it)}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ARTICLES TABS (Home/News/Gallery/Events) */}
      {currentCategory && (
        <div className="admin-grid">
          <div className="admin-card">
            <h3 className="headline">Articles</h3>
            <CategoryChips />

            <div className="form-grid">
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Title</span>
                <input value={articleForm.title} onChange={(e) => setArticleForm(p => ({ ...p, title: e.target.value }))} />
              </label>

              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Excerpt</span>
                <textarea rows={3} value={articleForm.excerpt} onChange={(e) => setArticleForm(p => ({ ...p, excerpt: e.target.value }))} />
              </label>

              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Text</span>
                <textarea rows={8} value={articleForm.text} onChange={(e) => setArticleForm(p => ({ ...p, text: e.target.value }))} />
              </label>

              <label className="field">
                <span>Date</span>
                <input type="date" value={articleForm.date} onChange={(e) => setArticleForm(p => ({ ...p, date: e.target.value }))} />
              </label>

              <label className="field">
                <span>Author</span>
                <input value={articleForm.author} onChange={(e) => setArticleForm(p => ({ ...p, author: e.target.value }))} />
              </label>

              {currentCategory === "news" && (
                <label className="field">
                  <span>News Category (optional)</span>
                  <input
                    value={articleForm.articleCategory}
                    onChange={(e) => setArticleForm((p) => ({ ...p, articleCategory: e.target.value }))}
                    placeholder="e.g. World / Tech / Culture"
                  />
                </label>
              )}

              {currentCategory === "events" && (
                <>
                  <label className="field">
                    <span>Time (optional)</span>
                    <input
                      value={articleForm.time}
                      onChange={(e) => setArticleForm((p) => ({ ...p, time: e.target.value }))}
                      placeholder="18:30"
                    />
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
                <input
                  type="checkbox"
                  checked={!!articleForm.isPremium}
                  onChange={(e) => setArticleForm((p) => ({ ...p, isPremium: e.target.checked }))}
                />
                <span>Premium</span>
              </label>
            </div>

            <div className="upload-row" style={{ marginTop: 10 }}>
              <div className="upload-box" style={{ width: "100%" }}>
                <div className="upload-title">Image / Media URL</div>

                {articleForm.imageUrl ? (
                  articleForm.imageUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
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
                      onChange={(e) => onPickArticleImage(e.target.files?.[0])}
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
                      {o.full_name ? `${o.full_name} • ` : ""}{o.customer_email || "(no email)"}
                    </div>

                    {/* ✅ ONLY the fields we want (no random stuff) */}
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
            <h3 className="headline">Subscribers</h3>
            {subscribers.length === 0 ? (
              <p className="text-muted">No subscribers.</p>
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
