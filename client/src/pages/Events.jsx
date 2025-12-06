"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

export default function Events() {
  const { user, hasSubscription } = useAuth()
  const [articles, setArticles] = useState([])
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [reminderIds, setReminderIds] = useState(new Set())

  // Зареждаме евентите
  useEffect(() => {
    api
      .get("/articles?category=events")
      .then((res) => setArticles(res.data || []))
      .catch(() => {})
  }, [])

  // Зареждаме кои евенти имат reminder за текущия user
  useEffect(() => {
    if (!user) {
      setReminderIds(new Set())
      return
    }

    api
      .get("/events/reminders")
      .then((res) => {
        const ids = res.data?.articleIds || []
        setReminderIds(new Set(ids))
      })
      .catch(() => {})
  }, [user])

  const handleToggleReminder = async (eventId) => {
    if (!user) {
      alert("You need to be logged in to use reminders.")
      return
    }

    const currentlyEnabled = reminderIds.has(eventId)
    const newEnabled = !currentlyEnabled

    // оптимистичен UI
    setReminderIds((prev) => {
      const next = new Set(prev)
      if (newEnabled) next.add(eventId)
      else next.delete(eventId)
      return next
    })

    try {
      await api.post(`/events/${eventId}/reminder`, { enabled: newEnabled })
    } catch (err) {
      console.error(err)
      // връщаме обратно ако има грешка
      setReminderIds((prev) => {
        const next = new Set(prev)
        if (currentlyEnabled) next.add(eventId)
        else next.delete(eventId)
        return next
      })
      alert("Could not update reminder.")
    }
  }

  // малки helper стилове за iOS switch
  const switchTrackStyle = (enabled, disabled) => ({
    width: 46,
    height: 26,
    borderRadius: 999,
    backgroundColor: disabled ? "#d1d1d6" : enabled ? "#34c759" : "#d1d1d6",
    position: "relative",
    transition: "background-color 0.2s ease",
    boxShadow: "inset 0 0 1px rgba(0,0,0,0.3)",
  })

  const switchThumbStyle = (enabled) => ({
    position: "absolute",
    top: 2,
    left: enabled ? 22 : 2,
    width: 22,
    height: 22,
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
    transition: "left 0.2s ease",
  })

  return (
    <div className="page hero-bg">
      <h2 className="headline">Events</h2>
      <p className="subhead" style={{ marginBottom: 24 }}>
        Upcoming events and activities.
      </p>

      <div className="grid">
        {articles.map((article) => {
          const isLocked = article.isPremium && !hasSubscription
          const reminderEnabled = reminderIds.has(article.id)
          const reminderDisabled = isLocked || !user

          return (
            <div key={article.id} className="col-6">
              <div
                className="card"
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                {/* Premium badge */}
                {article.isPremium && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "#e63946",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: "bold",
                      zIndex: 2,
                    }}
                  >
                    🔒 Premium
                  </div>
                )}

                {/* LOCK overlay */}
                {isLocked && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(255,255,255,0.7)",
                      backdropFilter: "blur(4px)",
                      zIndex: 3,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: "3rem" }}>🔒</span>
                    <p style={{ marginTop: 8, marginBottom: 12 }}>
                      Premium event
                    </p>
                    <a href="/subscriptions" className="btn primary">
                      Subscribe to unlock
                    </a>
                  </div>
                )}

                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    style={{
                      width: "100%",
                      height: 200,
                      objectFit: "cover",
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  />
                )}

                <h3 style={{ marginBottom: 6 }}>{article.title}</h3>

                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#555",
                    marginBottom: 6,
                  }}
                >
                  {article.date}
                  {article.time ? ` • ${article.time}` : ""}
                </p>

                {article.excerpt && (
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: "#444",
                      marginBottom: 10,
                    }}
                  >
                    {article.excerpt}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "auto",
                    gap: 12,
                  }}
                >
                  <button
                    className="btn outline"
                    onClick={() => !isLocked && setSelectedArticle(article)}
                    disabled={isLocked}
                  >
                    Read More
                  </button>

                  {/* iOS-style reminder toggle */}
                  <div
                    onClick={() =>
                      !reminderDisabled && handleToggleReminder(article.id)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: reminderDisabled ? "not-allowed" : "pointer",
                      opacity: reminderDisabled ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={switchTrackStyle(
                        reminderEnabled,
                        reminderDisabled
                      )}
                    >
                      <div style={switchThumbStyle(reminderEnabled)} />
                    </div>
                    <span style={{ fontSize: "0.9rem" }}>Reminder</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedArticle && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedArticle(null)}
            >
              ×
            </button>
            <h2>{selectedArticle.title}</h2>
            <p>
              {selectedArticle.date}
              {selectedArticle.time ? ` • ${selectedArticle.time}` : ""}
            </p>
            <p>{selectedArticle.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
