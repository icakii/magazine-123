"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

// Добави тук своя имейл
const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]

export default function AdminPanel() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState("news") 
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState("")
  
  // State за редакция
  const [editingId, setEditingId] = useState(null)

  // Форма за статии (News, Events, Gallery)
  const [articleForm, setArticleForm] = useState({
    title: "",
    category: "news",
    text: "",
    date: new Date().toISOString().split("T")[0],
    imageUrl: "",
    excerpt: "",
  })

  // Форма за СПИСАНИЕТО (Magazine)
  const [magForm, setMagForm] = useState({
    issueNumber: "0001",
    month: "January",
    year: new Date().getFullYear(),
    isLocked: true, // ВАЖНО: По подразбиране е Premium (заключено)
    pages: [""] 
  })

  const categories = ["home", "news", "events", "gallery", "magazine"]

  useEffect(() => {
    if (!loading && user && ADMIN_EMAILS.includes(user.email)) {
      loadData()
    }
  }, [loading, user, activeTab])

  // --- API OPERATIONS ---
  async function loadData() {
    try {
      if (activeTab === "magazine") {
          // За списанията ползваме LocalStorage (за момента)
          const stored = localStorage.getItem("mock_issues")
          setItems(stored ? JSON.parse(stored) : [])
      } else {
          // За статиите ползваме реалното API
          const res = await api.get(`/articles?category=${activeTab}`)
          setItems(res.data || [])
      }
    } catch (err) {
      console.error("Error loading data:", err)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    
    try {
      if (activeTab === "magazine") {
        // --- ЗАПИСВАНЕ НА СПИСАНИЯ ---
        // Гарантираме, че isLocked е булева стойност
        const dataToSave = { 
            ...magForm, 
            isLocked: Boolean(magForm.isLocked),
            id: editingId || Date.now().toString() 
        }
        
        const currentItems = JSON.parse(localStorage.getItem("mock_issues") || "[]")
        let newItems = []
        
        if (editingId) {
             newItems = currentItems.map(item => item.id === editingId ? dataToSave : item)
        } else {
             newItems = [...currentItems, dataToSave]
        }
        
        localStorage.setItem("mock_issues", JSON.stringify(newItems))
        setMsg(editingId ? "Magazine updated!" : "Magazine created!")
      } else {
        // --- ЗАПИСВАНЕ НА СТАТИИ ---
        const dataToSave = { ...articleForm, category: activeTab, author: user.displayName }
        if (editingId) await api.put(`/articles/${editingId}`, dataToSave)
        else await api.post("/articles", dataToSave)
        setMsg("Article saved successfully!")
      }

      resetForms()
      loadData()
    } catch (err) {
      setMsg("Error saving data")
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure?")) return
    
    if (activeTab === "magazine") {
        const currentItems = JSON.parse(localStorage.getItem("mock_issues") || "[]")
        const newItems = currentItems.filter(i => i.id !== id)
        localStorage.setItem("mock_issues", JSON.stringify(newItems))
        loadData()
    } else {
        await api.delete(`/articles/${id}`)
        loadData()
    }
  }

  function handleEdit(item) {
    setEditingId(item.id)
    if (activeTab === "magazine") {
        setMagForm({
            issueNumber: item.issueNumber,
            month: item.month,
            year: item.year,
            isLocked: !!item.isLocked, // Уверяваме се, че е true/false
            pages: item.pages || [""]
        })
    } else {
        setArticleForm(item)
    }
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForms() {
    setEditingId(null)
    setShowForm(false)
    setMsg("")
    setArticleForm({ title: "", category: activeTab, text: "", date: new Date().toISOString().split("T")[0], imageUrl: "", excerpt: "" })
    // Ресетваме формата (default: Premium)
    setMagForm({ issueNumber: "", month: "January", year: new Date().getFullYear(), isLocked: true, pages: [""] })
  }

  const handlePageChange = (index, value) => {
    const newPages = [...magForm.pages]
    newPages[index] = value
    setMagForm({ ...magForm, pages: newPages })
  }

  const addPage = () => {
    setMagForm({ ...magForm, pages: [...magForm.pages, ""] })
  }

  const removePage = (index) => {
    const newPages = magForm.pages.filter((_, i) => i !== index)
    setMagForm({ ...magForm, pages: newPages })
  }

  if (loading) return <div className="page"><p>Loading...</p></div>
  if (!user || !ADMIN_EMAILS.includes(user.email)) return <div className="page"><p>Access Denied</p></div>

  return (
    <div className="page">
      <h2 className="headline">Admin Panel</h2>

      {/* TABS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", borderBottom: "2px solid #ccc", paddingBottom: 12 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveTab(cat); resetForms(); }}
            className={`btn ${activeTab === cat ? "primary" : "ghost"}`}
            style={{ textTransform: "capitalize", padding: "5px 15px" }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* CREATE BUTTON */}
      {!showForm && (
        <button onClick={() => { setShowForm(true); setEditingId(null); }} className="btn primary" style={{ marginBottom: 24, backgroundColor: "#e63946", color: "white", padding: "10px 20px", border: "none", borderRadius: "4px" }}>
          + Create New in "{activeTab}"
        </button>
      )}

      {/* FORM AREA */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, padding: 20, border: "1px solid #ccc" }}>
          <h3 style={{ marginBottom: 16 }}>{editingId ? "Edit" : "Create New"} {activeTab}</h3>
          
          <form onSubmit={handleSave} className="form">
            
            {/* --- MAGAZINE FORM --- */}
            {activeTab === "magazine" ? (
                <>
                    <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        <input className="input" type="text" placeholder="Issue #" value={magForm.issueNumber} onChange={e => setMagForm({...magForm, issueNumber: e.target.value})} required style={{flex:1, padding: 8}} />
                        <select className="input" value={magForm.month} onChange={e => setMagForm({...magForm, month: e.target.value})} style={{flex:1, padding: 8}}>
                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input className="input" type="number" placeholder="Year" value={magForm.year} onChange={e => setMagForm({...magForm, year: e.target.value})} required style={{flex:1, padding: 8}} />
                    </div>

                    <label style={{display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer"}}>
                        <input 
                            type="checkbox" 
                            checked={magForm.isLocked} 
                            onChange={e => setMagForm({...magForm, isLocked: e.target.checked})} 
                            style={{width: 20, height: 20}}
                        />
                        <span style={{fontWeight: "bold", color: magForm.isLocked ? "#e63946" : "green"}}>
                            {magForm.isLocked ? "🔒 Premium Content (Subscribers Only)" : "🔓 Free Content (Public)"}
                        </span>
                    </label>

                    <div style={{ marginTop: 20 }}>
                        <h4>Pages (Image URLs)</h4>
                        
                        {magForm.pages.map((pageUrl, index) => (
                            <div key={index} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <span style={{ padding: "8px", background: "#ddd", borderRadius: 4, minWidth: 80 }}>
                                    {index === 0 ? "Cover" : `Page ${index + 1}`}
                                </span>
                                <input 
                                    className="input" 
                                    type="text" 
                                    placeholder="https://example.com/image.jpg" 
                                    value={pageUrl} 
                                    onChange={(e) => handlePageChange(index, e.target.value)}
                                    required
                                    style={{flex:1, padding: 8}}
                                />
                                {magForm.pages.length > 1 && (
                                    <button type="button" onClick={() => removePage(index)} style={{color:"red", fontWeight:"bold", border:"none", background:"none", cursor:"pointer"}}>X</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addPage} style={{ marginTop: 10, padding: "5px 10px" }}>+ Add Page</button>
                    </div>
                </>
            ) : (
            /* --- ARTICLE FORM --- */
                <>
                    <input className="input" type="text" placeholder="Title" value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} required style={{width:"100%", marginBottom: 10, padding: 8}} />
                    <input className="input" type="url" placeholder="Image URL" value={articleForm.imageUrl} onChange={e => setArticleForm({...articleForm, imageUrl: e.target.value})} style={{width:"100%", marginBottom: 10, padding: 8}} />
                    <textarea className="textarea" placeholder="Text..." value={articleForm.text} onChange={e => setArticleForm({...articleForm, text: e.target.value})} style={{width:"100%", minHeight: 100, padding: 8}} required />
                </>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button type="submit" className="btn primary" style={{backgroundColor: "#e63946", color: "white", padding: "10px 20px", border: "none", borderRadius: "4px"}}>Save</button>
              <button type="button" onClick={resetForms} className="btn ghost" style={{padding: "10px 20px", border: "1px solid #ccc", borderRadius: "4px"}}>Cancel</button>
            </div>
          </form>
          {msg && <p style={{color: "green", marginTop: 10}}>{msg}</p>}
        </div>
      )}

      {/* LIST OF ITEMS */}
      <div className="stack">
        <h3>Existing {activeTab}</h3>
        {items.length === 0 ? <p className="text-muted">No items found.</p> : items.map(item => (
          <div key={item.id} className="card inline" style={{ display: "flex", justifyContent: 'space-between', alignItems: "center", padding: 10, borderBottom: "1px solid #eee" }}>
            
            {activeTab === "magazine" ? (
                <div>
                    <strong>Issue #{item.issueNumber}</strong> - {item.month} {item.year} 
                    <span style={{ marginLeft: 10, fontSize: "0.9rem", fontWeight: "bold", color: item.isLocked ? "#e63946" : "green" }}>
                        {item.isLocked ? "🔒 Premium" : "🔓 Free"}
                    </span>
                </div>
            ) : (
                <span><strong>{item.title}</strong> <span className="text-muted">({new Date(item.date).toLocaleDateString()})</span></span>
            )}

            <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleEdit(item)} style={{cursor:"pointer", background:"none", border:"none"}}>✏️ Edit</button>
                <button onClick={() => handleDelete(item.id)} style={{cursor:"pointer", background:"none", border:"none"}}>🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}