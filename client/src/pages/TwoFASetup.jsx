// client/src/pages/TwoFASetup.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { t } from "../lib/i18n"
import { useAuth } from "../context/AuthContext"

export default function TwoFASetup() {
  const { user, loading, refreshMe } = useAuth()
  const navigate = useNavigate()

  const [code, setCode] = useState("")
  const [msg, setMsg] = useState("")
  const [timer, setTimer] = useState(0)
  const [busy, setBusy] = useState(false)

  const email = user?.email || ""

  useEffect(() => {
    if (timer <= 0) return
    const id = setInterval(() => setTimer((t) => (t <= 1 ? 0 : t - 1)), 1000)
    return () => clearInterval(id)
  }, [timer])

  async function sendEmail() {
    if (!email) return setMsg("Error: User email not found.")

    setBusy(true)
    setMsg("")
    try {
      await api.post("/auth/send-2fa", { email })
      setMsg("Code sent.")
      setTimer(60)
    } catch (err) {
      setMsg(err?.response?.data?.error || "Error sending")
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (!email) return setMsg("Error: User email not found.")
    if (!code.trim()) return setMsg("Enter code.")

    setBusy(true)
    setMsg("")
    try {
      await api.post("/auth/verify-2fa", { email, code: code.trim() })
      await refreshMe()
      setMsg("2FA activated.")
      setTimeout(() => navigate("/profile", { replace: true }), 700)
    } catch (err) {
      setMsg(err?.response?.data?.error || "Invalid code")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page"><p className="text-muted">{t("loading")}</p></div>

  if (!user) {
    return (
      <div className="page">
        <p>
          {t("not_logged_in")}{" "}
          <a href="/login" className="btn outline">{t("go_login")}</a>
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="headline">{t("twofa_setup_title")}</h2>
      <p className="subhead">
        We will send a code to: <strong>{email}</strong>
      </p>

      <div className="stack mt-3">
        <button className="btn primary" onClick={sendEmail} disabled={timer > 0 || busy}>
          {timer > 0 ? `Resend (${timer})` : busy ? "Sending..." : "Send Email"}
        </button>

        <input
          className="input mt-2"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter code"
          inputMode="numeric"
        />

        <div className="form-footer">
          <button className="btn secondary" onClick={verify} disabled={busy || !code.trim()}>
            {busy ? "Verifying..." : "Verify"}
          </button>
        </div>

        {msg && <p className="msg">{msg}</p>}
      </div>
    </div>
  )
}
