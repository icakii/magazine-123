"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

export default function EMagazine() {
  const { user } = useAuth()

  // State
  const [issues, setIssues] = useState([])
  const [currentIssueId, setCurrentIssueId] = useState("")
  const [currentPage, setCurrentPage] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [loading, setLoading] = useState(true)

  // Subscription state
  const [isPremium, setIsPremium] = useState(false)
  const [currentPlanName, setCurrentPlanName] = useState("Checking...")

  // 1. ЗАРЕЖДАНЕ ОТ БАЗАТА ДАННИ (API)
  useEffect(() => {
    async function loadData() {
      try {
        // Паралелно зареждаме списанията и абонамента
        const [magRes, subRes] = await Promise.allSettled([
            api.get('/magazines'),
            api.get('/subscriptions')
        ]);

        // Обработка на списанията
        if (magRes.status === 'fulfilled') {
            const fetchedIssues = magRes.value.data || [];
            // Сортиране: Най-новите първи
            const sorted = fetchedIssues.sort((a, b) => b.year - a.year || b.id - a.id);
            setIssues(sorted);
            
            if (sorted.length > 0) {
                setCurrentIssueId(sorted[0].id);
            }
        }

        // Обработка на абонамента
        if (user && subRes.status === 'fulfilled') {
            const subs = subRes.value.data || [];
            const userPlan = subs[0]?.plan?.toLowerCase() || "free";
            const paidPlans = ["monthly", "yearly"];
            
            setIsPremium(paidPlans.includes(userPlan));
            setCurrentPlanName(userPlan.charAt(0).toUpperCase() + userPlan.slice(1));
        } else {
            setIsPremium(false);
            setCurrentPlanName("Guest");
        }

      } catch (e) {
        console.error("Error loading library:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Reset page on issue change
  useEffect(() => {
    setCurrentPage(0)
  }, [currentIssueId])

  // --- ЛОГИКА ЗА ТЕКУЩОТО СПИСАНИЕ ---
  const currentIssue = issues.find((i) => i.id == currentIssueId) || issues[0]
  
  // Взимаме страниците от базата. Ако няма, слагаме празен масив.
  const PAGES = currentIssue?.pages || []
  
  // Добавяме корицата като първа страница (index 0), ако не е вече там
  // Забележка: В AdminPanel-а корицата е отделно поле coverUrl.
  // Тук правим масив за визуализация: [CoverUrl, ...Pages]
  const displayPages = currentIssue ? [currentIssue.coverUrl, ...(currentIssue.pages || [])].filter(Boolean) : []

  // Проверка за достъп (Admin винаги има достъп)
  const isAdmin = !!user?.isAdmin;
  const showLockScreen = currentIssue?.isLocked && !isAdmin && !isPremium;

  // --- НАВИГАЦИЯ (Flip Logic) ---
  function goToNextPage() {
    if (currentPage < displayPages.length - 1 && !isFlipping) {
      setIsFlipping(true)
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1)
        setIsFlipping(false)
      }, 400) // Времетраене на анимацията
    }
  }

  function goToPrevPage() {
    if (currentPage > 0 && !isFlipping) {
      setIsFlipping(true)
      setTimeout(() => {
        setCurrentPage((prev) => prev - 1)
        setIsFlipping(false)
      }, 400)
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <h2>Loading Library...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="page">
        <h2 className="headline" style={{ textAlign: "center", marginBottom: 10 }}>
          MIREN Archive
        </h2>
        <p className="subhead" style={{ textAlign: "center", marginBottom: 30 }}>
          Digital Collection
        </p>

        {/* --- ISSUE SELECTOR (Dropdown) --- */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
          <div style={{ position: "relative" }}>
            <select
              value={currentIssueId}
              onChange={(e) => setCurrentIssueId(e.target.value)}
              style={{
                padding: "12px 40px 12px 20px",
                fontSize: "1.1rem",
                borderRadius: "8px",
                border: "2px solid #e63946",
                background: "var(--bg)",
                color: "var(--text)",
                fontWeight: "bold",
                cursor: "pointer",
                appearance: "none",
                minWidth: "300px",
                textAlign: "center"
              }}
            >
              {issues.length === 0 && <option>No issues found</option>}
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  Issue #{issue.issueNumber} — {issue.month} {issue.year}{" "}
                  {issue.isLocked ? "(Premium)" : "(Free)"}
                </option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 15, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#e63946" }}>
              ▼
            </span>
          </div>
        </div>

        {/* --- VIEWER (Flipbook) --- */}
        <div
          style={{
            perspective: "1500px",
            width: "100%",
            maxWidth: "500px", // Размер на списанието
            aspectRatio: "1 / 1.414", // A4 формат
            margin: "0 auto 30px auto",
            position: "relative"
          }}
        >
          {/* Locked Screen Overlay */}
          {showLockScreen ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
                color: "white",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "40px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                border: "1px solid #444",
                position: "absolute",
                zIndex: 10
              }}
            >
              <div style={{ fontSize: "5rem", marginBottom: 20 }}>🔒</div>
              <h3 style={{ fontSize: "2rem", marginBottom: 10 }}>Premium Issue</h3>
              <p style={{ color: "#aaa", fontSize: "1.1rem", marginBottom: "20px" }}>
                Това издание е само за абонати. <br />
                Вашият план:{" "}
                <strong style={{ color: "#e63946", textTransform: "capitalize" }}>
                  {currentPlanName}
                </strong>
              </p>
              
              {/* Blurred Cover Preview behind lock */}
              <img 
                src={currentIssue?.coverUrl} 
                style={{position:"absolute", top:0, left:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.1, zIndex:-1, filter:"blur(5px)"}} 
              />

              <a
                href="/subscriptions"
                className="btn primary"
                style={{
                  backgroundColor: "#e63946",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "4px",
                  textDecoration: "none",
                  fontWeight: "bold"
                }}
              >
                Upgrade Plan
              </a>
            </div>
          ) : (
            // --- ACTUAL MAGAZINE CONTENT ---
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "white",
                position: "relative",
                transformStyle: "preserve-3d",
                animation: isFlipping ? "flipPage 0.5s ease-in-out forwards" : "none",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                borderRadius: "2px",
                overflow: "hidden"
              }}
            >
              {displayPages.length > 0 ? (
                  <img
                    src={displayPages[currentPage]}
                    alt={`Page ${currentPage + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain", // Цялата страница да се вижда
                      background: "#f0f0f0", // Сив фон ако картинката е по-малка
                      display: "block"
                    }}
                  />
              ) : (
                  <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#888"}}>
                      No pages uploaded.
                  </div>
              )}

              {/* Page Number Indicator */}
              <div
                style={{
                  position: "absolute",
                  bottom: 15,
                  right: 15,
                  background: "rgba(0,0,0,0.6)",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: "0.8rem",
                  pointerEvents: "none",
                  backdropFilter: "blur(4px)"
                }}
              >
                {currentPage === 0 ? "Cover" : `Page ${currentPage} / ${displayPages.length - 1}`}
              </div>

              {/* Animation Shadow Overlay */}
              {isFlipping && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(90deg, rgba(0,0,0,0.1), transparent)"
                  }}
                ></div>
              )}
            </div>
          )}
        </div>

        {/* --- ANIMATION STYLES --- */}
        <style>{`
          @keyframes flipPage {
            0% { transform: rotateY(0) scale(1); filter: brightness(1); }
            50% { transform: rotateY(90deg) scale(0.95); filter: brightness(0.7); }
            100% { transform: rotateY(0) scale(1); filter: brightness(1); }
          }
        `}</style>

        {/* --- NAVIGATION BUTTONS --- */}
        {!showLockScreen && displayPages.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 20,
              alignItems: "center",
              marginTop: 20
            }}
          >
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 0 || isFlipping}
              className="btn primary"
              style={{
                opacity: currentPage === 0 ? 0.5 : 1,
                minWidth: "100px",
                backgroundColor: "#e63946",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === 0 ? "default" : "pointer"
              }}
            >
              ← Prev
            </button>

            <span
              style={{
                fontWeight: "bold",
                color: "var(--text-muted)",
                minWidth: "80px",
                textAlign: "center"
              }}
            >
              {currentPage === 0
                ? "Front"
                : `${currentPage} of ${displayPages.length - 1}`}
            </span>

            <button
              onClick={goToNextPage}
              disabled={currentPage === displayPages.length - 1 || isFlipping}
              className="btn primary"
              style={{
                opacity: currentPage === displayPages.length - 1 ? 0.5 : 1,
                minWidth: "100px",
                backgroundColor: "#e63946",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === displayPages.length - 1 ? "default" : "pointer"
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}