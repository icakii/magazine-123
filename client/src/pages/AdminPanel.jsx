"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload";
const UPLOAD_PRESET = "YOUR_UPLOAD_PRESET"; 

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]

const ARTICLE_CATEGORIES = [
  "Sports", "E-Sports", "Photography", "Lifestyle", "Art", 
  "Music", "Movies & Series", "Business", "Science", 
  "Culture", "Health & Fitness", "Travel"
]

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AdminPanel() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState("news") 
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Newsletter State
  const [subscribers, setSubscribers] = useState([])
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  // Article Form
  const [articleForm, setArticleForm] = useState({
    title: "", text: "", date: new Date().toISOString().split("T")[0], time: "", imageUrl: "", excerpt: "", articleCategory: "Lifestyle", isPremium: false, linkTo: "/news"
  })

  // Magazine Form
  const [magForm, setMagForm] = useState({
    issueNumber: "", month: "January", year: new Date().getFullYear(), isLocked: true, pages: [], coverUrl: ""
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
         const res = await api.get('/magazines');
         setItems(res.data || []);
      } else if (activeTab === "newsletter") {
         const res = await api.get('/newsletter/subscribers');
         setSubscribers(res.data || []);
      } else {
         const res = await api.get(`/articles?category=${activeTab}`)
         setItems(res.data || [])
      }
    } catch (err) { console.error(err) }
  }

  // --- IMAGE UPLOAD FUNCTION ---
  async function handleImageUpload(e, type) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const data = await res.json();
        
        if (data.secure_url) {
            if (type === 'cover') {
                setMagForm(prev => ({ ...prev, coverUrl: data.secure_url }));
            } else if (type === 'page') {
                // ТУК Е ПРОМЯНАТА: Добавяме към масива, вместо да го презаписваме
                setMagForm(prev => ({ 
                    ...prev, 
                    pages: [...prev.pages, data.secure_url] 
                }));
            } else {
                setArticleForm(prev => ({ ...prev, imageUrl: data.secure_url }));
            }
            setMsg("Image uploaded successfully! ✅");
        }
    } catch (error) { 
        console.error(error);
        setMsg("Upload failed."); 
    } finally { 
        setUploading(false); 
        // Изчистваме input-а, за да може да се качи същия файл пак ако трябва
        e.target.value = null; 
    }
  }

  // Функция за изтриване на конкретна страница
  function removePage(indexToRemove) {
      setMagForm(prev => ({
          ...prev,
          pages: prev.pages.filter((_, index) => index !== indexToRemove)
      }));
  }

  // --- SAVE ---
  async function handleSave(e) {
    e.preventDefault()
    try {
      if (activeTab === "magazine") {
         const dataToSave = { ...magForm, isLocked: Boolean(magForm.isLocked) }
         if (editingId) await api.put(`/magazines/${editingId}`, dataToSave);
         else await api.post('/magazines', dataToSave);
         setMsg("Magazine saved!");
      } else {
         const dataToSave = { ...articleForm, category: activeTab, author: user.displayName || "Admin" }
         if (editingId) await api.put(`/articles/${editingId}`, dataToSave);
         else await api.post("/articles", dataToSave);
         setMsg("Article saved!");
      }
      setTimeout(() => { resetForms(); loadData(); }, 1000)
    } catch (err) { 
        setMsg("Error: " + (err.response?.data?.message || err.message)); 
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure?")) return
    try {
        if (activeTab === "magazine") await api.delete(`/magazines/${id}`);
        else await api.delete(`/articles/${id}`);
        loadData();
    } catch (e) { alert("Error deleting"); }
  }

  async function handleSendEmail(e) {
    e.preventDefault();
    try {
        const res = await api.post('/newsletter/send', { subject: emailSubject, body: emailBody });
        setMsg(`Sent to ${res.data.count} subscribers.`);
        setEmailSubject(""); setEmailBody("");
    } catch (e) { setMsg("Error sending emails."); }
  }

  function handleEdit(item) {
    setEditingId(item.id)
    if (activeTab === "magazine") {
       setMagForm({
           issueNumber: item.issueNumber || "",
           month: item.month || "January",
           year: item.year || 2025,
           isLocked: !!item.isLocked,
           coverUrl: item.coverUrl || "",
           pages: item.pages || [] // Уверяваме се, че е масив
       })
    } else {
       setArticleForm({
           title: item.title || "",
           text: item.text || "",
           date: item.date ? item.date.split('T')[0] : "",
           time: item.time || "",
           imageUrl: item.imageUrl || "",
           excerpt: item.excerpt || "",
           articleCategory: item.articleCategory || "Lifestyle",
           isPremium: !!item.isPremium,
           linkTo: item.linkTo || "/news"
       })
    }
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForms() {
    setEditingId(null); setShowForm(false); setMsg("");
    setArticleForm({ title: "", text: "", date: new Date().toISOString().split("T")[0], time: "", imageUrl: "", excerpt: "", articleCategory: "Lifestyle", isPremium: false, linkTo: "/news" })
    setMagForm({ issueNumber: "", month: "January", year: new Date().getFullYear(), isLocked: true, pages: [], coverUrl: "" })
  }

  if (loading) return <div className="page"><p>Loading...</p></div>
  if (!user || !ADMIN_EMAILS.includes(user.email)) return <div className="page"><p>Access Denied</p></div>

  return (
    <div className="page">
      <h2 className="headline">Admin Panel</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", borderBottom: "2px solid #ccc", paddingBottom: 12 }}>
        {tabs.map((cat) => (
          <button key={cat} onClick={() => { setActiveTab(cat); resetForms(); }} className={`btn ${activeTab === cat ? "primary" : "ghost"}`} style={{ textTransform: "capitalize" }}>{cat}</button>
        ))}
      </div>

      {activeTab === "newsletter" && (
        <div className="stack">
            <h3>Newsletter Manager</h3>
            <p>Total Subscribers: <strong>{subscribers.length}</strong></p>
            <div className="card" style={{padding: 20}}>
               <form onSubmit={handleSendEmail} className="form">
                   <input className="input" placeholder="Subject" value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} required />
                   <textarea className="textarea" placeholder="Message..." value={emailBody} onChange={e=>setEmailBody(e.target.value)} required style={{minHeight: 150}} />
                   <button className="btn primary" style={{backgroundColor: "#e63946", color:"white"}}>Send to All</button>
               </form>
               {msg && <p style={{marginTop: 10}}>{msg}</p>}
            </div>
            <h4>Subscribers</h4>
            <div style={{maxHeight: 200, overflowY: "auto", border:"1px solid #eee", padding: 5}}>
                {subscribers.map((s, i) => <div key={i}>{s.email}</div>)}
            </div>
        </div>
      )}

      {activeTab !== "newsletter" && !showForm && (
        <button onClick={() => { setShowForm(true); setEditingId(null); }} className="btn primary" style={{ marginBottom: 24, backgroundColor: "#e63946", color: "white" }}>
          + Create New in "{activeTab}"
        </button>
      )}

      {showForm && activeTab !== "newsletter" && (
        <div className="card" style={{ marginBottom: 24, padding: 20, border: "1px solid #ccc" }}>
          <h3>{editingId ? "Edit" : "Create New"} {activeTab}</h3>
          
          <form onSubmit={handleSave} className="form">
            {activeTab === "magazine" ? (
               <div>
                   {/* MAGAZINE FORM */}
                   <div style={{display:'flex', gap: 10, marginBottom: 10}}>
                       <input className="input" placeholder="Issue # (e.g. 005)" value={magForm.issueNumber} onChange={e=>setMagForm({...magForm, issueNumber: e.target.value})} style={{flex:1}} />
                       
                       <select className="input" value={magForm.month} onChange={e=>setMagForm({...magForm, month: e.target.value})} style={{flex:1}}>
                           {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
                       </select>
                       
                       <input className="input" type="number" placeholder="Year" value={magForm.year} onChange={e=>setMagForm({...magForm, year: e.target.value})} style={{flex:1}} />
                   </div>
                   
                   {/* COVER UPLOAD */}
                   <div style={{marginBottom: 20, padding: 10, border: "1px solid #ddd", background: "#f9f9f9"}}>
                       <label style={{fontWeight:"bold", display:"block", marginBottom: 5}}>1. Cover Image</label>
                       <input type="file" onChange={(e) => handleImageUpload(e, 'cover')} accept="image/*" disabled={uploading} />
                       {magForm.coverUrl && <img src={magForm.coverUrl} style={{height: 100, marginTop: 10, display: "block", borderRadius: 5}} />}
                   </div>

                   {/* PAGES UPLOAD (MULTI) */}
                   <div style={{marginBottom: 20, padding: 10, border: "1px solid #ddd", background: "#f9f9f9"}}>
                       <label style={{fontWeight:"bold", display:"block", marginBottom: 5}}>2. Magazine Pages ({magForm.pages.length})</label>
                       
                       {/* Визуализация на качените страници */}
                       <div style={{display:"flex", flexWrap:"wrap", gap: 10, marginBottom: 15}}>
                           {magForm.pages.map((p, i) => (
                               <div key={i} style={{position:"relative", border: "1px solid #ccc", padding: 2, background: "white"}}>
                                   <img src={p} style={{height: 100, display: "block"}} />
                                   <button 
                                      type="button" 
                                      onClick={() => removePage(i)} 
                                      style={{
                                          position:"absolute", top: -5, right: -5, 
                                          background:"red", color:"white", 
                                          border:"none", borderRadius: "50%", 
                                          width: 20, height: 20, cursor:"pointer", fontWeight: "bold"
                                      }}
                                   >
                                    X
                                   </button>
                                   <div style={{textAlign: "center", fontSize: "0.7rem", marginTop: 2}}>Page {i+1}</div>
                               </div>
                           ))}
                       </div>
                       
                       {/* БУТОН ЗА ДОБАВЯНЕ НА НОВА СТРАНИЦА */}
                       <div style={{borderTop: "1px dashed #ccc", paddingTop: 10}}>
                           <label style={{display: "block", marginBottom: 5, color: "#e63946", fontWeight: "bold"}}>+ Add New Page</label>
                           <input type="file" onChange={(e) => handleImageUpload(e, 'page')} accept="image/*" disabled={uploading} />
                           {uploading && <span style={{marginLeft: 10}}>Uploading... ⏳</span>}
                       </div>
                   </div>

                   <label style={{display: "flex", alignItems: "center", gap: 5, cursor: "pointer"}}>
                       <input type="checkbox" checked={magForm.isLocked} onChange={e => setMagForm({...magForm, isLocked: e.target.checked})} />
                       Premium Locked?
                   </label>
               </div>
            ) : (
               /* ARTICLE FORM */
               <>
                  <input className="input" type="text" placeholder="Title" value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} required style={{width:"100%", marginBottom: 10}} />
                  
                  <div style={{marginBottom: 10, padding: 10, background: "#f9f9f9", border: "1px dashed #ccc"}}>
                      <label style={{fontWeight:"bold", fontSize: "0.9rem"}}>Article Image</label>
                      <input type="file" onChange={(e) => handleImageUpload(e, 'article')} accept="image/*" disabled={uploading} style={{marginTop: 5}} />
                      {uploading && <span>Uploading...</span>}
                      {articleForm.imageUrl && <img src={articleForm.imageUrl} style={{height: 100, marginTop: 10, borderRadius: 5}} />}
                      <input className="input" placeholder="Or Paste URL manually" value={articleForm.imageUrl} onChange={e => setArticleForm({...articleForm, imageUrl: e.target.value})} style={{width:"100%", marginTop: 10}} />
                  </div>

                  <div style={{display:'flex', gap: 10}}>
                      <input className="input" type="date" value={articleForm.date} onChange={e => setArticleForm({...articleForm, date: e.target.value})} style={{flex:1}} />
                      {activeTab === "events" && <input className="input" type="time" value={articleForm.time} onChange={e => setArticleForm({...articleForm, time: e.target.value})} style={{flex:1}} />}
                  </div>

                  {activeTab === "news" && (
                       <select className="input" value={articleForm.articleCategory} onChange={e => setArticleForm({...articleForm, articleCategory: e.target.value})} style={{width:"100%", marginTop: 10}}>
                           {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                  )}

                  {activeTab !== "gallery" && (
                      <textarea className="textarea" placeholder="Full Text..." value={articleForm.text} onChange={e => setArticleForm({...articleForm, text: e.target.value})} style={{width:"100%", minHeight: 100, marginTop: 10}} />
                  )}
               </>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button type="submit" className="btn primary" style={{backgroundColor: "#e63946", color: "white"}} disabled={uploading}>
                  {editingId ? "Update" : "Save"}
              </button>
              <button type="button" onClick={resetForms} className="btn ghost">Cancel</button>
            </div>
          </form>
          {msg && <p style={{marginTop: 10, color: msg.includes("Error") ? "red" : "green"}}>{msg}</p>}
        </div>
      )}
      
      {activeTab !== "newsletter" && (
        <div className="stack">
            {items.map(item => (
                <div key={item.id} className="card inline" style={{ display: "flex", justifyContent: 'space-between', padding: 10, borderBottom: "1px solid #eee" }}>
                    <span><strong>{item.title || `Issue ${item.issueNumber}`}</strong></span>
                    <div>
                        <button onClick={() => handleEdit(item)} style={{marginRight:10}}>✏️</button>
                        <button onClick={() => handleDelete(item.id)} style={{color:"red"}}>🗑️</button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  )
}