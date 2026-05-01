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

const S = {
  page: { maxWidth: 720, margin: "0 auto", padding: "0 0 4rem" },
  header: { marginBottom: "2.5rem" },
  title: { fontSize: "2.4rem", fontWeight: 900, color: "var(--text)", marginBottom: "0.5rem", lineHeight: 1.15 },
  subtitle: { fontSize: "1rem", color: "var(--text)", opacity: 0.6, marginBottom: "1.25rem" },
  rulesRow: { display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" },
  rulesBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 18px", borderRadius: 999, border: "1.5px solid var(--border, rgba(0,0,0,0.15))",
    background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
    transition: "border-color 0.15s",
  },
  note: { fontSize: "0.8rem", color: "var(--text)", opacity: 0.5, fontStyle: "italic" },
  form: { display: "flex", flexDirection: "column", gap: "1.6rem" },
  field: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  label: { fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text)", opacity: 0.5 },
  input: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid var(--border, rgba(255,255,255,0.15))",
    borderRadius: 0,
    padding: "10px 0",
    color: "var(--text)",
    fontSize: "1rem",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
  },
  textarea: {
    background: "rgba(255,255,255,0.04)",
    border: "1.5px solid var(--border, rgba(255,255,255,0.1))",
    borderRadius: 14,
    padding: "1rem 1.1rem",
    color: "var(--text)",
    fontSize: "0.98rem",
    fontFamily: "inherit",
    lineHeight: 1.75,
    outline: "none",
    resize: "vertical",
    minHeight: 260,
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  charCount: { fontSize: "0.75rem", color: "var(--text)", opacity: 0.35, textAlign: "right" },
  imgRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" },
  imgBox: (hasImg) => ({
    aspectRatio: "4/3",
    borderRadius: 16,
    border: hasImg ? "none" : "2px dashed var(--border, rgba(255,255,255,0.15))",
    background: hasImg ? "transparent" : "rgba(255,255,255,0.03)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", overflow: "hidden", position: "relative",
    transition: "border-color 0.2s, background 0.2s",
  }),
  imgPreview: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  imgPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--text)", opacity: 0.35 },
  removeBtn: {
    marginTop: 8, background: "transparent", border: "none",
    color: "var(--text)", opacity: 0.4, cursor: "pointer", fontSize: "0.78rem", textAlign: "center",
    transition: "opacity 0.15s",
  },
  divider: { height: 1, background: "var(--border, rgba(255,255,255,0.08))", margin: "0.4rem 0" },
  footer: { display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", paddingTop: "0.5rem" },
  premNote: { flex: 1, fontSize: "0.8rem", color: "var(--text)", opacity: 0.45, fontStyle: "italic", minWidth: 180 },
  submitBtn: {
    padding: "14px 40px", borderRadius: 999, border: "none",
    background: "linear-gradient(135deg, var(--oxide-red, #c46a4a), #a0522d)",
    color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer",
    boxShadow: "0 4px 20px rgba(196,106,74,0.35)",
    transition: "transform 0.15s, box-shadow 0.15s",
    letterSpacing: "0.02em",
  },
}

function RulesModal({ onClose }) {
  const lang = document.documentElement.lang || "bg"
  const rules = lang === "en" ? RULES_EN : RULES_BG
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg, #111)", borderRadius: 20, padding: "2rem", maxWidth: 500, width: "100%", maxHeight: "78vh", display: "flex", flexDirection: "column", position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text)", lineHeight: 1 }}>×</button>
        <h3 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: "1.25rem", color: "var(--text)" }}>{t("write_rules_title")}</h3>
        <ol style={{ overflowY: "auto", paddingLeft: "1.3rem", flex: 1, lineHeight: 1.8, color: "var(--text)", opacity: 0.85, fontSize: "0.92rem" }}>
          {rules.map((rule, i) => <li key={i} style={{ marginBottom: "0.6rem" }}>{rule}</li>)}
        </ol>
        <button
          onClick={onClose}
          style={{ marginTop: "1.5rem", padding: "12px", borderRadius: 12, border: "none", background: "var(--oxide-red, #c46a4a)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}
        >OK</button>
      </div>
    </div>
  )
}

function ImagePicker({ label, file, preview, onPick, onRemove }) {
  const ref = useRef()
  return (
    <div style={S.field}>
      <span style={S.label}>{label}</span>
      <div style={S.imgBox(!!preview)} onClick={() => ref.current?.click()}>
        {preview
          ? <img src={preview} alt="" style={S.imgPreview} />
          : (
            <div style={S.imgPlaceholder}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span style={{ fontSize: "0.8rem" }}>Качи снимка</span>
            </div>
          )
        }
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onPick} />
      {preview && <button type="button" style={S.removeBtn} onClick={onRemove}>✕ Премахни</button>}
    </div>
  )
}

