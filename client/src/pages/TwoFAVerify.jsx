// client/src/pages/TwoFAVerify.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function TwoFAVerify() {
  const navigate = useNavigate()
  const [code, setCode] = useState("")
  const [msg, setMsg] = useState("")
  const [timer, setTimer] = useState(0)
  const [busy, setBusy] = useState(false)
  const email = typeof window !== "undefined" ? sessionStorage.getItem("twofa_email") : null

  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true })
    }
  }, [email, navigate])

  useEffect(() => {
    let interval = null
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(interval)
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  async function sendEmail() {
    if (!email) {
      setMsg("Липсва имейл. Върни се и опитай пак.")
      return
    }

    setBusy(true)
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

    setBusy(true)
    try {
      const res = await api.post("/auth/verify-2fa", { email, code: code.trim() })

      if (res.data?.token) {
        localStorage.setItem("auth_token", res.data.token)
        localStorage.setItem("token", res.data.token)
      }

      sessionStorage.removeItem("twofa_email")
      window.dispatchEvent(new Event("auth:changed"))
      navigate("/profile", { replace: true })
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
            {timer > 0 ? `Resend (${timer})` : "Send Email"}
          </button>

          <input
            className="input xl mt-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Въведи код"
            inputMode="numeric"
          />

          <div className="form-footer">
            <button className="btn secondary" onClick={verify} disabled={busy || !code.trim()}>
              Потвърди
            </button>
          </div>

          {msg && <p className="msg">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
