// client/src/pages/Register.jsx
import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "", displayName: "" })
  const [msg, setMsg] = useState("")
  const [errors, setErrors] = useState({ email: "", displayName: "" })
  const [loading, setLoading] = useState(false)
  const msgRef = useRef(null)

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }))
  }

  function normalizedForm() {
    return {
      email: (form.email || "").trim().toLowerCase(),
      password: form.password || "",
      displayName: (form.displayName || "").trim(),
    }
  }

  async function checkAvailability(field) {
    const value = (form[field] || "").trim()
    if (!value) return

    try {
      const q =
        field === "email"
          ? `?email=${encodeURIComponent(value.toLowerCase())}`
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
        setTimeout(() => {
          const el = document.querySelector(".input.is-error") || msgRef.current
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 50)
      }
    } catch {
      // ignore (endpoint може да не съществува)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (loading) return

    setMsg("")
    setErrors({ email: "", displayName: "" })

    const payload = normalizedForm()
    if (!payload.email || !payload.password || !payload.displayName) {
      setMsg("Попълни всички полета")
      msgRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    setLoading(true)
    try {
      const res = await api.post("/auth/register", payload)
      setMsg(res.data?.message || "Регистрацията е успешна. Провери имейла за потвърждение.")
      setForm({ email: payload.email, password: "", displayName: payload.displayName })
      msgRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    } catch (err) {
      const status = err?.response?.status
      const error = err?.response?.data?.error || "Грешка при регистрация"

      if (status === 409) {
        const lower = String(error).toLowerCase()
        if (lower.includes("email")) setErrors((p) => ({ ...p, email: "Имейлът вече е регистриран" }))
        else if (lower.includes("display")) setErrors((p) => ({ ...p, displayName: "Потребителското име е заето" }))

        setTimeout(() => {
          const el = document.querySelector(".input.is-error") || msgRef.current
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 50)
      } else {
        setMsg(error)
        msgRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
            {errors.displayName && <div className="msg danger auth-inline-msg">{errors.displayName}</div>}
          </label>

          <div className="auth-links auth-links--single">
            <Link to="/login" className="auth-link auth-link--primary">
              Already have an account? Login
            </Link>
          </div>

          <div className="form-footer auth-actions">
            <button className="btn primary auth-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : t("create_account")}
            </button>
          </div>
        </form>

        <div ref={msgRef} style={{ marginTop: 12 }}>
          {msg && <p className="msg auth-msg">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
