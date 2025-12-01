"use client"

import { useState } from "react"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function Contact() {
  const [form, setForm] = useState({ email: "", message: "" })
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg("")

    try {
      await api.post("/contact", form)
      setMsg("Message sent successfully! We'll get back to you soon.")
      setForm({ email: "", message: "" })
    } catch (err) {
      setMsg(err?.response?.data?.error || "Error sending message")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h2 className="headline">{t("contact")}</h2>
      <p className="subhead">Get in touch with the MIREN team</p>

      <form onSubmit={submit} className="form">
        <label className="form-row">
          <span className="label">{t("email")} *</span>
          <input
            className="input"
            type="email"
            name="email"
            value={form.email}
            onChange={update}
            placeholder="your@email.com"
            required
          />
        </label>

        <label className="form-row">
          <span className="label">Message *</span>
          <textarea
            className="textarea"
            name="message"
            value={form.message}
            onChange={update}
            placeholder="Your message here..."
            rows="5"
            required
          />
        </label>

        <div className="form-footer">
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Message"}
          </button>
          <a className="btn ghost" href="/">
            {t("home_title")}
          </a>
        </div>
      </form>

      {msg && <p className={`msg ${msg.includes("success") ? "success" : "danger"}`}>{msg}</p>}
    </div>
  )
}
