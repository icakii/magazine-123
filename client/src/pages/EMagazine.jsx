"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

export default function EMagazine() {
  const { user } = useAuth()

  const [issues, setIssues] = useState([])
  const [currentIssueId, setCurrentIssueId] = useState("")
  const [currentPage, setCurrentPage] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [loading, setLoading] = useState(true)

  // Subscription state
  const [isPremium, setIsPremium] = useState(false)
  const [currentPlanName, setCurrentPlanName] = useState("Checking...")
  const [checkingAuth, setCheckingAuth] = useState(true)

  /** -------------------------------------------
   *  1. Load issues from localStorage
   * ------------------------------------------- */
  useEffect(() => {
    const loadIssues = () => {
      try {
        const storedIssues = JSON.parse(localStorage.getItem("mock_issues") || "[]")

        if (storedIssues.length === 0) {
          // Default locked issue for testing
          const defaultIssue = {
            id: "default-1",
            issueNumber: "0001",
            month: "January",
            year: 2024,
            isLocked: true, // PREMIUM by default
            pages: [
              "https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop"
            ]
          }

          setIssues([defaultIssue])
          setCurrentIssueId(defaultIssue.id)
        } else {
          const sorted = storedIssues.sort(
            (a, b) => b.year - a.year || b.issueNumber.localeCompare(a.issueNumber)
          )
          setIssues(sorted)
          setCurrentIssueId(sorted[0].id)
        }
      } catch (e) {
        console.error("Error loading issues", e)
      } finally {
        setLoading(false)
      }
    }

    loadIssues()
    window.addEventListener("storage", loadIssues)
    return () => window.removeEventListener("storage", loadIssues)
  }, [])

  /** -------------------------------------------
   *  2. Subscription check
   * ------------------------------------------- */
  useEffect(() => {
    if (!user) {
      setCheckingAuth(false)
      setCurrentPlanName("Guest")
      return
    }

    setCheckingAuth(true)

    api
      .get("/subscriptions")
      .then((res) => {
        const subs = res.data || []

        const paidPlans = ["monthly", "yearly"]
        const userPlan = subs[0]?.plan?.toLowerCase() || "free"

        setIsPremium(paidPlans.includes(userPlan))
        setCurrentPlanName(userPlan.charAt(0).toUpperCase() + userPlan.slice(1))
      })
      .catch((err) => {
        console.error("Sub check failed:", err)
        setIsPremium(false)
        setCurrentPlanName("Free (Error)")
      })
      .finally(() => setCheckingAuth(false))
  }, [user])

  /** -------------------------------------------
   *  3. Admin Access
   * ------------------------------------------- */
  const isAdmin =
    user && ["icaki06@gmail.com", "icaki2k@gmail.com"].includes(user.email)

  /** -------------------------------------------
   *  4. Issue Logic
   * ------------------------------------------- */
  const currentIssue =
    issues.find((i) => i.id === currentIssueId) || issues[0]

  const PAGES = currentIssue?.pages || []

  const showLockScreen =
    currentIssue?.isLocked && !isAdmin && !isPremium

  /** -------------------------------------------
   *  PAGE FLIP NAVIGATION
   * ------------------------------------------- */
  function goToNextPage() {
    if (currentPage < PAGES.length - 1 && !isFlipping) {
      setIsFlipping(true)
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1)
        setIsFlipping(false)
      }, 400)
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

  useEffect(() => {
    setCurrentPage(0)
  }, [currentIssueId])

  /** -------------------------------------------
   *  LOADING SCREEN
   * ------------------------------------------- */
  if (loading || checkingAuth) {
    return (
      <div
        className="page"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Loading Library...</h2>
          <p style={{ color: "#888" }}>Checking subscription status...</p>
        </div>
      </div>
    )
  }

  if (!currentIssue) return <div className="page">No issues found.</div>

  /** -------------------------------------------
   *  RENDER
   * ------------------------------------------- */
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div className="page">
        <h2 className="headline" style={{ textAlign: "center", marginBottom: 10 }}>
          MIREN Archive
        </h2>
        <p className="subhead" style={{ textAlign: "center", marginBottom: 30 }}>
          Digital Collection
        </p>

        {/* Issue Selector */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "30px"
          }}
        >
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
                minWidth: "280px",
                textAlign: "center"
              }}
            >
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  Issue #{issue.issueNumber} — {issue.month} {issue.year}{" "}
                  {issue.isLocked ? "(Premium)" : "(Free)"}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: 15,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "#e63946"
              }}
            >
              ▼
            </span>
          </div>
        </div>

        {/* Viewer */}
        <div
          style={{
            perspective: "1500px",
            width: "100%",
            maxWidth: "550px",
            aspectRatio: "8.5 / 11",
            margin: "0 auto 30px auto",
            position: "relative"
          }}
        >
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
                border: "1px solid #444"
              }}
            >
              <div style={{ fontSize: "5rem", marginBottom: 20 }}>🔒</div>
              <h3 style={{ fontSize: "2rem", marginBottom: 10 }}>Premium Issue</h3>
              <p
                style={{
                  color: "#aaa",
                  fontSize: "1.1rem",
                  maxWidth: "300px",
                  marginBottom: "20px"
                }}
              >
                Това издание е само за абонати. <br />
                Вашият план:{" "}
                <strong
                  style={{ color: "#e63946", textTransform: "capitalize" }}
                >
                  {currentPlanName}
                </strong>
                .
              </p>
              <a
                href="/subscriptions"
                className="btn primary"
                style={{
                  backgroundColor: "#e63946",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-block"
                }}
              >
                Upgrade Plan
              </a>
            </div>
          ) : (
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
              <img
                src={PAGES[currentPage]}
                alt={`Page ${currentPage + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block"
                }}
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src =
                    "https://via.placeholder.com/600x800?text=Image+Not+Found"
                }}
              />

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
                {currentPage === 0
                  ? "Cover"
                  : `Page ${currentPage + 1} / ${PAGES.length}`}
              </div>

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

        {/* Flip Animation */}
        <style>{`
          @keyframes flipPage {
            0% { transform: rotateY(0) scale(1); filter: brightness(1); }
            50% { transform: rotateY(90deg) scale(0.95); filter: brightness(0.7); }
            100% { transform: rotateY(0) scale(1); filter: brightness(1); }
          }
        `}</style>

        {/* PAGE NAVIGATION */}
        {!showLockScreen && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 20,
              alignItems: "center"
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
                borderRadius: "4px"
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
                : `${currentPage + 1} of ${PAGES.length}`}
            </span>

            <button
              onClick={goToNextPage}
              disabled={currentPage === PAGES.length - 1 || isFlipping}
              className="btn primary"
              style={{
                opacity: currentPage === PAGES.length - 1 ? 0.5 : 1,
                minWidth: "100px",
                backgroundColor: "#e63946",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px"
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
