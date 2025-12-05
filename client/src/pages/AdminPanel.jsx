"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]

// Списък с категории за статиите
const ARTICLE_CATEGORIES = [
  "Sports", "E-Sports", "Photography", "Lifestyle", "Art", 
  "Music", "Movies & Series", "Business", "Science", 
  "Culture", "Health & Fitness", "Travel"
]

export default function AdminPanel() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState("news") 
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState("")
  const [editingId, setEditingId] = useState(null)

  // Newsletter State
  const [subscribers, setSubscribers] = useState([])
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  // Форма за Статии (Home, News, Events, Gallery)
  const [articleForm, setArticleForm] = useState({
    title: "",
    text: "",
    date: new Date().toISOString().split("T")[0],
    time: "", // Само за Events
    imageUrl: "",
    excerpt: "",
    articleCategory: "Lifestyle", // Sub-category
    isPremium: false, // За Premium lock
    linkTo: "/news" // Само за Home items
  })

  // Форма за Списание
  const [magForm, setMagForm] = useState({
    issueNumber: "0001", month: "January", year: new Date().getFullYear(), isLocked: true, pages: [""] 
  })

  const tabs = ["home", "news", "events", "gallery", "magazine", "newsletter"]

  useEffect(() => {
    if (!loading && user && ADMIN_EMAILS.includes(user.email)) {
      loadData()
    }
  }, [loading, user, activeTab])

  async function loadData() {
    try {
      if (activeTab === "magazine") {
         const stored = localStorage.getItem("mock_issues")
         setItems(stored ? JSON.parse(stored) : [])
      } else if (activeTab === "newsletter") {
         // Зареждаме имейлите (от API или mock)
         // Тук симулираме взимане от localStorage за демото
         const localEmails = JSON.parse(localStorage.getItem("newsletter_emails") || "[]")
         setSubscribers(localEmails)
      } else {
         const res = await api.get(`/articles?category=${activeTab}`)
         setItems(res.data || [])
      }
    } catch (err) { console.error(err) }
  }

  async function handleSave(e) {
    e.preventDefault()
    try {
      if (activeTab === "magazine") {
         // ... Logic for Magazine (същата като преди) ...
         const dataToSave = { ...magForm, isLocked: Boolean(magForm.isLocked), id: editingId || Date.now().toString() }
         const currentItems = JSON.parse(localStorage.getItem("mock_issues") || "[]")
         let newItems = editingId ? currentItems.map(i => i.id === editingId ? dataToSave : i) : [...currentItems, dataToSave]
         localStorage.setItem("mock_issues", JSON.stringify(newItems))
         setMsg("Magazine saved!")
      } else {
         // Logic for Articles
         const dataToSave = { ...articleForm, category: activeTab, author: user.displayName || "Admin" }
         if (editingId) await api.put(`/articles/${editingId}`, dataToSave)
         else await api.post("/articles", dataToSave)
         setMsg("Article saved successfully!")
      }
      resetForms()
      loadData()
    } catch (err) { setMsg("Error saving data") }
  }

  async function handleSendEmail(e) {
    e.preventDefault()
    if(!emailSubject || !emailBody) return
    // Симулация на изпращане
    alert(`Sending email to ${subscribers.length} subscribers...\nSubject: ${emailSubject}`)
    setEmailSubject("")
    setEmailBody("")
    setMsg("Emails sent successfully to all subscribers!")
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure?")) return
    if (activeTab === "magazine") {
       // ... delete magazine logic ...
       const currentItems = JSON.parse(localStorage.getItem("mock_issues") || "[]")
       localStorage.setItem("mock_issues", JSON.stringify(currentItems.filter(i => i.id !== id)))
       loadData()
    } else {
       await api.delete(`/articles/${id}`)
       loadData()
    }
  }

  function handleEdit(item) {
    setEditingId(item.id)
    if (activeTab === "magazine") {
       setMagForm(item)
    } else {
       setArticleForm(item)
    }
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForms() {
    setEditingId(null); setShowForm(false); setMsg("");
    setArticleForm({ title: "", text: "", date: new Date().toISOString().split("T")[0], time: "", imageUrl: "", excerpt: "", articleCategory: "Lifestyle", isPremium: false, linkTo: "/news" })
    setMagForm({ issueNumber: "", month: "January", year: new Date().getFullYear(), isLocked: true, pages: [""] })
  }

  // --- RENDER ---
  if (loading) return <div className="page"><p>Loading...</p></div>
  if (!user || !ADMIN_EMAILS.includes(user.email)) return <div className="page"><p>Access Denied</p></div>

  return (
    <div className="page">
      <h2 className="headline">Admin Panel</h2>

      {/* TABS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", borderBottom: "2px solid #ccc", paddingBottom: 12 }}>
        {tabs.map((cat) => (
          <button key={cat} onClick={() => { setActiveTab(cat); resetForms(); }} className={`btn ${activeTab === cat ? "primary" : "ghost"}`} style={{ textTransform: "capitalize" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* NEWSLETTER TAB CONTENT */}
      {activeTab === "newsletter" && (
        <div className="stack">
            <h3>Newsletter Manager</h3>
            <p>Total Subscribers: <strong>{subscribers.length}</strong></p>
            <div className="card" style={{padding: 20}}>
                <h4>Send Email to All</h4>
                <form onSubmit={handleSendEmail} className="form">
                    <input className="input" placeholder="Subject Line" value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} required />
                    <textarea className="textarea" placeholder="Email Body HTML/Text..." value={emailBody} onChange={e=>setEmailBody(e.target.value)} required style={{minHeight: 150}} />
                    <button className="btn primary" style={{backgroundColor: "#e63946", color:"white"}}>Send Blast</button>
                </form>
                {msg && <p style={{color: "green"}}>{msg}</p>}
            </div>
            <div style={{marginTop: 20}}>
                <h4>Subscriber List</h4>
                <ul>{subscribers.map((em, i) => <li key={i}>{em}</li>)}</ul>
            </div>
        </div>
      )}

      {/* OTHER TABS (CREATE/EDIT) */}
      {activeTab !== "newsletter" && !showForm && (
        <button onClick={() => { setShowForm(true); setEditingId(null); }} className="btn primary" style={{ marginBottom: 24, backgroundColor: "#e63946", color: "white" }}>
          + Create New in "{activeTab}"
        </button>
      )}

      {showForm && activeTab !== "newsletter" && (
        <div className="card" style={{ marginBottom: 24, padding: 20, border: "1px solid #ccc" }}>
          <h3>{editingId ? "Edit" : "Create New"} {activeTab}</h3>
          
          <form onSubmit={handleSave} className="form">
            {/* MAGAZINE FORM */}
            {activeTab === "magazine" ? (
               /* ... (Code for magazine form remains same as provided previously) ... */
               <div>(Magazine form logic here - same as before)</div>
            ) : (
            /* ARTICLE FORM (News, Events, Home, Gallery) */
               <>
                  <input className="input" type="text" placeholder="Title" value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} required style={{width:"100%", marginBottom: 10}} />
                  <div style={{display:'flex', gap: 10}}>
                      <input className="input" type="date" value={articleForm.date} onChange={e => setArticleForm({...articleForm, date: e.target.value})} style={{flex:1}} />
                      {/* Event Time */}
                      {activeTab === "events" && (
                          <input className="input" type="time" value={articleForm.time} onChange={e => setArticleForm({...articleForm, time: e.target.value})} style={{flex:1}} />
                      )}
                  </div>
                  
                  <input className="input" type="url" placeholder="Image URL" value={articleForm.imageUrl} onChange={e => setArticleForm({...articleForm, imageUrl: e.target.value})} style={{width:"100%", marginBottom: 10, marginTop: 10}} />
                  
                  {/* Category Select */}
                  {(activeTab === "news" || activeTab === "events" || activeTab === "gallery") && (
                      <select className="input" value={articleForm.articleCategory} onChange={e => setArticleForm({...articleForm, articleCategory: e.target.value})} style={{width:"100%", marginBottom: 10}}>
                          {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  )}

                  {/* Home Page Link Selector */}
                  {activeTab === "home" && (
                      <div style={{marginBottom: 10}}>
                          <label>Redirect Button Target:</label>
                          <select className="input" value={articleForm.linkTo} onChange={e => setArticleForm({...articleForm, linkTo: e.target.value})}>
                              <option value="/news">News Section</option>
                              <option value="/events">Events Section</option>
                              <option value="/gallery">Gallery Section</option>
                              <option value="/subscriptions">Subscriptions</option>
                          </select>
                      </div>
                  )}

                  {/* Premium Checkbox */}
                  {(activeTab === "news" || activeTab === "events") && (
                      <label style={{display: "flex", alignItems: "center", gap: 10, marginBottom: 15, cursor: "pointer"}}>
                        <input type="checkbox" checked={articleForm.isPremium} onChange={e => setArticleForm({...articleForm, isPremium: e.target.checked})} style={{width: 20, height: 20}} />
                        <span style={{color: articleForm.isPremium ? "#e63946" : "green", fontWeight: "bold"}}>
                            {articleForm.isPremium ? "🔒 Premium Only" : "🔓 Public Content"}
                        </span>
                      </label>
                  )}

                  <textarea className="textarea" placeholder="Full Text..." value={articleForm.text} onChange={e => setArticleForm({...articleForm, text: e.target.value})} style={{width:"100%", minHeight: 100}} required />
                  <input className="input" type="text" placeholder="Short Excerpt (optional)" value={articleForm.excerpt} onChange={e => setArticleForm({...articleForm, excerpt: e.target.value})} style={{width:"100%", marginTop: 10}} />
               </>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button type="submit" className="btn primary" style={{backgroundColor: "#e63946", color: "white"}}>Save</button>
              <button type="button" onClick={resetForms} className="btn ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* LIST ITEMS */}
      {activeTab !== "newsletter" && (
        <div className="stack">
            {items.map(item => (
                <div key={item.id} className="card inline" style={{ display: "flex", justifyContent: 'space-between', padding: 10, borderBottom: "1px solid #eee" }}>
                    <span>
                        <strong>{item.title || `Issue ${item.issueNumber}`}</strong> 
                        {item.isPremium && " 🔒"}
                    </span>
                    <div>
                        <button onClick={() => handleEdit(item)}>✏️</button>
                        <button onClick={() => handleDelete(item.id)} style={{marginLeft: 10}}>🗑️</button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  )
}