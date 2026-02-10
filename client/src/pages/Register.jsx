// client/src/pages/Register.jsx
import { useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function Register() {
  const nav = useNavigate()
  const [form, setForm] = useState({ email: "", password: "", displayName: "" })
  const [msg, setMsg] = useState({ type: "", text: "" })
  const [errors, setErrors] = useState({ email: "", displayName: "" })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const msgRef = useRef(null)

  function scrollToMsg() {
    setTimeout(() => {
      if (msgRef.current) msgRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 50)
  }

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }))
    if (msg.text) setMsg({ type: "", text: "" })
  }

  async function checkAvailability(field) {
    const value = form[field]
    if (!value) return
    try {
      const q =
        field === "email"
          ? `?email=${encodeURIComponent(value)}`
          : `?displayName=${encodeURIComponent(value)}`
      const res = await api.get(`/auth/check${q}`)
      if (res.data?.taken) {
        setErrors((prev) => ({
          ...prev,
          [field]:
            field === "email"
              ? "Имейлът вече е регистриран"
              : "Потребителското име е заето",
        }))
        scrollToMsg()
      }
    } catch {
      // ignore
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (loading) return

    setMsg({ type: "", text: "" })
    setErrors({ email: "", displayName: "" })

    if (!form.email || !form.password || !form.displayName) {
      setMsg({ type: "error", text: "Попълни всички полета" })
      scrollToMsg()
      return
    }

    setLoading(true)
    try {
      const res = await api.post("/auth/register", form)

      setSuccess(true)
      setMsg({
        type: "success",
        text:
          res.data?.message ||
          "Регистрацията е успешна. Провери имейла за потвърждение.",
      })
      scrollToMsg()

      // optional: auto redirect към login след кратко време
      setTimeout(() => nav("/login", { replace: true }), 1400)
    } catch (err) {
      const status = err?.response?.status
      const error = err?.response?.data?.error || "Грешка при регистрация"

      if (status === 409) {
        const lower = String(error).toLowerCase()
        if (lower.includes("email")) {
          setErrors((prev) => ({ ...prev, email: "Имейлът вече е регистриран" }))
        } else if (lower.includes("display")) {
          setErrors((prev) => ({ ...prev, displayName: "Потребителското име е заето" }))
        } else {
          setMsg({ type: "error", text: error })
        }
        scrollToMsg()
      } else {
        setMsg({ type: "error", text: error })
        scrollToMsg()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <h2 className="headline auth-title">{t("register")}</h2>

      <div className="form-container auth-card">
        <form onSubmit={submit} className="form auth-form" noValidate>
          <label className="form-row">
            <span className="label">{t("email")}</span>
            <input
              className={`input xl ${errors.email ? "is-error" : ""}`}
              type="email"
              name="email"
              value={form.email}
              onChange={update}
              onBlur={() => checkAvailability("email")}
              placeholder="example@mail.com"
              required
              autoComplete="email"
              disabled={loading || success}
            />
            {errors.email && <div className="msg danger auth-inline-msg">{errors.email}</div>}
          </label>

          <label className="form-row">
            <span className="label">{t("password")}</span>
            <input
              className="input xl"
              type="password"
              name="password"
              value={form.password}
              onChange={update}
              placeholder={t("password")}
              required
              autoComplete="new-password"
              disabled={loading || success}
            />
          </label>

          <label className="form-row">
            <span className="label">{t("displayName")}</span>
            <input
              className={`input xl ${errors.displayName ? "is-error" : ""}`}
              type="text"
              name="displayName"
              value={form.displayName}
              onChange={update}
              onBlur={() => checkAvailability("displayName")}
              placeholder={t("displayName")}
              required
              autoComplete="nickname"
              disabled={loading || success}
            />
            {errors.displayName && <div className="msg danger auth-inline-msg">{errors.displayName}</div>}
          </label>

          <div className="auth-links auth-links--single">
            <Link to="/login" className="auth-link auth-link--primary">
              Already have an account? Login
            </Link>
          </div>

          <div className="form-footer auth-actions">
            <button className="btn primary auth-btn" type="submit" disabled={loading || success}>
              {loading ? "Loading..." : success ? "Check your email ✅" : t("create_account")}
            </button>
          </div>
        </form>

        <div ref={msgRef} style={{ marginTop: 12 }}>
          {msg.text && (
            <p className={`msg auth-msg ${msg.type === "error" ? "danger" : "success"}`}>
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
