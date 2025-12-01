import { useState, useEffect } from "react"

export default function NewsletterManager({ user, title = "🎁 Get free monthly archives!", text = "Subscribe now to stay updated." }) {
  const [showCookieBanner, setShowCookieBanner] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [email, setEmail] = useState(user?.email || "")
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    // 1. Proverka za Cookies
    const cookiesAccepted = localStorage.getItem("cookies_accepted")
    if (!cookiesAccepted) {
      setShowCookieBanner(true)
    }

    // 2. Proverka dali veche e aboniran
    const localSub = localStorage.getItem("newsletter_subscribed")
    if (localSub) setIsSubscribed(true)

    // 3. Timer za Pop-up (samo ako ne e aboniran)
    if (!localSub && cookiesAccepted) {
      const timer = setTimeout(() => {
        setShowPopup(true)
      }, 30000) // 30 sekundi
      return () => clearTimeout(timer)
    }
  }, [showCookieBanner]) 

  const handleCookieAccept = () => {
    localStorage.setItem("cookies_accepted", "true")
    setShowCookieBanner(false)
  }

  const handleSubscribe = (e) => {
    e.preventDefault()
    console.log("Subscribed:", email)
    
    // Zapazvame v browsera
    localStorage.setItem("newsletter_subscribed", "true")
    setIsSubscribed(true)
    setShowPopup(false)
    alert("Successfully subscribed!")
  }

  return (
    <>
      {/* BANNER (Lenta nai-gore) */}
      {!isSubscribed && (
         <div style={{ width: "100%", backgroundColor: "#e63946", color: "white", padding: "8px", display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
           <span style={{ fontWeight: "bold" }}>{title}</span>
           <form onSubmit={handleSubscribe} style={{ display: "flex", gap: "5px" }}>
             <input 
               type="email" 
               placeholder="Email..." 
               style={{ padding: "4px 8px", borderRadius: "4px", border: "none", color: "black", width: "150px" }} 
               value={email} 
               onChange={(e) => setEmail(e.target.value)} 
               required 
             />
             <button type="submit" style={{ background: "black", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Join</button>
           </form>
         </div>
      )}

      {/* POP-UP PROZOREC */}
      {showPopup && !isSubscribed && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", maxWidth: "400px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", position: "relative" }}>
            <button onClick={() => setShowPopup(false)} style={{ position: "absolute", top: "10px", right: "15px", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            <h2 style={{ marginBottom: "10px", color: "#1d3557" }}>Join the Club</h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>{text}</p>
            <form onSubmit={handleSubscribe} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input 
                type="email" 
                placeholder="Your best email" 
                style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }} 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
              <button type="submit" style={{ backgroundColor: "#e63946", color: "white", padding: "10px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Subscribe</button>
            </form>
          </div>
        </div>
      )}

      {/* COOKIE BANNER (Lenta nai-dolu) */}
      {showCookieBanner && (
        <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", background: "#1d3557", color: "white", padding: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 999 }}>
          <div style={{ fontSize: "0.9rem" }}>We use cookies to improve your experience. <span style={{ textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span>.</div>
          <button onClick={handleCookieAccept} style={{ backgroundColor: "#e63946", color: "white", padding: "6px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}>Accept</button>
        </div>
      )}
    </>
  )
}