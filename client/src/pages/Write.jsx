import { useRef, useState } from "react"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { t } from "../lib/i18n"

const RULES_BG = [
  "Съдържанието трябва да е оригинално и написано от теб.",
  "Забранено е публикуването на обидно, дискриминационно или нецензурно съдържание.",
  "Снимките трябва да са с добро качество и да не нарушават авторски права.",
  "Заглавието трябва ясно да отразява темата на статията.",
  "Статиите се преглеждат и одобряват от екипа на MIREN преди публикуване.",
  "Одобрените статии могат да бъдат редактирани леко за стил и граматика.",
  "MIREN запазва правото да отхвърли статия без обяснение.",
  "За включване в хартиеното списание е необходим Premium абонамент (настоящ или минал).",
  "Топ писателите получават специални награди между релийзовете.",
  "С изпращането на статията се съгласяваш с правилата и условията на MIREN.",
]

const RULES_EN = [
  "Content must be original and written by you.",
  "Publishing offensive, discriminatory, or explicit content is prohibited.",
  "Images must be high quality and must not violate copyright.",
  "The title must clearly reflect the topic of the article.",
  "Articles are reviewed and approved by the MIREN team before publishing.",
  "Approved articles may be lightly edited for style and grammar.",
  "MIREN reserves the right to reject any article without explanation.",
  "To be included in the print magazine, a Premium subscription (past or current) is required.",
  "Top writers receive special rewards between magazine releases.",
  "By submitting, you agree to MIREN's rules and terms.",
]

function RulesModal({ onClose }) {
  const lang = document.documentElement.lang || "bg"
  const rules = lang === "en" ? RULES_EN : RULES_BG

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, maxHeight: "75vh", display: "flex", flexDirection: "column" }}
      >
        <button className="modal-close" onClick={onClose} type="button">×</button>
        <h2 className="headline" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          {t("write_rules_title")}
        </h2>
        <ol style={{ overflowY: "auto", paddingLeft: "1.25rem", flex: 1, lineHeight: 1.7, color: "var(--text)" }}>
          {rules.map((rule, i) => (
            <li key={i} style={{ marginBottom: "0.6rem" }}>{rule}</li>
          ))}
        </ol>
        <button className="btn primary" onClick={onClose} style={{ marginTop: "1.25rem" }} type="button">
          OK
        </button>
      </div>
    </div>
  )
}

export default function Write() {
  const { user } = useAuth()

  const [authorName, setAuthorName] = useState(user?.display_name || user?.username || "")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [endFile, setEndFile] = useState(null)
  const [endPreview, setEndPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showRules, setShowRules] = useState(false)

  const coverRef = useRef()
  const endRef = useRef()

  function handleImageChange(e, setFile, setPreview) {
    const file = e.target.files?.[0]
    if (!file) return
    setFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function uploadImage(file) {
    const form = new FormData()
    form.append("image", file)
    const res = await api.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data?.url || res.data?.imageUrl || ""
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    if (!title.trim()) return setError("Моля въведи заглавие.")
    if (!body.trim() || body.trim().length < 80)
      return setError("Съдържанието трябва да е поне 80 знака.")
    if (!authorName.trim()) return setError("Моля въведи своето име.")

    setSubmitting(true)
    try {
      let coverUrl = ""
      let endUrl = ""

      if (coverFile) coverUrl = await uploadImage(coverFile)
      if (endFile) endUrl = await uploadImage(endFile)

      await api.post("/write/submit", {
        author_name: authorName.trim(),
        title: title.trim(),
        body: body.trim(),
        cover_url: coverUrl,
        end_url: endUrl,
      })

      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.error || "Грешка при изпращане. Опитай отново.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "3rem 2rem" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>✅</div>
          <h2 className="headline" style={{ fontSize: "1.8rem" }}>{t("write_success")}</h2>
          <p style={{ color: "var(--text)", opacity: 0.75, marginTop: "0.75rem" }}>
            {t("write_premium_note")}
          </p>
          <button
            className="btn primary"
            style={{ marginTop: "2rem" }}
            onClick={() => {
              setSuccess(false)
              setTitle("")
              setBody("")
              setAuthorName(user?.display_name || user?.username || "")
              setCoverFile(null)
              setCoverPreview(null)
              setEndFile(null)
              setEndPreview(null)
            }}
          >
            Напиши нова статия
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 className="headline" style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}>
            {t("write_title")}
          </h1>
          <p className="subhead" style={{ marginBottom: "1rem" }}>
            {t("write_subtitle")}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn ghost"
              onClick={() => setShowRules(true)}
              type="button"
              style={{ fontSize: "0.85rem" }}
            >
              📋 {t("write_rules_btn")}
            </button>
            <span
              className="write-note"
              style={{
                fontSize: "0.8rem",
                color: "var(--text)",
                opacity: 0.65,
                fontStyle: "italic",
              }}
            >
              {t("write_leaderboard_note")}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="write-form">
          <div className="write-field">
            <label className="write-label" htmlFor="write-author">
              {t("write_name_label")}
            </label>
            <input
              id="write-author"
              className="write-input"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Иван Иванов"
              maxLength={80}
              required
            />
          </div>

          <div className="write-field">
            <label className="write-label" htmlFor="write-title">
              {t("write_title_label")}
            </label>
            <input
              id="write-title"
              className="write-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заглавие на статията..."
              maxLength={160}
              required
            />
          </div>

          <div className="write-field">
            <label className="write-label" htmlFor="write-body">
              {t("write_body_label")}
            </label>
            <textarea
              id="write-body"
              className="write-input write-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Напиши съдържанието на статията тук..."
              rows={14}
              required
            />
            <span className="write-char-count" style={{ fontSize: "0.78rem", color: "var(--text)", opacity: 0.5 }}>
              {body.length} знака
            </span>
          </div>

          <div className="write-images-row">
            <div className="write-field write-img-field">
              <label className="write-label">{t("write_cover_label")}</label>
              <div
                className="write-img-drop"
                onClick={() => coverRef.current?.click()}
                style={coverPreview ? { backgroundImage: `url(${coverPreview})` } : {}}
              >
                {!coverPreview && <span>+ Качи снимка</span>}
              </div>
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleImageChange(e, setCoverFile, setCoverPreview)}
              />
              {coverPreview && (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginTop: "0.4rem", fontSize: "0.8rem" }}
                  onClick={() => { setCoverFile(null); setCoverPreview(null) }}
                >
                  Премахни
                </button>
              )}
            </div>

            <div className="write-field write-img-field">
              <label className="write-label">{t("write_end_label")}</label>
              <div
                className="write-img-drop"
                onClick={() => endRef.current?.click()}
                style={endPreview ? { backgroundImage: `url(${endPreview})` } : {}}
              >
                {!endPreview && <span>+ Качи снимка</span>}
              </div>
              <input
                ref={endRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleImageChange(e, setEndFile, setEndPreview)}
              />
              {endPreview && (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginTop: "0.4rem", fontSize: "0.8rem" }}
                  onClick={() => { setEndFile(null); setEndPreview(null) }}
                >
                  Премахни
                </button>
              )}
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--error, #e53935)", marginBottom: "0.75rem", fontWeight: 500 }}>
              {error}
            </p>
          )}

          <div className="write-footer">
            <p className="write-premium-note">
              ⭐ {t("write_premium_note")}
            </p>
            <button
              className="btn primary"
              type="submit"
              disabled={submitting}
              style={{ minWidth: 200 }}
            >
              {submitting ? t("write_submitting") : t("write_submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
