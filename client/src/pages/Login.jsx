// client/src/pages/Login.jsx
import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { t } from "../lib/i18n"
import { useAuth } from "../context/AuthContext"

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()

  const [form, setForm] = useState({ email: "", password: "" })
  const [msg, setMsg] = useState({ type: "", text: "" })
  const [isForgotPass, setIsForgotPass] = useState(false)
  const [loading, setLoading] = useState(false)

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function normalizedEmail() {
    return (form.email || "").trim().toLowerCase()
  }

  async function submitLogin(e) {
    e.preventDefault()
    setMsg({ type: "", text: "" })
    setLoading(true)

    try {
      const payload = { email: normalizedEmail(), password: form.password }
      const res = await login(payload)

      if (res?.requires2fa) {
        sessionStorage.setItem("twofa_email", payload.email)
        nav("/2fa/verify", { replace: true })
        return
      }

      const to = loc.state?.from || "/profile"
      nav(to, { replace: true })
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.error || "Login failed" })
    } finally {
      setLoading(false)
    }
  }

  async function submitReset(e) {
    e.preventDefault()
    setMsg({ type: "", text: "" })
    setLoading(true)

    try {
      await api.post("/auth/reset-password-request", { email: normalizedEmail() })
      setMsg({ type: "success", text: "Reset link sent to your email!" })
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.error || "Error sending link." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <h2 className="headline auth-title">{isForgotPass ? "Reset password" : t("login")}</h2>

      <div className="form-container auth-card">
        {!isForgotPass ? (
          <form onSubmit={submitLogin} className="form auth-form">
            <label className="form-row">
              <span className="label">{t("email")}</span>
              <input
                className="input xl"
                type="email"
                name="email"
                value={form.email}
                onChange={update}
                placeholder="example@mail.com"
                required
                autoComplete="email"
              />
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
                autoComplete="current-password"
              />
            </label>

            <div className="auth-links">
              <Link to="/register" className="auth-link auth-link--primary">
                No account? Create one
              </Link>

              <button
                type="button"
                className="auth-link auth-link--muted"
                onClick={() => {
                  setIsForgotPass(true)
                  setMsg({ type: "", text: "" })
                }}
              >
                Forgot password?
              </button>
            </div>

            <div className="form-footer auth-actions">
              <button className="btn primary auth-btn" type="submit" disabled={loading}>
                {loading ? "Loading..." : t("login")}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitReset} className="form auth-form">
            <p className="auth-help">Enter your email address to receive a password reset link.</p>

            <label className="form-row">
              <span className="label">{t("email")}</span>
              <input
                className="input xl"
                type="email"
                name="email"
                value={form.email}
                onChange={update}
                placeholder="example@mail.com"
                required
                autoComplete="email"
              />
            </label>

            <div className="form-footer auth-actions auth-actions--stack">
              <button className="btn primary auth-btn" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </button>

              <button
                type="button"
                className="btn ghost auth-btn"
                onClick={() => {
                  setIsForgotPass(false)
                  setMsg({ type: "", text: "" })
                }}
              >
                Back to login
              </button>
            </div>
          </form>
        )}

        {msg.text && (
          <p className={`msg ${msg.type === "error" ? "danger" : "success"} auth-msg`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}
