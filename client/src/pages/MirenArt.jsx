import { useMemo } from "react"
import { useNavigate } from "react-router-dom"

const MIRAN_ART_OPEN_AT = "2026-04-13T19:00:00+03:00" // Europe/Sofia

function formatOpenDate() {
  const date = new Date(MIRAN_ART_OPEN_AT)
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function MirenArt() {
  const navigate = useNavigate()
  const openAtMs = useMemo(() => new Date(MIRAN_ART_OPEN_AT).getTime(), [])
  const isOpen = Date.now() >= openAtMs
  const openDateText = formatOpenDate()

  return (
    <div className="page miren-art-page">
      <div className="card miren-art-hero">
        <div className="miren-art-glow" aria-hidden="true" />
        <h2 className="headline">MIRÉN ART</h2>
        <p className="subhead">Creative space for art drops, visual experiments, and upcoming collaborations.</p>

        {!isOpen ? (
          <>
            <p className="miren-art-locked-text">🔒 Отваря на {openDateText} (Europe/Sofia)</p>
            <button className="btn ghost" type="button" disabled>
              Регистрацията отваря на 13-ти в 19:00
            </button>
          </>
        ) : (
          <>
            <p className="miren-art-open-text">Регистрацията е отворена.</p>
            <button className="btn primary" type="button" onClick={() => navigate("/register")}>
              Регистрация
            </button>
          </>
        )}
      </div>
    </div>
  )
}