"use client"

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"
import { getLang } from "../lib/i18n"

const COPY = {
  bg: {
    title: "Събития",
    sub: "Предстоящи събития и активности.",
    none: "Няма предстоящи събития.",
    notifyMe: "Уведоми ме",
    notified: "Ще бъда уведомен",
    notifyLogin: "Влез в профила си, за да получаваш напомняния.",
    price: "Цена",
    readMore: "Научи повече",
    notifyCount: (n) => `${n} ${n === 1 ? "човек иска" : "души искат"} напомняне`,
  },
  en: {
    title: "Events",
    sub: "Upcoming events and activities.",
    none: "No upcoming events.",
    notifyMe: "Notify me",
    notified: "I'll be notified",
    notifyLogin: "Log in to receive event reminders.",
    price: "Price",
    readMore: "Learn more",
    notifyCount: (n) => `${n} ${n === 1 ? "person wants" : "people want"} a reminder`,
  },
}

export default function Events() {
  const { user } = useAuth()
  const [articles, setArticles] = useState([])
  const [reminderIds, setReminderIds] = useState(new Set())
  const [fullscreen, setFullscreen] = useState(null)
  const [lang, setLang] = useState(() => getLang())
  const copy = COPY[lang] || COPY.bg

  useEffect(() => {
    const onLang = (e) => setLang(e.detail?.lang || getLang())
    window.addEventListener("lang:change", onLang)
    return () => window.removeEventListener("lang:change", onLang)
  }, [])

  useEffect(() => {
    api.get("/articles?category=events")
      .then((res) => setArticles(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) { setReminderIds(new Set()); return }
    api.get("/events/reminders")
      .then((res) => setReminderIds(new Set(res.data?.articleIds || [])))
      .catch(() => {})
  }, [user])

  const handleToggleReminder = async (eventId) => {
    if (!user) { alert(copy.notifyLogin); return }
    const was = reminderIds.has(eventId)
    setReminderIds((prev) => {
      const next = new Set(prev)
      was ? next.delete(eventId) : next.add(eventId)
      return next
    })
    try {
      await api.post(`/events/${eventId}/reminder`, { enabled: !was })
      setArticles((prev) =>
        prev.map((a) =>
          a.id === eventId
            ? { ...a, reminderCount: (a.reminderCount || 0) + (was ? -1 : 1) }
            : a
        )
      )
    } catch {
      setReminderIds((prev) => {
        const next = new Set(prev)
        was ? next.add(eventId) : next.delete(eventId)
        return next
      })
    }
  }

  return (
    <>
    <div className="page">
      <h2 className="headline">{copy.title}</h2>
      <p className="subhead" style={{ marginBottom: 32 }}>{copy.sub}</p>

      {articles.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "48px 0" }}>{copy.none}</p>
      ) : (
        <div className="ev-grid">
          {articles.map((article) => {
            const isNotified = reminderIds.has(article.id)
            return (
              <div key={article.id} className="ev-card glass-card" style={{ cursor: "pointer" }} onClick={(e) => { if (e.target.closest("label,input,a,button")) return; setFullscreen(article) }}>
                {article.imageUrl && (
                  <div className="ev-card-img-wrap">
                    <img src={article.imageUrl} alt={article.title} className="ev-card-img" loading="lazy" />
                  </div>
                )}

                <div className="ev-card-body">
                  <div className="ev-card-meta">
                    <span className="ev-card-date">
                      📅 {article.date}{article.time ? ` · ${article.time}` : ""}
                    </span>
                    {article.price && (
                      <span className="ev-card-price">{article.price}</span>
                    )}
                  </div>

                  <h3 className="ev-card-title">{article.title}</h3>

                  {article.excerpt && (
                    <p className="ev-card-desc">{article.excerpt}</p>
                  )}

                  <div className="ev-card-footer">
                    {article.link ? (
                      article.link.startsWith("http") ? (
                        <a href={article.link} target="_blank" rel="noreferrer" className="btn primary ev-card-btn">
                          {copy.readMore}
                        </a>
                      ) : (
                        <Link to={article.link} className="btn primary ev-card-btn">
                          {copy.readMore}
                        </Link>
                      )
                    ) : null}

                    <div className="ev-notify-wrap">
                      <label className="ev-checkbox-container" title={user ? (isNotified ? copy.notified : copy.notifyMe) : copy.notifyLogin}>
                        <input
                          type="checkbox"
                          checked={isNotified}
                          onChange={() => handleToggleReminder(article.id)}
                          disabled={!user}
                        />
                        <div className="ev-checkmark" />
                        <span className="ev-notify-label">{isNotified ? copy.notified : copy.notifyMe}</span>
                      </label>
                      {article.reminderCount > 0 && (
                        <span className="ev-notify-count">{copy.notifyCount(article.reminderCount)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>

      {fullscreen && (
        <div className="fs-backdrop" onClick={() => setFullscreen(null)}>
          <div className="fs-modal" onClick={(e) => e.stopPropagation()}>
            <button className="fs-close" onClick={() => setFullscreen(null)} type="button">×</button>
            {fullscreen.imageUrl && (
              <img src={fullscreen.imageUrl} alt={fullscreen.title} className="fs-img" />
            )}
            <div className="fs-body">
              <div className="ev-card-meta" style={{ marginBottom: 8 }}>
                <span className="ev-card-date">📅 {fullscreen.date}{fullscreen.time ? ` · ${fullscreen.time}` : ""}</span>
                {fullscreen.price && <span className="ev-card-price">{fullscreen.price}</span>}
              </div>
              <h2 className="fs-title">{fullscreen.title}</h2>
              {fullscreen.excerpt && <p className="fs-text">{fullscreen.excerpt}</p>}
              {fullscreen.text && <p className="fs-text">{fullscreen.text}</p>}
              {fullscreen.link && (
                <a
                  href={fullscreen.link}
                  target={fullscreen.link.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="btn primary"
                  style={{ marginTop: 16 }}
                >
                  {copy.readMore}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
