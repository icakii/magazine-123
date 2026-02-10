// client/src/pages/TwoFAVerify.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { t } from "../lib/i18n"
import { useAuth } from "../context/AuthContext"

export default function TwoFAVerify() {
  const nav = useNavigate()
  const { setAuthToken } = useAuth()

  const [code, setCode] = useState("")
  const [msg, setMsg] = useState("")
  const [timer, setTimer] = useState(0)
  const [busy, setBusy] = useState(false)

  const email = typeof window !== "undefined" ? sessionStorage.getItem("twofa_email") : null

  useEffect(() => {
    if (timer <= 0) return
    const id = setInterval(() => setTimer((t) => (t <= 1 ? 0 : t - 1)), 1000)
    return () => clearInterval(id)
  }, [timer])

  async function sendEmail() {
    if (!email) {
      setMsg("Липсва имейл. Върни се и опитай пак.")
      return
    }
    setBusy(true)
    setMsg("")
    try {
      await api.post("/auth/send-2fa", { email })
      setMsg("Кодът е изпратен на имейла.")
      setTimer(60)
    } catch (err) {
      setMsg(err?.response?.data?.error || "Грешка при изпращане")
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (!email) {
      setMsg("Липсва имейл.")
      return
    }
    if (!code) {
      setMsg("Въведи код.")
      return
    }

    setBusy(true)
    setMsg("")
    try {
      const res = await api.post("/auth/verify-2fa", { email, code })

      // ✅ token -> setAuthToken => refreshMe => UI обновява без refresh
      if (res.data?.token) {
        await setAuthToken(res.data.token)
      }

      nav("/profile", { replace: true })
    } catch (err) {
      setMsg(err?.response?.data?.error || "Невалиден код")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h2 className="headline">{t("twofa_verify_title")}</h2>
      <p className="subhead">
        Код ще бъде изпратен на: <strong>{email || "—"}</strong>
      </p>

      <div className="form-container">
        <div className="stack mt-3">
          <button className="btn primary" onClick={sendEmail} disabled={timer > 0 || busy}>
            {timer > 0 ? `Resend (${timer})` : busy ? "Sending..." : "Send Email"}
          </button>

          <input
            className="input xl mt-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Въведи код"
            inputMode="numeric"
          />

          <div className="form-footer">
            <button className="btn secondary" onClick={verify} disabled={busy}>
              {busy ? "Verifying..." : "Потвърди"}
            </button>
          </div>

          {msg && <p className="msg">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
