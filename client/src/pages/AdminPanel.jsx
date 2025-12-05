"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]

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

  // Форма за Статии
  const [articleForm, setArticleForm] = useState({
    title: "",
    text: "",
    date: new Date().toISOString().split("T")[0],
    time: "", 
    imageUrl: "",
    excerpt: "",
    articleCategory: "Lifestyle",
    isPremium: false,
    linkTo: "/news"
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
         const dataToSave = { ...magForm, isLocked: Boolean(magForm.isLocked), id: editingId || Date.now().toString() }
         const currentItems = JSON.parse(localStorage.getItem("mock_issues") || "[]")
         let newItems = editingId ? currentItems.map(i => i.id === editingId ? dataToSave : i) : [...currentItems, dataToSave]
         localStorage.setItem("mock_issues", JSON.stringify(newItems))
         setMsg("Magazine saved!")
      } else {
         // ВАЖНО: Запазваме категорията (activeTab), за да не се изгуби
         const dataToSave = { 
            ...articleForm, 
            category: activeTab, // Винаги взимаме текущия таб
            author: user.displayName || "Admin" 
         }

         if (editingId) {
            // EDIT MODE (PUT)
            await api.put(`/articles/${editingId}`, dataToSave)
            setMsg("Article updated successfully!")
         } else {
            // CREATE MODE (POST)
            await api.post("/articles", dataToSave)
            setMsg("Article created successfully!")
         }
      }
      
      // Изчакваме малко и ресетваме
      setTimeout(() => {
          resetForms()
          loadData()
      }, 500)
      
    } catch (err) { 
        console.error(err)
        setMsg("Error saving data") 
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure?")) return
    if (activeTab === "magazine") {
       const currentItems = JSON.parse(localStorage.getItem("mock_issues") || "[]")
       localStorage.setItem("mock_issues", JSON.stringify(currentItems.filter(i => i.id !== id)))
       loadData()
    } else {
       await api.delete(`/articles/${id}`)
       loadData()
    }
  }

  // --- ТУК БЕШЕ ПРОБЛЕМЪТ ---
  function handleEdit(item) {
    setEditingId(item.id)
    
    // 1. Първо сменяме таба, ако item-a е от друга категория
    if (item.category && item.category !== activeTab) {
        setActiveTab(item.category)
    }

    // 2. Попълваме формата според типа
    if (activeTab === "magazine" || item.category === "magazine") {
       setMagForm(item)
    } else {
       // Уверяваме се, че всички полета се попълват
       setArticleForm({
           title: item.title || "",
           text: item.text || "",
           date: item.date ? item.date.split('T')[0] : new Date().toISOString().split("T")[0],
           time: item.time || "",
           imageUrl: item.imageUrl || "",
           excerpt: item.excerpt || "",
           articleCategory: item.articleCategory || "Lifestyle",
           isPremium: !!item.isPremium,
           linkTo: item.linkTo || "/news"
       })
    }
    
    // 3. Отваряме формата и скролваме горе
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForms() {
    setEditingId(null); setShowForm(false); setMsg("");
    setArticleForm({ title: "", text: "", date: new Date().toISOString().split("T")[0], time: "", imageUrl: "", excerpt: "", articleCategory: "Lifestyle", isPremium: false, linkTo: "/news" })
    setMagForm({ issueNumber: "", month: "January", year: new Date().getFullYear(), isLocked: true, pages: [""] })
  }

  if (loading) return <div className="page"><p>Loading...</p></div>
  if (!user || !ADMIN_EMAILS.includes(user.email)) return <div className="page"><p>Access Denied</p></div>

  return (
    <div className="page">
      <h2 className="headline">Admin Panel</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", borderBottom: "2px solid #ccc", paddingBottom: 12 }}>
        {tabs.map((cat) => (
          <button key={cat} onClick={() => { setActiveTab(cat); resetForms(); }} className={`btn ${activeTab === cat ? "primary" : "ghost"}`} style={{ textTransform: "capitalize" }}>
            {cat}
          </button>
        ))}
      </div>

      {activeTab === "newsletter" && (
        <div className="stack">
            <h3>Newsletter Manager</h3>
            <p>Subscribers: {subscribers.length}</p>
            <div className="card" style={{padding: 20}}>
               <h4>Send Email to All</h4>
               {/* Тук симулираме пращане */}
               <p>Functionality coming soon...</p>
            </div>
        </div>
      )}

      {/* CREATE BUTTON */}
      {activeTab !== "newsletter" && !showForm && (
        <button onClick={() => { setShowForm(true); setEditingId(null); }} className="btn primary" style={{ marginBottom: 24, backgroundColor: "#e63946", color: "white" }}>
          + Create New in "{activeTab}"
        </button>
      )}

      {/* FORM AREA */}
      {showForm && activeTab !== "newsletter" && (
        <div className="card" style={{ marginBottom: 24, padding: 20, border: "1px solid #ccc" }}>
          <h3>{editingId ? "Edit" : "Create New"} {activeTab}</h3>
          
          <form onSubmit={handleSave} className="form">
            {activeTab === "magazine" ? (
               /* Magazine Form (съкратено, но работи) */
               <div>
                   <input className="input" placeholder="Issue #" value={magForm.issueNumber} onChange={e=>setMagForm({...magForm, issueNumber: e.target.value})} />
                   {/* ... останалите полета за списание ... */}
               </div>
            ) : (
               /* ARTICLE FORM */
               <>
                  <label style={{fontSize: "0.8rem", color: "#666"}}>Title (Required)</label>
                  <input className="input" type="text" placeholder="Title" value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} required style={{width:"100%", marginBottom: 10}} />
                  
                  <div style={{display:'flex', gap: 10}}>
                      <div style={{flex: 1}}>
                         <label style={{fontSize: "0.8rem", color: "#666"}}>Date</label>
                         <input className="input" type="date" value={articleForm.date} onChange={e => setArticleForm({...articleForm, date: e.target.value})} style={{width: "100%"}} />
                      </div>
                      
                      {/* Time - само за Events */}
                      {activeTab === "events" && (
                          <div style={{flex: 1}}>
                            <label style={{fontSize: "0.8rem", color: "#666"}}>Time</label>
                            <input className="input" type="time" value={articleForm.time} onChange={e => setArticleForm({...articleForm, time: e.target.value})} style={{width: "100%"}} />
                          </div>
                      )}
                  </div>
                  
                  <label style={{fontSize: "0.8rem", color: "#666", marginTop: 10, display: "block"}}>Image URL</label>
                  <input className="input" type="url" placeholder="https://..." value={articleForm.imageUrl} onChange={e => setArticleForm({...articleForm, imageUrl: e.target.value})} style={{width:"100%", marginBottom: 10}} />
                  
                  {/* СКРИВАМЕ ТЕЗИ ПОЛЕТА АКО Е GALLERY */}
                  {activeTab !== "gallery" && (
                      <>
                          {/* Category Select (Само за News) */}
                          {(activeTab === "news") && (
                              <select className="input" value={articleForm.articleCategory} onChange={e => setArticleForm({...articleForm, articleCategory: e.target.value})} style={{width:"100%", marginBottom: 10}}>
                                  {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          )}

                          {/* Home Page Link (Само за Home) */}
                          {activeTab === "home" && (
                              <select className="input" value={articleForm.linkTo} onChange={e => setArticleForm({...articleForm, linkTo: e.target.value})} style={{marginBottom: 10}}>
                                  <option value="/news">News Section</option>
                                  <option value="/events">Events Section</option>
                                  <option value="/gallery">Gallery Section</option>
                              </select>
                          )}

                          {/* Premium Checkbox (Само за News/Events) */}
                          {(activeTab === "news" || activeTab === "events") && (
                              <label style={{display: "flex", alignItems: "center", gap: 10, marginBottom: 15, cursor: "pointer"}}>
                                <input type="checkbox" checked={articleForm.isPremium} onChange={e => setArticleForm({...articleForm, isPremium: e.target.checked})} style={{width: 20, height: 20}} />
                                <span>{articleForm.isPremium ? "🔒 Premium" : "🔓 Public"}</span>
                              </label>
                          )}

                          <textarea className="textarea" placeholder="Full Text..." value={articleForm.text} onChange={e => setArticleForm({...articleForm, text: e.target.value})} style={{width:"100%", minHeight: 100}} />
                          <input className="input" type="text" placeholder="Short Excerpt" value={articleForm.excerpt} onChange={e => setArticleForm({...articleForm, excerpt: e.target.value})} style={{width:"100%", marginTop: 10}} />
                      </>
                  )}
               </>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button type="submit" className="btn primary" style={{backgroundColor: "#e63946", color: "white"}}>
                  {editingId ? "Update Changes" : "Save New"}
              </button>
              <button type="button" onClick={resetForms} className="btn ghost">Cancel</button>
            </div>
          </form>
          {msg && <p style={{marginTop: 10, fontWeight: "bold", color: msg.includes("Error") ? "red" : "green"}}>{msg}</p>}
        </div>
      )}

      {/* LIST ITEMS */}
      {activeTab !== "newsletter" && (
        <div className="stack">
            {items.map(item => (
                <div key={item.id} className="card inline" style={{ display: "flex", justifyContent: 'space-between', padding: 10, borderBottom: "1px solid #eee" }}>
                    <span><strong>{item.title || `Issue ${item.issueNumber}`}</strong></span>
                    <div>
                        <button onClick={() => handleEdit(item)} style={{marginRight:10, cursor:"pointer"}}>✏️ Edit</button>
                        <button onClick={() => handleDelete(item.id)} style={{color:"red", cursor:"pointer"}}>🗑️ Delete</button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  )
}