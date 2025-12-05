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
    issueNumber: "0001", month: "January", year: new Date().getFullYear(), isLocked: true, pages: [""], coverUrl: ""
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
         // ВЕЧЕ ЗАРЕЖДАМЕ ОТ API, А НЕ ОТ LOCALSTORAGE
         const res = await api.get('/magazines');
         setItems(res.data || []);
      } else if (activeTab === "newsletter") {
         // ЗАРЕЖДАМЕ РЕАЛНИ АБОНАТИ
         const res = await api.get('/newsletter/subscribers');
         setSubscribers(res.data || []);
      } else {
         const res = await api.get(`/articles?category=${activeTab}`)
         setItems(res.data || [])
      }
    } catch (err) { console.error(err) }
  }

  // IMAGE UPLOAD (Cloudinary)
  async function handleImageUpload(e, isCover = false) {
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
            if (activeTab === "magazine") {
                if (isCover) setMagForm(prev => ({ ...prev, coverUrl: data.secure_url }));
                // Ако искаш да качваш страници, логиката е по-сложна, но засега корицата е важна
            } else {
                setArticleForm(prev => ({ ...prev, imageUrl: data.secure_url }));
            }
            setMsg("Image uploaded successfully! ✅");
        }
    } catch (error) { setMsg("Error uploading image."); } 
    finally { setUploading(false); }
  }

  // SAVE DATA
  async function handleSave(e) {
    e.preventDefault()
    try {
      if (activeTab === "magazine") {
         // MAGAZINE SAVE TO DB
         const dataToSave = { ...magForm, isLocked: Boolean(magForm.isLocked) }
         if (editingId) await api.put(`/magazines/${editingId}`, dataToSave);
         else await api.post('/magazines', dataToSave);
         setMsg("Magazine saved!");

      } else {
         // ARTICLE SAVE TO DB
         const dataToSave = { 
            ...articleForm, 
            category: activeTab, 
            author: user.displayName || "Admin" 
         }
         if (editingId) await api.put(`/articles/${editingId}`, dataToSave);
         else await api.post("/articles", dataToSave);
         setMsg("Article saved successfully!");
      }
      setTimeout(() => { resetForms(); loadData(); }, 1000)
    } catch (err) { 
        console.error(err); 
        setMsg("Error saving data: " + (err.response?.data?.message || err.message)); 
    }
  }

  // DELETE DATA
  async function handleDelete(id) {
    if (!window.confirm("Are you sure?")) return
    try {
        if (activeTab === "magazine") await api.delete(`/magazines/${id}`);
        else await api.delete(`/articles/${id}`);
        loadData();
    } catch (e) { alert("Error deleting"); }
  }

  // SEND NEWSLETTER
  async function handleSendEmail(e) {
    e.preventDefault();
    if(!emailSubject || !emailBody) return;
    try {
        const res = await api.post('/newsletter/send', { subject: emailSubject, body: emailBody });
        setMsg(`Success! Sent to ${res.data.count} subscribers.`);
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
           pages: item.pages || [""]
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
    setMagForm({ issueNumber: "", month: "January", year: new Date().getFullYear(), isLocked: true, pages: [""], coverUrl: "" })
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

      {/* NEWSLETTER TAB */}
      {activeTab === "newsletter" && (
        <div className="stack">
            <h3>Newsletter Manager</h3>
            <p>Total Subscribers: <strong>{subscribers.length}</strong></p>
            
            <div className="card" style={{padding: 20, marginBottom: 20}}>
               <h4>Send Blast Email</h4>
               <form onSubmit={handleSendEmail} className="form">
                   <input className="input" placeholder="Subject" value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} required />
                   <textarea className="textarea" placeholder="Email Message (HTML supported)" value={emailBody} onChange={e=>setEmailBody(e.target.value)} required style={{minHeight: 150}} />
                   <button className="btn primary" style={{backgroundColor: "#e63946", color:"white"}}>Send to All</button>
               </form>
               {msg && <p style={{marginTop: 10, fontWeight:"bold"}}>{msg}</p>}
            </div>

            <h4>Subscriber List</h4>
            <div style={{maxHeight: 200, overflowY: "auto", border: "1px solid #eee", padding: 10}}>
                {subscribers.map((sub, i) => (
                    <div key={i} style={{borderBottom: "1px solid #eee", padding: 5}}>{sub.email} <span style={{fontSize: "0.8rem", color: "#888"}}>({new Date(sub.created_at).toLocaleDateString()})</span></div>
                ))}
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
               /* MAGAZINE FORM */
               <div>
                   <div style={{display:'flex', gap: 10, marginBottom: 10}}>
                       <input className="input" placeholder="Issue # (e.g. 005)" value={magForm.issueNumber} onChange={e=>setMagForm({...magForm, issueNumber: e.target.value})} style={{flex:1}} />
                       <input className="input" type="number" placeholder="Year" value={magForm.year} onChange={e=>setMagForm({...magForm, year: e.target.value})} style={{flex:1}} />
                   </div>
                   
                   <label>Cover Image</label>
                   <input type="file" onChange={(e) => handleImageUpload(e, true)} accept="image/*" disabled={uploading} />
                   {magForm.coverUrl && <img src={magForm.coverUrl} style={{height: 100, marginTop: 10, display: "block"}} />}
                   <input className="input" placeholder="Or Cover URL" value={magForm.coverUrl} onChange={e=>setMagForm({...magForm, coverUrl: e.target.value})} style={{marginTop: 5, width: "100%"}} />

                   <label style={{marginTop: 15, display: "flex", alignItems: "center", gap: 5}}>
                       <input type="checkbox" checked={magForm.isLocked} onChange={e => setMagForm({...magForm, isLocked: e.target.checked})} />
                       Premium Locked?
                   </label>
               </div>
            ) : (
               /* ARTICLE FORM */
               <>
                  <input className="input" type="text" placeholder="Title" value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} required style={{width:"100%", marginBottom: 10}} />
                  
                  {/* Image Upload for Articles */}
                  <div style={{marginBottom: 10, padding: 10, background: "#f9f9f9"}}>
                      <label>Main Image</label>
                      <input type="file" onChange={handleImageUpload} accept="image/*" disabled={uploading} />
                      {uploading && <span>Uploading...</span>}
                      <input className="input" placeholder="Or Image URL" value={articleForm.imageUrl} onChange={e => setArticleForm({...articleForm, imageUrl: e.target.value})} style={{width:"100%", marginTop: 5}} />
                      {articleForm.imageUrl && <img src={articleForm.imageUrl} style={{height: 80, marginTop: 5}} />}
                  </div>

                  {/* Rest of inputs */}
                  <div style={{display:'flex', gap: 10}}>
                      <input className="input" type="date" value={articleForm.date} onChange={e => setArticleForm({...articleForm, date: e.target.value})} style={{flex:1}} />
                      {activeTab === "events" && <input className="input" type="time" value={articleForm.time} onChange={e => setArticleForm({...articleForm, time: e.target.value})} style={{flex:1}} />}
                  </div>

                  {activeTab === "news" && (
                       <select className="input" value={articleForm.articleCategory} onChange={e => setArticleForm({...articleForm, articleCategory: e.target.value})} style={{width:"100%", marginTop: 10}}>
                           {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                  )}

                  <textarea className="textarea" placeholder="Full Text..." value={articleForm.text} onChange={e => setArticleForm({...articleForm, text: e.target.value})} style={{width:"100%", minHeight: 100, marginTop: 10}} />
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
      
      {/* LIST ITEMS */}
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