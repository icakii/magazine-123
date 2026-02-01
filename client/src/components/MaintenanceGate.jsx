import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../hooks/useAuth"
import { api } from "../lib/api"

// София: 1 март 2026, 18:00 (преди смяна към лятно време)
// Фиксираме го като абсолютен момент с +02:00.
const TARGET_TS = Date.parse("2026-03-01T18:00:00+02:00")

const ADMIN_EMAILS = [
  "icaki06@gmail.com",
  "icaki2k@gmail.com",
  "mirenmagazine@gmail.com",
]

function pad2(n) {
  return String(Math.max(0, n)).padStart(2, "0")
}

function splitMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return { days, hours, minutes, seconds, total }
}

export default function MaintenanceGate({ children }) {
  const { user, loading } = useAuth()
  const isAdmin = !!(user && ADMIN_EMAILS.includes(user.email))

  const [now, setNow] = useState(Date.now())
  const [panelOpen, setPanelOpen] = useState(false)
  const [step, setStep] = useState("login") // 'login' | '2fa'
  const [form, setForm] = useState({ email: "", password: "", code: "" })
  const [msg, setMsg] = useState({ type: "", text: "" })
  const [busy, setBusy] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const remaining = useMemo(() => splitMs(TARGET_TS - now), [now])
  const locked = useMemo(() => now < TARGET_TS && !isAdmin, [now, isAdmin])

  // Tick за countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Tick за resend timer
  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setInterval(() => {
      setResendTimer((t) => (t <= 1 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [resendTimer])

  // Докато е заключено -> спираме скрола в body
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [locked])

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function doLogin(e) {
    e?.preventDefault?.()
    setMsg({ type: "", text: "" })
    setBusy(true)

    try {
      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      })

      if (!ADMIN_EMAILS.includes(form.email)) {
        // ако някой се логне успешно, но не е админ — излизаме веднага
        try {
          await api.post("/auth/logout")
        } catch {}
        setMsg({ type: "error", text: "Нямаш админ достъп." })
        return
      }

      if (res.data && res.data.requires2fa) {
        setStep("2fa")
        // за login 2FA: изпращаме код на имейл
        await send2FA()
        return
      }

      if (res.data?.token) {
        localStorage.setItem("auth_token", res.data.token)
      }

      // рефреш, за да се презареди useAuth и да падне overlay
      window.location.reload()
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.response?.data?.error || "Login failed",
      })
    } finally {
      setBusy(false)
    }
  }

  async function send2FA() {
    if (!form.email) {
      setMsg({ type: "error", text: "Липсва имейл." })
      return
    }
    try {
      await api.post("/auth/send-2fa", { email: form.email })
      setResendTimer(60)
      setMsg({ type: "success", text: "Кодът е изпратен на имейла." })
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.response?.data?.error || "Грешка при изпращане",
      })
    }
  }

  async function verify2FA(e) {
    e?.preventDefault?.()
    setMsg({ type: "", text: "" })
    setBusy(true)

    try {
      const res = await api.post("/auth/verify-2fa", {
        email: form.email,
        code: form.code,
      })

      if (!ADMIN_EMAILS.includes(form.email)) {
        try {
          await api.post("/auth/logout")
        } catch {}
        setMsg({ type: "error", text: "Нямаш админ достъп." })
        return
      }

      if (res.data?.token) {
        localStorage.setItem("auth_token", res.data.token)
      }

      window.location.reload()
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.response?.data?.error || "Невалиден код",
      })
    } finally {
      setBusy(false)
    }
  }

  // Ако вече не е заключено (или си админ), рендерираме сайта
  if (!locked) return children

  // Заключено: НЕ рендерираме сайта отдолу (за да не може да се “обикаля” по route-ове)
  return (
    <div className="maintenance-overlay" role="dialog" aria-modal="true">
      <div className="maintenance-card">
        <div className="maintenance-brand">
          <div className="maintenance-badge">MIREN</div>
          <h1 className="maintenance-title">Сайтът е временно заключен</h1>
          <p className="maintenance-subtitle">
            Работим по плащанията и системите. Отваряме на <strong>1 март</strong> в{" "}
            <strong>18:00</strong> (София).
          </p>
        </div>

        <div className="maintenance-countdown" aria-label="countdown">
          <div className="mc-item">
            <div className="mc-num">{remaining.days}</div>
            <div className="mc-lbl">дни</div>
          </div>
          <div className="mc-sep">:</div>
          <div className="mc-item">
            <div className="mc-num">{pad2(remaining.hours)}</div>
            <div className="mc-lbl">часа</div>
          </div>
          <div className="mc-sep">:</div>
          <div className="mc-item">
            <div className="mc-num">{pad2(remaining.minutes)}</div>
            <div className="mc-lbl">мин</div>
          </div>
          <div className="mc-sep">:</div>
          <div className="mc-item">
            <div className="mc-num">{pad2(remaining.seconds)}</div>
            <div className="mc-lbl">сек</div>
          </div>
        </div>

        <div className="maintenance-note">
          <span className="dot" />
          Ако си админ, отключи от катинара долу вдясно.
        </div>
      </div>

      {/* Faded lock */}
      <div className="maintenance-lock" aria-hidden="true">
        🔒
      </div>

      {/* Admin lock button */}
      <button
        type="button"
        className={"maintenance-admin-tab" + (panelOpen ? " is-open" : "")}
        onClick={() => setPanelOpen((v) => !v)}
        aria-label="admin login"
        title="Admin login"
      >
        🔐
      </button>

      {panelOpen && (
        <div className="maintenance-panel" role="dialog" aria-label="admin login">
          <div className="maintenance-panel-head">
            <div className="mph-title">Админ вход</div>
            <button
              type="button"
              className="mph-close"
              onClick={() => setPanelOpen(false)}
              aria-label="close"
            >
              ×
            </button>
          </div>

          {step === "login" ? (
            <form onSubmit={doLogin} className="maintenance-form">
              <label className="mf-row">
                <span>Email</span>
                <input
                  className="mf-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={update}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="mf-row">
                <span>Password</span>
                <input
                  className="mf-input"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={update}
                  autoComplete="current-password"
                  required
                />
              </label>

              <button className="mf-btn" type="submit" disabled={busy}>
                {busy ? "Loading…" : "Login"}
              </button>

              {msg.text && <div className={"mf-msg " + (msg.type || "")}>{msg.text}</div>}
            </form>
          ) : (
            <form onSubmit={verify2FA} className="maintenance-form">
              <div className="mf-row">
                <span>2FA код</span>
                <div className="mf-inline">
                  <button
                    type="button"
                    className="mf-btn ghost"
                    onClick={send2FA}
                    disabled={resendTimer > 0 || busy}
                  >
                    {resendTimer > 0 ? `Resend (${resendTimer})` : "Send"}
                  </button>
                </div>
              </div>

              <input
                className="mf-input"
                name="code"
                value={form.code}
                onChange={update}
                placeholder="Въведи код"
                inputMode="numeric"
                required
              />

              <button className="mf-btn" type="submit" disabled={busy}>
                {busy ? "Verifying…" : "Verify"}
              </button>

              <button
                type="button"
                className="mf-btn ghost"
                onClick={() => {
                  setStep("login")
                  setForm((f) => ({ ...f, code: "" }))
                  setMsg({ type: "", text: "" })
                }}
              >
                Back
              </button>

              {msg.text && <div className={"mf-msg " + (msg.type || "")}>{msg.text}</div>}
            </form>
          )}
        </div>
      )}

      {loading && <div className="maintenance-loading">Checking session…</div>}
    </div>
  )
}