export default function Write() {
  const { user } = useAuth()

  const [authorName, setAuthorName] = useState(user?.display_name || user?.displayName || user?.username || "")
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
    form.append("file", file)
    const res = await api.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
    return res.data?.secure_url || res.data?.url || ""
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    if (!title.trim()) return setError("Моля въведи заглавие.")
    if (!body.trim() || body.trim().length < 80) return setError("Съдържанието трябва да е поне 80 знака.")
    if (!authorName.trim()) return setError("Моля въведи своето име.")
    setSubmitting(true)
    try {
      let coverUrl = "", endUrl = ""
      if (coverFile) coverUrl = await uploadImage(coverFile)
      if (endFile) endUrl = await uploadImage(endFile)
      await api.post("/write/submit", { author_name: authorName.trim(), title: title.trim(), body: body.trim(), cover_url: coverUrl, end_url: endUrl })
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
        <div style={{ maxWidth: 560, margin: "4rem auto", textAlign: "center" }}>
          <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text)", marginBottom: "0.75rem" }}>{t("write_success")}</h2>
          <p style={{ color: "var(--text)", opacity: 0.55, fontSize: "0.95rem", lineHeight: 1.65 }}>{t("write_premium_note")}</p>
          <button
            style={{ ...S.submitBtn, marginTop: "2rem" }}
            onClick={() => { setSuccess(false); setTitle(""); setBody(""); setAuthorName(user?.displayName || ""); setCoverFile(null); setCoverPreview(null); setEndFile(null); setEndPreview(null) }}
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
      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <h1 style={S.title}>{t("write_title")}</h1>
          <p style={S.subtitle}>{t("write_subtitle")}</p>
          <div style={S.rulesRow}>
            <button style={S.rulesBtn} onClick={() => setShowRules(true)} type="button">
              📋 {t("write_rules_btn")}
            </button>
            <span style={S.note}>🏆 {t("write_leaderboard_note")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={S.form}>

          {/* Author */}
          <div style={S.field}>
            <label style={S.label}>{t("write_name_label")}</label>
            <input
              style={S.input}
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Иван Иванов"
              maxLength={80}
              onFocus={(e) => { e.target.style.borderBottomColor = "var(--oxide-red, #c46a4a)" }}
              onBlur={(e) => { e.target.style.borderBottomColor = "var(--border, rgba(255,255,255,0.15))" }}
            />
          </div>

          {/* Title */}
          <div style={S.field}>
            <label style={S.label}>{t("write_title_label")}</label>
            <input
              style={S.input}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заглавие на статията..."
              maxLength={160}
              onFocus={(e) => { e.target.style.borderBottomColor = "var(--oxide-red, #c46a4a)" }}
              onBlur={(e) => { e.target.style.borderBottomColor = "var(--border, rgba(255,255,255,0.15))" }}
            />
          </div>

          {/* Body */}
          <div style={S.field}>
            <label style={S.label}>{t("write_body_label")}</label>
            <textarea
              style={S.textarea}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Напиши съдържанието на статията тук..."
              rows={14}
              onFocus={(e) => { e.target.style.borderColor = "var(--oxide-red, #c46a4a)" }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border, rgba(255,255,255,0.1))" }}
            />
            <span style={S.charCount}>{body.length} знака</span>
          </div>

          {/* Images */}
          <div style={{ ...S.imgRow, ...(window.innerWidth < 540 ? { gridTemplateColumns: "1fr" } : {}) }}>
            <ImagePicker
              label={t("write_cover_label")}
              preview={coverPreview}
              onPick={(e) => handleImageChange(e, setCoverFile, setCoverPreview)}
              onRemove={() => { setCoverFile(null); setCoverPreview(null) }}
            />
            <ImagePicker
              label={t("write_end_label")}
              preview={endPreview}
              onPick={(e) => handleImageChange(e, setEndFile, setEndPreview)}
              onRemove={() => { setEndFile(null); setEndPreview(null) }}
            />
          </div>

          <div style={S.divider} />

          {error && <p style={{ color: "#ef4444", fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>{error}</p>}

          {/* Footer */}
          <div style={S.footer}>
            <p style={S.premNote}>⭐ {t("write_premium_note")}</p>
            <button
              style={{ ...S.submitBtn, opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
              type="submit"
              disabled={submitting}
              onMouseEnter={(e) => { if (!submitting) { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(196,106,74,0.5)" } }}
              onMouseLeave={(e) => { e.target.style.transform = ""; e.target.style.boxShadow = "0 4px 20px rgba(196,106,74,0.35)" }}
            >
              {submitting ? t("write_submitting") : t("write_submit")}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
