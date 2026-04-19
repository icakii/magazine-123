// client/src/pages/Login.jsx
import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useGoogleLogin } from "@react-oauth/google"
import { api } from "../lib/api"
import { t } from "../lib/i18n"
import { useAuth } from "../context/AuthContext"

export default function Login() {
  const { login, googleLogin } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()

  const [form, setForm] = useState({ email: "", password: "" })
  const [msg, setMsg] = useState({ type: "", text: "" })
  const [isForgotPass, setIsForgotPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setMsg({ type: "", text: "" })
      setLoading(true)
      try {
        await googleLogin(tokenResponse.access_token)
        nav(loc.state?.from || "/profile", { replace: true })
      } catch {
        setMsg({ type: "error", text: "Google sign-in failed" })
      } finally {
        setLoading(false)
      }
    },
    onError: () => setMsg({ type: "error", text: "Google sign-in failed" }),
  })

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

        {!isForgotPass && (
          <>
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
          </>
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
