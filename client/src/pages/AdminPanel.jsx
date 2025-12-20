"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"

const ADMIN_EMAILS = [
  "icaki06@gmail.com",
  "icaki2k@gmail.com",
  "mirenmagazine@gmail.com",
]

function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(String(email).toLowerCase())
}

function ymd(dateLike) {
  try {
    const d = new Date(dateLike)
    if (Number.isNaN(d.getTime())) return ""
    return d.toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

function fmtMoney(cents, currency) {
  const c = Number(cents || 0)
  const cur = String(currency || "EUR").toUpperCase()
  const v = (c / 100).toFixed(2)
  return `${v} ${cur}`
}

async function uploadToCloudinaryViaApi(file) {
  const form = new FormData()
  form.append("file", file)

  const res = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })

  return res?.data?.url || ""
}

export default function AdminPanel() {
  const { user, loading } = useAuth()

  // ✅ tabs
  const [activeTab, setActiveTab] = useState("articles") // articles | magazines | store | orders | newsletter

  // ✅ global msg
  const [msg, setMsg] = useState({ type: "", text: "" })

  // ✅ data
  const [articles, setArticles] = useState([])
  const [magazines, setMagazines] = useState([])
  const [storeItems, setStoreItems] = useState([])
  const [orders, setOrders] = useState([])
  const [subscribers, setSubscribers] = useState([])

  // ✅ loading states
  const [busy, setBusy] = useState(false)

  // ✅ forms
  const [editingArticleId, setEditingArticleId] = useState(null)
  const [articleForm, setArticleForm] = useState({
    title: "",
    text: "",
    excerpt: "",
    author: "MIREN",
    date: ymd(new Date()),
    category: "news", // news | events
    articleCategory: "",
    isPremium: false,
    time: "",
    reminderEnabled: false,
    imageUrl: "",
  })

  const [editingMagId, setEditingMagId] = useState(null)
  const [magForm, setMagForm] = useState({
    issueNumber: "",
    month: "",
    year: new Date().getFullYear(),
    isLocked: true,
    coverUrl: "",
    heroVfxUrl: "",
    pages: [], // array of image urls
  })

  const [editingStoreId, setEditingStoreId] = useState(null)
  const [storeForm, setStoreForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    category: "magazine",
    priceId: "",
    isActive: true,
    releaseAt: "",
  })

  // newsletter
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  const canAccess = useMemo(() => {
    return isAdminEmail(user?.email)
  }, [user?.email])

  // ---------------------------------------------
  // ✅ LOADERS per tab
  // ---------------------------------------------
  useEffect(() => {
    if (loading) return
    if (!canAccess) return

    ;(async () => {
      try {
        setMsg({ type: "", text: "" })

        if (activeTab === "articles") {
          const res = await api.get("/articles")
          setArticles(Array.isArray(res.data) ? res.data : [])
        }

        if (activeTab === "magazines") {
          const res = await api.get("/magazines")
          setMagazines(Array.isArray(res.data) ? res.data : [])
        }

        if (activeTab === "store") {
          // admin CRUD endpoints
          // list public store items:
          const res = await api.get("/store/items")
          setStoreItems(Array.isArray(res.data) ? res.data : [])
        }

        if (activeTab === "orders") {
          const res = await api.get("/admin/store/orders")
          setOrders(Array.isArray(res.data) ? res.data : [])
        }

        if (activeTab === "newsletter") {
          const res = await api.get("/newsletter/subscribers")
          setSubscribers(Array.isArray(res.data) ? res.data : [])
        }
      } catch (e) {
        setMsg({
          type: "error",
          text:
            e?.response?.data?.error ||
            e?.message ||
            "Failed to load admin data.",
        })
      }
    })()
  }, [activeTab, canAccess, loading])

  // ---------------------------------------------
  // ✅ GUARD UI
  // ---------------------------------------------
  if (loading) {
    return (
      <div className="page">
        <h2 className="headline">Admin Panel</h2>
        <p className="subhead">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <h2 className="headline">Admin Panel</h2>
        <p className="msg warning">You must be logged in.</p>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="page">
        <h2 className="headline">Admin Panel</h2>
        <p className="msg warning">Admin access required.</p>
      </div>
    )
  }

  // ---------------------------------------------
  // ✅ HELPERS
  // ---------------------------------------------
  const setOk = (text) => setMsg({ type: "ok", text })
  const setErr = (text) => setMsg({ type: "error", text })

  const reloadCurrentTab = async () => {
    // quick refresh
    const tab = activeTab
    setActiveTab("___tmp___")
    setTimeout(() => setActiveTab(tab), 0)
  }

  // ---------------------------------------------
  // ✅ ARTICLE CRUD
  // ---------------------------------------------
  const resetArticleForm = () => {
    setEditingArticleId(null)
    setArticleForm({
      title: "",
      text: "",
      excerpt: "",
      author: user?.displayName || "MIREN",
      date: ymd(new Date()),
      category: "news",
      articleCategory: "",
      isPremium: false,
      time: "",
      reminderEnabled: false,
      imageUrl: "",
    })
  }

  const startEditArticle = (a) => {
    setEditingArticleId(a?.id)
    setArticleForm({
      title: a?.title || "",
      text: a?.text || "",
      excerpt: a?.excerpt || "",
      author: a?.author || (user?.displayName || "MIREN"),
      date: a?.date || ymd(new Date()),
      category: a?.category || "news",
      articleCategory: a?.articleCategory || "",
      isPremium: !!a?.isPremium,
      time: a?.time || "",
      reminderEnabled: !!a?.reminderEnabled,
      imageUrl: a?.imageUrl || "",
    })
  }

  const saveArticle = async () => {
    try {
      setBusy(true)
      setMsg({ type: "", text: "" })

      const payload = {
        title: articleForm.title,
        text: articleForm.text,
        excerpt: articleForm.excerpt,
        author: articleForm.author,
        date: articleForm.date,
        imageUrl: articleForm.imageUrl,
        category: articleForm.category,
        articleCategory: articleForm.articleCategory,
        isPremium: !!articleForm.isPremium,
        time: articleForm.time,
        reminderEnabled: !!articleForm.reminderEnabled,
      }

      if (!payload.title || !payload.text) {
        setErr("Title + Text are required.")
        return
      }

      if (editingArticleId) {
        await api.put(`/articles/${editingArticleId}`, payload)
        setOk("✅ Article updated.")
      } else {
        await api.post("/articles", payload)
        setOk("✅ Article created.")
      }

      resetArticleForm()
      await reloadCurrentTab()
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to save article.")
    } finally {
      setBusy(false)
    }
  }

  const deleteArticle = async (id) => {
    if (!id) return
    if (!confirm("Delete this article?")) return
    try {
      setBusy(true)
      await api.delete(`/articles/${id}`)
      setOk("🗑️ Article deleted.")
      await reloadCurrentTab()
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Delete failed.")
    } finally {
      setBusy(false)
    }
  }

  // upload for article image
  const onPickArticleImage = async (file) => {
    try {
      if (!file) return
      setBusy(true)
      setMsg({ type: "", text: "" })
      const url = await uploadToCloudinaryViaApi(file)
      if (!url) {
        setErr("Upload failed (missing URL).")
        return
      }
      setArticleForm((s) => ({ ...s, imageUrl: url }))
      setOk("✅ Image uploaded.")
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Upload failed.")
    } finally {
      setBusy(false)
    }
  }

  // ---------------------------------------------
  // ✅ MAGAZINES CRUD
  // ---------------------------------------------
  const resetMagForm = () => {
    setEditingMagId(null)
    setMagForm({
      issueNumber: "",
      month: "",
      year: new Date().getFullYear(),
      isLocked: true,
      coverUrl: "",
      heroVfxUrl: "",
      pages: [],
    })
  }

  const startEditMag = (m) => {
    setEditingMagId(m?.id)
    setMagForm({
      issueNumber: m?.issueNumber || "",
      month: m?.month || "",
      year: Number(m?.year) || new Date().getFullYear(),
      isLocked: !!m?.isLocked,
      coverUrl: m?.coverUrl || "",
      heroVfxUrl: m?.heroVfxUrl || "",
      pages: Array.isArray(m?.pages) ? m.pages : [],
    })
  }

  const saveMagazine = async () => {
    try {
      setBusy(true)
      setMsg({ type: "", text: "" })

      const payload = {
        issueNumber: magForm.issueNumber,
        month: magForm.month,
        year: Number(magForm.year) || new Date().getFullYear(),
        isLocked: !!magForm.isLocked,
        coverUrl: magForm.coverUrl,
        heroVfxUrl: magForm.heroVfxUrl || null,
        pages: Array.isArray(magForm.pages) ? magForm.pages : [],
      }

      if (!payload.issueNumber || !payload.month || !payload.year) {
        setErr("Issue number + month + year are required.")
        return
      }

      if (editingMagId) {
        await api.put(`/magazines/${editingMagId}`, payload)
        setOk("✅ Magazine updated.")
      } else {
        await api.post("/magazines", payload)
        setOk("✅ Magazine created.")
      }

      resetMagForm()
      await reloadCurrentTab()
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to save magazine.")
    } finally {
      setBusy(false)
    }
  }

  const deleteMagazine = async (id) => {
    if (!id) return
    if (!confirm("Delete this magazine issue?")) return
    try {
      setBusy(true)
      await api.delete(`/magazines/${id}`)
      setOk("🗑️ Magazine deleted.")
      await reloadCurrentTab()
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Delete failed.")
    } finally {
      setBusy(false)
    }
  }

  const onPickCover = async (file) => {
    try {
      if (!file) return
      setBusy(true)
      setMsg({ type: "", text: "" })
      const url = await uploadToCloudinaryViaApi(file)
      if (!url) {
        setErr("Upload failed (missing URL).")
        return
      }
      setMagForm((s) => ({ ...s, coverUrl: url }))
      setOk("✅ Cover uploaded.")
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Upload failed.")
    } finally {
      setBusy(false)
    }
  }

  const onPickHeroVfx = async (file) => {
    try {
      if (!file) return
      setBusy(true)
      setMsg({ type: "", text: "" })
      const url = await uploadToCloudinaryViaApi(file)
      if (!url) {
        setErr("Upload failed (missing URL).")
        return
      }
      setMagForm((s) => ({ ...s, heroVfxUrl: url }))
      setOk("✅ Hero VFX uploaded.")
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Upload failed.")
    } finally {
      setBusy(false)
    }
  }

  const onPickPages = async (files) => {
    try {
      const arr = Array.from(files || [])
      if (arr.length === 0) return
      setBusy(true)
      setMsg({ type: "", text: "" })

      // upload sequentially (safe)
      const uploaded = []
      for (const f of arr) {
        const url = await uploadToCloudinaryViaApi(f)
        if (url) uploaded.push(url)
      }

      setMagForm((s) => ({ ...s, pages: [...s.pages, ...uploaded] }))
      setOk(`✅ Uploaded ${uploaded.length} page(s).`)
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Upload failed.")
    } finally {
      setBusy(false)
    }
  }

  // ---------------------------------------------
  // ✅ STORE CRUD
  // ---------------------------------------------
  const resetStoreForm = () => {
    setEditingStoreId(null)
    setStoreForm({
      title: "",
      description: "",
      imageUrl: "",
      category: "magazine",
      priceId: "",
      isActive: true,
      releaseAt: "",
    })
  }

  const startEditStore = (it) => {
    setEditingStoreId(it?.id)
    setStoreForm({
      title: it?.title || "",
      description: it?.description || "",
      imageUrl: it?.imageUrl || "",
      category: it?.category || "magazine",
      priceId: it?.priceId || "",
      isActive: it?.isActive !== false,
      releaseAt: it?.releaseAt ? String(it.releaseAt) : "",
    })
  }

  const saveStoreItem = async () => {
    try {
      setBusy(true)
      setMsg({ type: "", text: "" })

      const payload = {
        title: storeForm.title,
        description: storeForm.description,
        imageUrl: storeForm.imageUrl,
        category: storeForm.category,
        priceId: storeForm.priceId,
        isActive: storeForm.isActive !== false,
        releaseAt: storeForm.releaseAt ? storeForm.releaseAt : null,
      }

      if (!payload.title || !payload.priceId) {
        setErr("Title + Stripe priceId are required.")
        return
      }

      if (editingStoreId) {
        await api.put(`/admin/store/items/${editingStoreId}`, payload)
        setOk("✅ Store item updated.")
      } else {
        await api.post("/admin/store/items", payload)
        setOk("✅ Store item created.")
      }

      resetStoreForm()
      await reloadCurrentTab()
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to save store item.")
    } finally {
      setBusy(false)
    }
  }

  const deleteStoreItem = async (id) => {
    if (!id) return
    if (!confirm("Delete this store item?")) return
    try {
      setBusy(true)
      await api.delete(`/admin/store/items/${id}`)
      setOk("🗑️ Store item deleted.")
      await reloadCurrentTab()
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Delete failed.")
    } finally {
      setBusy(false)
    }
  }

  const onPickStoreImage = async (file) => {
    try {
      if (!file) return
      setBusy(true)
      setMsg({ type: "", text: "" })
      const url = await uploadToCloudinaryViaApi(file)
      if (!url) {
        setErr("Upload failed (missing URL).")
        return
      }
      setStoreForm((s) => ({ ...s, imageUrl: url }))
      setOk("✅ Store image uploaded.")
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Upload failed.")
    } finally {
      setBusy(false)
    }
  }

  // ---------------------------------------------
  // ✅ NEWSLETTER
  // ---------------------------------------------
  const sendNewsletter = async () => {
    try {
      if (!emailSubject.trim() || !emailBody.trim()) {
        setErr("Subject + Body are required.")
        return
      }
      setBusy(true)
      await api.post("/newsletter/send", {
        subject: emailSubject,
        body: emailBody,
      })
      setOk("✅ Newsletter sent.")
      setEmailSubject("")
      setEmailBody("")
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Send failed.")
    } finally {
      setBusy(false)
    }
  }

  // ---------------------------------------------
  // ✅ ORDERS (render FIX)
  // ---------------------------------------------
  const renderOrder = (o) => {
    // ✅ ONLY whitelist fields (fixes the “random fields” bug)
    const id = o?.id || ""
    const created = o?.created ? new Date(o.created * 1000) : null
    const createdStr = created ? created.toLocaleString() : ""
    const total = fmtMoney(o?.amount_total || 0, o?.currency || "EUR")

    const fullName = o?.full_name || ""
    const email = o?.customer_email || ""
    const phone = o?.customer_phone || ""
    const shipName = o?.shipping_name || ""
    const addr = o?.shipping_address || null

    const addrLines = []
    if (addr?.line1) addrLines.push(addr.line1)
    if (addr?.line2) addrLines.push(addr.line2)
    const cityLine = [addr?.postal_code, addr?.city].filter(Boolean).join(" ")
    if (cityLine) addrLines.push(cityLine)
    if (addr?.country) addrLines.push(addr.country)

    const items = Array.isArray(o?.line_items) ? o.line_items : []

    return (
      <div key={id} className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Order</div>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {id}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800 }}>{total}</div>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {createdStr}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Customer</div>
            {fullName ? <div><b>Three names:</b> {fullName}</div> : null}
            {email ? <div><b>Email:</b> {email}</div> : null}
            {phone ? <div><b>Phone:</b> {phone}</div> : null}
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Shipping</div>
            {shipName ? <div><b>Name:</b> {shipName}</div> : null}
            {addrLines.length > 0 ? (
              <div>
                <b>Address:</b>
                <div className="text-muted" style={{ marginTop: 2 }}>
                  {addrLines.map((x, i) => (
                    <div key={i}>{x}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-muted">No shipping address</div>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Items</div>
            {items.length === 0 ? (
              <div className="text-muted">No line items</div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {items.map((li, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{li?.description || "Item"}</div>
                      <div className="text-muted" style={{ fontSize: 13 }}>
                        x{li?.quantity || 1}
                      </div>
                    </div>
                    {typeof li?.amount_total === "number" ? (
                      <div style={{ whiteSpace: "nowrap" }}>
                        {fmtMoney(li.amount_total, li.currency || o?.currency || "EUR")}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------
  // UI
  // ---------------------------------------------
  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 className="headline">Admin Panel</h2>
          <p className="subhead">Manage content, store items, orders & newsletter.</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className={`btn ${activeTab === "articles" ? "primary" : "ghost"}`} onClick={() => setActiveTab("articles")} type="button">
            Articles
          </button>
          <button className={`btn ${activeTab === "magazines" ? "primary" : "ghost"}`} onClick={() => setActiveTab("magazines")} type="button">
            Magazines
          </button>
          <button className={`btn ${activeTab === "store" ? "primary" : "ghost"}`} onClick={() => setActiveTab("store")} type="button">
            Store
          </button>
          <button className={`btn ${activeTab === "orders" ? "primary" : "ghost"}`} onClick={() => setActiveTab("orders")} type="button">
            Orders
          </button>
          <button className={`btn ${activeTab === "newsletter" ? "primary" : "ghost"}`} onClick={() => setActiveTab("newsletter")} type="button">
            Newsletter
          </button>
        </div>
      </div>

      {msg?.text ? (
        <div className={`msg ${msg.type === "error" ? "warning" : ""}`} style={{ marginTop: 12 }}>
          {msg.text}
        </div>
      ) : null}

      {busy ? (
        <div className="msg" style={{ marginTop: 12 }}>
          Working…
        </div>
      ) : null}

      {/* ---------------- ARTICLES ---------------- */}
      {activeTab === "articles" && (
        <div style={{ marginTop: 16, display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          {/* form */}
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              {editingArticleId ? `Edit Article #${editingArticleId}` : "Create Article"}
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <input
                className="input"
                placeholder="Title"
                value={articleForm.title}
                onChange={(e) => setArticleForm((s) => ({ ...s, title: e.target.value }))}
              />

              <textarea
                className="input"
                placeholder="Excerpt (short)"
                value={articleForm.excerpt}
                onChange={(e) => setArticleForm((s) => ({ ...s, excerpt: e.target.value }))}
                rows={3}
              />

              <textarea
                className="input"
                placeholder="Text (full)"
                value={articleForm.text}
                onChange={(e) => setArticleForm((s) => ({ ...s, text: e.target.value }))}
                rows={8}
              />

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <input
                  className="input"
                  placeholder="Author"
                  value={articleForm.author}
                  onChange={(e) => setArticleForm((s) => ({ ...s, author: e.target.value }))}
                />
                <input
                  className="input"
                  type="date"
                  value={articleForm.date}
                  onChange={(e) => setArticleForm((s) => ({ ...s, date: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <select
                  className="input"
                  value={articleForm.category}
                  onChange={(e) => setArticleForm((s) => ({ ...s, category: e.target.value }))}
                >
                  <option value="news">news</option>
                  <option value="events">events</option>
                </select>

                <input
                  className="input"
                  placeholder="Article category (only for news)"
                  value={articleForm.articleCategory}
                  onChange={(e) => setArticleForm((s) => ({ ...s, articleCategory: e.target.value }))}
                />
              </div>

              {articleForm.category === "events" && (
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                  <input
                    className="input"
                    placeholder="Time (e.g. 19:30)"
                    value={articleForm.time}
                    onChange={(e) => setArticleForm((s) => ({ ...s, time: e.target.value }))}
                  />
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!articleForm.reminderEnabled}
                      onChange={(e) => setArticleForm((s) => ({ ...s, reminderEnabled: e.target.checked }))}
                    />
                    Reminder enabled
                  </label>
                </div>
              )}

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!articleForm.isPremium}
                  onChange={(e) => setArticleForm((s) => ({ ...s, isPremium: e.target.checked }))}
                />
                Premium
              </label>

              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Image</div>
                {articleForm.imageUrl ? (
                  <img
                    src={articleForm.imageUrl}
                    alt="article"
                    style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, marginBottom: 10 }}
                  />
                ) : (
                  <div className="text-muted" style={{ marginBottom: 10 }}>
                    No image yet.
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickArticleImage(e.target.files?.[0])}
                />

                <input
                  className="input"
                  placeholder="or paste image URL"
                  value={articleForm.imageUrl}
                  onChange={(e) => setArticleForm((s) => ({ ...s, imageUrl: e.target.value }))}
                  style={{ marginTop: 10 }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn primary" onClick={saveArticle} type="button">
                  {editingArticleId ? "Save" : "Create"}
                </button>
                <button className="btn ghost" onClick={resetArticleForm} type="button">
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* list */}
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Articles ({articles.length})</div>

            <div style={{ display: "grid", gap: 10 }}>
              {articles.map((a) => (
                <div key={a.id} className="card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>
                      {a.title} {a.isPremium ? "🔒" : ""}
                    </div>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      #{a.id}
                    </div>
                  </div>

                  <div className="text-muted" style={{ marginTop: 4 }}>
                    {a.category} • {a.date}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button className="btn ghost" onClick={() => startEditArticle(a)} type="button">
                      Edit
                    </button>
                    <button className="btn secondary" onClick={() => deleteArticle(a.id)} type="button">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {articles.length === 0 ? <div className="text-muted">No articles.</div> : null}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MAGAZINES ---------------- */}
      {activeTab === "magazines" && (
        <div style={{ marginTop: 16, display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          {/* form */}
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              {editingMagId ? `Edit Issue #${editingMagId}` : "Create Issue"}
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
                <input
                  className="input"
                  placeholder="Issue number"
                  value={magForm.issueNumber}
                  onChange={(e) => setMagForm((s) => ({ ...s, issueNumber: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Month"
                  value={magForm.month}
                  onChange={(e) => setMagForm((s) => ({ ...s, month: e.target.value }))}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="Year"
                  value={magForm.year}
                  onChange={(e) => setMagForm((s) => ({ ...s, year: e.target.value }))}
                />
              </div>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!magForm.isLocked}
                  onChange={(e) => setMagForm((s) => ({ ...s, isLocked: e.target.checked }))}
                />
                Locked (premium)
              </label>

              {/* cover */}
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Cover</div>
                {magForm.coverUrl ? (
                  <img
                    src={magForm.coverUrl}
                    alt="cover"
                    style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 10, marginBottom: 10 }}
                  />
                ) : (
                  <div className="text-muted" style={{ marginBottom: 10 }}>No cover yet.</div>
                )}
                <input type="file" accept="image/*" onChange={(e) => onPickCover(e.target.files?.[0])} />
                <input
                  className="input"
                  placeholder="or paste cover URL"
                  value={magForm.coverUrl}
                  onChange={(e) => setMagForm((s) => ({ ...s, coverUrl: e.target.value }))}
                  style={{ marginTop: 10 }}
                />
              </div>

              {/* hero vfx */}
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Hero VFX (optional video)</div>
                {magForm.heroVfxUrl ? (
                  <video
                    src={magForm.heroVfxUrl}
                    style={{ width: "100%", maxHeight: 240, borderRadius: 10, marginBottom: 10 }}
                    muted
                    loop
                    controls
                  />
                ) : (
                  <div className="text-muted" style={{ marginBottom: 10 }}>No hero VFX yet.</div>
                )}
                <input type="file" accept="video/*" onChange={(e) => onPickHeroVfx(e.target.files?.[0])} />
                <input
                  className="input"
                  placeholder="or paste video URL"
                  value={magForm.heroVfxUrl}
                  onChange={(e) => setMagForm((s) => ({ ...s, heroVfxUrl: e.target.value }))}
                  style={{ marginTop: 10 }}
                />
              </div>

              {/* pages */}
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Pages ({magForm.pages.length})</div>
                <input type="file" accept="image/*" multiple onChange={(e) => onPickPages(e.target.files)} />

                {magForm.pages.length > 0 ? (
                  <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                    {magForm.pages.map((p, i) => (
                      <div key={p + i} className="card" style={{ padding: 8 }}>
                        <img
                          src={p}
                          alt={`page-${i}`}
                          style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }}
                        />
                        <button
                          className="btn ghost"
                          style={{ marginTop: 8, width: "100%" }}
                          onClick={() => setMagForm((s) => ({ ...s, pages: s.pages.filter((_, idx) => idx !== i) }))}
                          type="button"
                        >
                          remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted" style={{ marginTop: 8 }}>No pages yet.</div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn primary" onClick={saveMagazine} type="button">
                  {editingMagId ? "Save" : "Create"}
                </button>
                <button className="btn ghost" onClick={resetMagForm} type="button">
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* list */}
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Issues ({magazines.length})</div>

            <div style={{ display: "grid", gap: 10 }}>
              {magazines.map((m) => (
                <div key={m.id} className="card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>
                      Issue {m.issueNumber} • {m.month} {m.year} {m.isLocked ? "🔒" : ""}
                    </div>
                    <div className="text-muted" style={{ fontSize: 13 }}>#{m.id}</div>
                  </div>

                  <div className="text-muted" style={{ marginTop: 4 }}>
                    Pages: {Array.isArray(m.pages) ? m.pages.length : 0}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button className="btn ghost" onClick={() => startEditMag(m)} type="button">
                      Edit
                    </button>
                    <button className="btn secondary" onClick={() => deleteMagazine(m.id)} type="button">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {magazines.length === 0 ? <div className="text-muted">No issues.</div> : null}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- STORE ---------------- */}
      {activeTab === "store" && (
        <div style={{ marginTop: 16, display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              {editingStoreId ? `Edit Store Item #${editingStoreId}` : "Create Store Item"}
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <input
                className="input"
                placeholder="Title"
                value={storeForm.title}
                onChange={(e) => setStoreForm((s) => ({ ...s, title: e.target.value }))}
              />
              <textarea
                className="input"
                placeholder="Description"
                value={storeForm.description}
                onChange={(e) => setStoreForm((s) => ({ ...s, description: e.target.value }))}
                rows={4}
              />

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <input
                  className="input"
                  placeholder="Category"
                  value={storeForm.category}
                  onChange={(e) => setStoreForm((s) => ({ ...s, category: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Stripe priceId (price_...)"
                  value={storeForm.priceId}
                  onChange={(e) => setStoreForm((s) => ({ ...s, priceId: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={storeForm.isActive !== false}
                    onChange={(e) => setStoreForm((s) => ({ ...s, isActive: e.target.checked }))}
                  />
                  Active
                </label>

                <input
                  className="input"
                  placeholder="ReleaseAt (optional ISO)"
                  value={storeForm.releaseAt}
                  onChange={(e) => setStoreForm((s) => ({ ...s, releaseAt: e.target.value }))}
                />
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Image</div>
                {storeForm.imageUrl ? (
                  <img
                    src={storeForm.imageUrl}
                    alt="store"
                    style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, marginBottom: 10 }}
                  />
                ) : (
                  <div className="text-muted" style={{ marginBottom: 10 }}>No image yet.</div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickStoreImage(e.target.files?.[0])}
                />

                <input
                  className="input"
                  placeholder="or paste image URL"
                  value={storeForm.imageUrl}
                  onChange={(e) => setStoreForm((s) => ({ ...s, imageUrl: e.target.value }))}
                  style={{ marginTop: 10 }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn primary" onClick={saveStoreItem} type="button">
                  {editingStoreId ? "Save" : "Create"}
                </button>
                <button className="btn ghost" onClick={resetStoreForm} type="button">
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Store Items ({storeItems.length})</div>

            <div style={{ display: "grid", gap: 10 }}>
              {storeItems.map((it) => (
                <div key={it.id || it.priceId} className="card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>{it.title}</div>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      #{it.id}
                    </div>
                  </div>

                  <div className="text-muted" style={{ marginTop: 4 }}>
                    Active: {it.isActive ? "yes" : "no"} • Category: {it.category || "—"}
                  </div>

                  <div className="text-muted" style={{ marginTop: 4, fontSize: 13 }}>
                    priceId: {it.priceId || "—"}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button className="btn ghost" onClick={() => startEditStore(it)} type="button">
                      Edit
                    </button>
                    <button className="btn secondary" onClick={() => deleteStoreItem(it.id)} type="button">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {storeItems.length === 0 ? <div className="text-muted">No store items.</div> : null}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ORDERS ---------------- */}
      {activeTab === "orders" && (
        <div style={{ marginTop: 16 }}>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800 }}>Paid Orders</div>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  From Stripe sessions (mode=payment, paid).
                </div>
              </div>

              <button className="btn ghost" type="button" onClick={reloadCurrentTab}>
                Refresh
              </button>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="text-muted">No paid orders yet.</div>
          ) : (
            <div>{orders.map(renderOrder)}</div>
          )}
        </div>
      )}

      {/* ---------------- NEWSLETTER ---------------- */}
      {activeTab === "newsletter" && (
        <div style={{ marginTop: 16, display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Subscribers ({subscribers.length})</div>

            <div style={{ display: "grid", gap: 8 }}>
              {subscribers.map((s, idx) => (
                <div key={s.email || idx} className="card" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>{s.email}</div>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
                  </div>
                </div>
              ))}
              {subscribers.length === 0 ? <div className="text-muted">No subscribers.</div> : null}
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Send Newsletter</div>

            <div className="stack" style={{ gap: 10 }}>
              <input
                className="input"
                placeholder="Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <textarea
                className="input"
                placeholder="HTML body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={10}
              />
              <button className="btn primary" type="button" onClick={sendNewsletter}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
