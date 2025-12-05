"use client"
import { useState, useEffect } from "react"
import { api } from "../lib/api"

export default function NewsletterManager({ user, title, text, type = "static" }) {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Ако е popup, показваме го след 3 секунди
  useEffect(() => {
    if (type === "popup") {
      const timer = setTimeout(() => {
        const alreadySubscribed = localStorage.getItem("newsletter_closed")
        if (!alreadySubscribed) setIsOpen(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [type])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email) return
    try {
      // Тук пращаме към API-то (или мокнат backend)
      await api.post("/newsletter/subscribe", { email })
      setSubscribed(true)
      localStorage.setItem("newsletter_closed", "true")
      if (type === "popup") setTimeout(() => setIsOpen(false), 2000)
    } catch (err) {
      console.error("Error subscribing", err)
      // Fallback за демо цели (ако нямаш реален endpoint)
      const existing = JSON.parse(localStorage.getItem("newsletter_emails") || "[]")
      if (!existing.includes(email)) {
         localStorage.setItem("newsletter_emails", JSON.stringify([...existing, email]))
      }
      setSubscribed(true)
      localStorage.setItem("newsletter_closed", "true")
      if (type === "popup") setTimeout(() => setIsOpen(false), 2000)
    }
  }

  // За Static версията (на Home page)
  if (type === "static") {
    return (
       <div style={{ textAlign: "center", padding: "40px 20px", background: "#f4f4f4", borderRadius: 8, marginBottom: 40 }}>
        <h3>{title}</h3>
        <p className="text-muted" style={{ marginBottom: 20 }}>{text}</p>
        {subscribed ? (
          <p style={{ color: "green", fontWeight: "bold" }}>You have successfully subscribed! ✅</p>
        ) : (
          <form onSubmit={handleSubscribe} style={{ display: "flex", justifyContent: "center", gap: 10, maxWidth: 500, margin: "0 auto" }}>
             <input 
                type="email" 
                placeholder="Your best email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                style={{ flex: 1, padding: 10, borderRadius: 4, border: "1px solid #ccc" }} 
                required
             />
             <button className="btn primary" style={{ backgroundColor: "#e63946", color: "white" }}>Subscribe</button>
          </form>
        )}
      </div>
    )
  }

  // За Popup версията
  if (type === "popup" && isOpen) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content" style={{ textAlign: "center", maxWidth: 450 }}>
           <button className="modal-close" onClick={() => { setIsOpen(false); localStorage.setItem("newsletter_closed", "true"); }}>×</button>
           <h2 style={{ color: "#1a2b49", marginBottom: 10 }}>Join the Club</h2>
           <p className="text-muted" style={{ marginBottom: 20 }}>
             Budi v krak s nai-novoto v sveta na MIREN. Poluchavai izvestiq za novi statii i subitiq.
           </p>
           {subscribed ? (
             <p style={{ color: "green", fontWeight: "bold" }}>Thank you for subscribing!</p>
           ) : (
             <form onSubmit={handleSubscribe}>
               <input 
                  type="email" 
                  className="input"
                  placeholder="Your best email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  style={{ width: "100%", marginBottom: 15, padding: 10 }} 
                  required
               />
               <button className="btn primary" style={{ width: "100%", backgroundColor: "#e63946", color: "white" }}>
                 Subscribe
               </button>
             </form>
           )}
        </div>
      </div>
    )
  }

  return null
}