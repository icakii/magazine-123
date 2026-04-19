// client/src/pages/Register.jsx
import { useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useGoogleLogin } from "@react-oauth/google"
import { api } from "../lib/api"
import { t } from "../lib/i18n"
import { useAuth } from "../context/AuthContext"

export default function Register() {
  const { googleLogin } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ email: "", password: "", displayName: "" })
  const [msg, setMsg] = useState("")
  const [errors, setErrors] = useState({ email: "", displayName: "" })
  const [loading, setLoading] = useState(false)
  const msgRef = useRef(null)

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      try {
        await googleLogin(tokenResponse.access_token)
        nav("/profile", { replace: true })
      } catch {
        setMsg("Google sign-in failed")
      } finally {
        setLoading(false)
      }
    },
    onError: () => setMsg("Google sign-in failed"),
  })

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
      return
      }

      if (field === "email" && res.data?.emailExists === false) {
        setErrors((prev) => ({ ...prev, email: "Email not found" }))
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
      } else if (status === 400 && String(error).toLowerCase().includes("email not found")) {
        setErrors((p) => ({ ...p, email: "Email not found" }))
        setMsg("Провери имейла - домейнът не съществува.")
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

        <div className="auth-divider"><span>or</span></div>
        <div className="google-login-wrap">
          <button type="button" className="oauth-google-btn" onClick={() => handleGoogleLogin()} disabled={loading}>
            <svg className="oauth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div ref={msgRef} style={{ marginTop: 12 }}>
          {msg && <p className="msg auth-msg">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
