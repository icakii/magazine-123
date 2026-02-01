// client/src/components/MaintenanceGate.jsx
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

const ADMIN_EMAILS = ["icaki06@gmail.com", "icaki2k@gmail.com", "mirenmagazine@gmail.com"]

function getNextMarch1_1800_Sofia() {
  // София е EET/EEST; за простота фиксираме +02:00 (както искаш).
  // Ако искаш 100% DST коректно, ще го направим с timezone lib, но това ще ти върши работа.
  const now = new Date()
  const year = now.getFullYear()
  const candidate = new Date(`${year}-03-01T18:00:00+02:00`)
  if (now < candidate) return candidate
  return new Date(`${year + 1}-03-01T18:00:00+02:00`)
}

function pad2(n) {
  return String(n).padStart(2, "0")
}

function diffParts(ms) {
  const total = Math.max(0, ms)
  const s = Math.floor(total / 1000)
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  return { days, hours, mins, secs }
}

export default function MaintenanceGate({ children }) {
  const { user, refresh } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const openAt = useMemo(() => getNextMarch1_1800_Sofia(), [])
  const [now, setNow] = useState(() => new Date())
  const [showAdminModal, setShowAdminModal] = useState(false)

  const [step, setStep] = useState(1) // 1 = login, 2 = 2fa
  const [form, setForm] = useState({ email: "", password: "" })
  const [code, setCode] = useState("")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  const [timer, setTimer] = useState(0)

  const isAdmin = !!(user?.email && ADMIN_EMAILS.includes(user.email))
  const isMaintenanceOn = now.getTime() < openAt.getTime()
  const shouldBlock = isMaintenanceOn && !isAdmin

  // tick timer for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // force-lock routes (ако не е админ, да не може да “влезе” на друга страница с /route)
  useEffect(() => {
    if (!shouldBlock) return
    if (location.pathname !== "/home") {
      navigate("/home", { replace: true })
    }
  }, [shouldBlock, location.pathname, navigate])

  // 2FA resend timer
  useEffect(() => {
    if (timer <= 0) return
    const iv = setInterval(() => {
      setTimer((t) => (t <= 1 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(iv)
  }, [timer])

  function resetModal() {
    setStep(1)
    setForm({ email: "", password: "" })
    setCode("")
    setMsg("")
    setBusy(false)
    setTimer(0)
  }

  function closeModal() {
    setShowAdminModal(false)
    resetModal()
  }

  function openModal() {
    setShowAdminModal(true)
    resetModal()
  }

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function submitLogin(e) {
    e.preventDefault()
    setMsg("")
    setBusy(true)

    const email = String(form.email || "").trim().toLowerCase()
    if (!ADMIN_EMAILS.includes(email)) {
      setBusy(false)
      setMsg("Този имейл няма admin достъп.")
      return
    }

    try {
      const res = await api.post("/auth/login", { email, password: form.password })

      // ако има 2FA – показваме стъпка 2 и пращаме код
      if (res.data?.requires2fa) {
        await api.post("/auth/send-2fa", { email })
        setStep(2)
        setTimer(60)
        setMsg("2FA кодът е изпратен на имейла.")
        return
      }

      // ако няма 2FA – логваме (рядко при теб, но го поддържаме)
      if (res.data?.token) {
        localStorage.setItem("auth_token", res.data.token)
      }
      window.dispatchEvent(new Event("auth:changed"))
      await refresh()
      closeModal()
    } catch (err) {
      setMsg(err?.response?.data?.error || "Login failed")
    } finally {
      setBusy(false)
    }
  }

  async function resend2fa() {
    setMsg("")
    const email = String(form.email || "").trim().toLowerCase()
    try {
      await api.post("/auth/send-2fa", { email })
      setTimer(60)
      setMsg("Кодът е изпратен отново.")
    } catch {
      setMsg("Грешка при изпращане.")
    }
  }

  async function verify2fa(e) {
    e.preventDefault()
    setMsg("")
    setBusy(true)
    const email = String(form.email || "").trim().toLowerCase()

    try {
      const res = await api.post("/auth/verify-2fa", { email, code })

      if (res.data?.token) {
        localStorage.setItem("auth_token", res.data.token)
      }

      window.dispatchEvent(new Event("auth:changed"))
      await refresh()
      closeModal()
    } catch (err) {
      setMsg(err?.response?.data?.error || "Невалиден код")
    } finally {
      setBusy(false)
    }
  }

  const leftMs = openAt.getTime() - now.getTime()
  const parts = diffParts(leftMs)

  return (
    <>
      {children}

      {shouldBlock && (
        <div className="maintenance-overlay" role="dialog" aria-modal="true">
          <div className="maintenance-shell">
            <div className="maintenance-hero">
              <div className="maintenance-dot" />
              <h1 className="maintenance-title">Сайтът е временно заключен</h1>
              <p className="maintenance-sub">
                Работим по плащанията и системите. Отваряме на{" "}
                <strong>1 март в 18:00</strong>.
              </p>
            </div>

            <div className="maintenance-countdown">
              <div className="mc-item">
                <div className="mc-num">{pad2(parts.days)}</div>
                <div className="mc-lbl">ДНИ</div>
              </div>
              <div className="mc-sep">:</div>
              <div className="mc-item">
                <div className="mc-num">{pad2(parts.hours)}</div>
                <div className="mc-lbl">ЧАСА</div>
              </div>
              <div className="mc-sep">:</div>
              <div className="mc-item">
                <div className="mc-num">{pad2(parts.mins)}</div>
                <div className="mc-lbl">МИН</div>
              </div>
              <div className="mc-sep">:</div>
              <div className="mc-item">
                <div className="mc-num">{pad2(parts.secs)}</div>
                <div className="mc-lbl">СЕК</div>
              </div>
            </div>

            <div className="maintenance-hint">
              Ако си админ, отключи от катинара долу вдясно.
            </div>
          </div>

          {/* faded lock bg */}
          <div className="maintenance-lock-bg">🔒</div>

          {/* lock button */}
          <button className="maintenance-lock-btn" onClick={openModal} type="button" aria-label="Admin login">
            🔒
          </button>

          {/* modal */}
          {showAdminModal && (
            <div className="maintenance-modal-backdrop" onClick={closeModal}>
              <div className="maintenance-modal" onClick={(e) => e.stopPropagation()}>
                <button className="maintenance-modal-close" onClick={closeModal} type="button">
                  ×
                </button>

                <h2 className="maintenance-modal-title">Админ вход</h2>

                {step === 1 ? (
                  <form onSubmit={submitLogin} className="maintenance-form">
                    <label className="maintenance-label">
                      Email
                      <input
                        className="maintenance-input"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={onChange}
                        placeholder="admin@email.com"
                        autoComplete="email"
                        required
                      />
                    </label>

                    <label className="maintenance-label">
                      Password
                      <input
                        className="maintenance-input"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={onChange}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                    </label>

                    <button className="maintenance-btn primary" type="submit" disabled={busy}>
                      {busy ? "Loading..." : "Login"}
                    </button>

                    {msg && <div className="maintenance-msg">{msg}</div>}
                  </form>
                ) : (
                  <form onSubmit={verify2fa} className="maintenance-form">
                    <div className="maintenance-small">
                      2FA кодът е изпратен на: <strong>{form.email}</strong>
                    </div>

                    <div className="maintenance-2fa-row">
                      <label className="maintenance-label" style={{ flex: 1 }}>
                        2FA код
                        <input
                          className="maintenance-input"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="Въведи код"
                          inputMode="numeric"
                          required
                        />
                      </label>

                      <button
                        className="maintenance-btn ghost"
                        type="button"
                        onClick={resend2fa}
                        disabled={timer > 0}
                        style={{ height: 44, marginTop: 22 }}
                      >
                        {timer > 0 ? `Resend (${timer})` : "Resend"}
                      </button>
                    </div>

                    <button className="maintenance-btn primary" type="submit" disabled={busy}>
                      {busy ? "Verifying..." : "Verify"}
                    </button>

                    <button
                      className="maintenance-btn secondary"
                      type="button"
                      onClick={() => {
                        setStep(1)
                        setCode("")
                        setMsg("")
                        setTimer(0)
                      }}
                    >
                      Back
                    </button>

                    {msg && <div className="maintenance-msg">{msg}</div>}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
