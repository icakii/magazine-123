import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"
import "../styles/miren-art.css"

const DISCORD_URL = "https://discord.gg/fsEZAVQB"
const CONTACT_EMAIL = "contact@mirenmagazine.com"

const DEADLINE = "24 май 2026"
const DEADLINE_EN = "May 24, 2026"

const content = {
  bg: {
    heroSubtitle: "MIREN ART — BLOOM",
    heroText:
      "Нарисувай каквото Bloom означава за теб. Молив, акварел, маслени бои, дигитално — изборът е твой. Само тема, без правила за стил.",
    generateCode: "Генерирай код",
    readRules: "Прочети правилата",
    aboutTitle: "Какво е MIREN ART?",
    aboutText:
      "MIREN ART е конкурс за млади артисти, които могат да създадат визуална интерпретация на MIREN. Най-силните творби могат да бъдат публикувани в сайта, социалните мрежи и в самото списание.",
    eligibleTitle: "Какво можеш да изпратиш?",
    howTitle: "Как да участваш",
    steps: [
      "Създай акаунт в mirenmagazine.com",
      "Регистрирай се за конкурса чрез MIREN ART панела",
      "Генерирай своя entry code",
      "Качи творбата си в Discord канала или я изпрати по имейл с името си, Instagram handle и кода",
    ],
    helper: "Използвай този код, когато изпращаш творбата си в Discord или по имейл.",
    copy: "Копирай",
    copied: "Копирано",
    discordTitle: "Изпрати своята творба",
    joinDiscord: "Влез в Discord",
    mail: "Изпрати по имейл",
    mailText:
      "Ако не можеш да качиш творбата си в Discord, изпрати я по имейл заедно с твоето ime, Instagram handle и entry code.",
    prizeTitle: "Награди",
    prizeText: "Трима победители ще бъдат избрани и всички ще бъдат включени в списание MIREN. Наградите се изплащат по банков път.",
    evaluationTitle: "Как се избира победителят",
    evaluationText:
      "Победителят се избира от притежателя и организатора на MIREN въз основа на обща творческа преценка, визуално въздействие, оригиналност, идея и съответствие с концепцията на MIREN.",
    rightsTitle: "Твоята творба може да стане част от MIREN",
    rightsText:
      "Изпратените творби могат да бъдат публикувани в сайта, в социалните мрежи и в списанието MIREN. С участието си участниците се съгласяват творбите им да бъдат използвани за редакционни, рекламни и бранд цели на MIREN.",
    footerCTA: "Създай нещо, което може да стане част от MIREN.",
    rulesTitle: "Официални правила",
    deadline: `Deadline: ${DEADLINE}`,
  },
  en: {
    heroSubtitle: "MIREN ART — BLOOM",
    heroText:
      "Draw what Bloom means to you. Pencil, watercolor, oil, digital — your choice. One theme, no style rules.",
    generateCode: "Generate Code",
    readRules: "Read the Rules",
    aboutTitle: "What is MIREN ART?",
    aboutText:
      "MIREN ART is a competition for young artists who can create a visual interpretation of MIREN. The strongest works may be featured on the website, on social media and inside the magazine.",
    eligibleTitle: "What can you submit?",
    howTitle: "How to Participate",
    steps: [
      "Create an account on mirenmagazine.com",
      "Register for the competition through the MIREN ART panel",
      "Generate your entry code",
      "Upload your artwork in the Discord channel or send it by email with your name, Instagram handle and code",
    ],
    helper: "Use this code when submitting your artwork in Discord or by email.",
    copy: "Copy",
    copied: "Copied",
    discordTitle: "Submit your artwork",
    joinDiscord: "Join Discord",
    mail: "Send by Email",
    mailText:
      "If you can't upload your artwork in Discord, send it by email together with your name, Instagram handle and entry code.",
    prizeTitle: "Prizes",
    prizeText: "Three winners will be selected and all will be featured in MIREN magazine. Prizes are paid via bank transfer.",
    evaluationTitle: "How the winner is selected",
    evaluationText:
      "The winner is selected by the owner and organizer of MIREN based on overall creative judgment, visual impact, originality, concept and alignment with the MIREN vision.",
    rightsTitle: "Your work can become part of MIREN",
    rightsText:
      "Submitted works may be published on the website, on social media and inside MIREN magazine. By participating, entrants agree that their work may be used for editorial, promotional and brand purposes by MIREN.",
    footerCTA: "Create something that could become part of MIREN.",
    rulesTitle: "Official Rules",
    deadline: `Deadline: ${DEADLINE_EN}`,
  },
}

const artTypes = [
  ["✏️ Рисунка", "✏️ Drawing"],
  ["💻 Дигитален арт", "💻 Digital Art"],
  ["🎨 Акварел", "🎨 Watercolor"],
  ["🖌️ Маслени бои", "🖌️ Oil Paint"],
]

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

export default function MirenArt() {
  const { user } = useAuth()
  const [lang, setLang] = useState("bg")
  const [code, setCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [openRules, setOpenRules] = useState(false)
  const [codeMsg, setCodeMsg] = useState("")
  const [codeBusy, setCodeBusy] = useState(false)

  const t = content[lang]
  const mailSubject =
    lang === "bg"
      ? `[MIREN ART] Име: <твоето име> | Instagram: <handle> | Код: ${code || "<entry code>"} | Title: <заглавие>`
      : `[MIREN ART] Name: <your name> | Instagram: <handle> | Code: ${code || "<entry code>"} | Title: <title>`
  const mailBody =
    lang === "bg"
      ? `Име: <твоето име>\nInstagram handle: <@handle>\nEntry code: ${code || "<entry code>"}\nTitle: <заглавие на творбата>\n\nЛинк към творбата / описание:\n<добави линк или текст>`
      : `Name: <your name>\nInstagram handle: <@handle>\nEntry code: ${code || "<entry code>"}\nTitle: <artwork title>\n\nArtwork link / description:\n<add link or text>`
  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`
  const gmailComposeHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`

  const generateEntryCode = async () => {
    if (!user) {
      setCodeMsg(lang === "bg" ? "Трябва да влезеш в акаунта си, за да генерираш код." : "You need to sign in to generate an entry code.")
      return
    }
    try {
      setCodeBusy(true)
      setCodeMsg("")
      const res = await api.post("/miren-art/code")
      const next = String(res.data?.code || "").trim()
      setCode(next)
      if (res.data?.existing) {
        setCodeMsg(lang === "bg" ? "Вече имаш активен код. Използвай го за участие." : "You already have an active code. Use it for submission.")
      } else {
        setCodeMsg(lang === "bg" ? "✅ Кодът е генериран успешно." : "✅ Code generated successfully.")
      }
    } catch (e) {
      setCodeMsg(e?.response?.data?.error || (lang === "bg" ? "Неуспешно генериране на код." : "Failed to generate code."))
    } finally {
      setCodeBusy(false)
    }
  }

  const rulesParagraphs = useMemo(
    () =>
      lang === "bg"
        ? [
            "ПРАВИЛА ЗА ПРОВЕЖДАНЕ НА СЪСТЕЗАНИЕ",
            "„MIREN ART“",
            "1. Организатор",
            "Състезанието се организира от MIREN MAG (наричано по-долу „Организатор“), онлайн платформа за съдържание и дигитално списание.",
            "2. Описание на състезанието",
            "„MIREN ART“ представлява онлайн творческо състезание, насочено към млади автори, които имат интерес към изкуство, фотография, видеография или други визуални форми на съдържание.",
            "3. Условия за участие",
            "(1) За участие е необходимо:",
            "създаване на акаунт в платформата mirenmagazine.com;",
            "регистрация за състезанието чрез „MIREN ART“ панела в сайта;",
            "изпращане на авторска творба в официалния Discord сървър на MIREN MAG, в посочения канал.",
            "(2) Всеки участник има право да участва с една или повече авторски творби.",
            "(3) Участниците декларират, че изпратеното съдържание е изцяло тяхно и не нарушава права на трети лица.",
            "4. Период на провеждане",
            "Състезанието се провежда в период, определен и обявен от Организатора чрез официалните канали на MIREN MAG.",
            "5. Критерии за оценяване",
            "(1) Оценяването на участниците се извършва от Организатора.",
            "(2) Победителят се определя въз основа на обща преценка, включваща, но не ограничена до:",
            "креативност и оригиналност;",
            "визуално въздействие;",
            "идея и концепция;",
            "цялостно представяне.",
            "(3) Окончателният избор на победител се извършва по субективна оценка на Организатора, съобразена с концепцията и визията на MIREN MAG.",
            "6. Награди",
            "(1) Наградите са парични и се разпределят по следния начин: 1-во място — 100 евро; 2-ро място — 50 евро; 3-то място — 25 евро.",
            "(2) Всички трима победители ще бъдат включени в изданието на списание MIREN.",
            "(3) Наградите се изплащат по банков път по предоставена от победителя банкова сметка.",
            "(4) Организаторът не носи отговорност за неправилно подадени банкови данни.",
            "7. Определяне на победителите",
            "(1) Трима победители се избират измежду всички участници.",
            "(2) Победителите се определят еднолично от Организатора.",
            "(3) Резултатите се обявяват чрез сайта и социалните мрежи на MIREN MAG.",
            "8. Авторски права и използване на съдържание",
            "(1) С участието си в състезанието, участниците предоставят на Организатора неизключително, безвъзмездно и неограничено във времето право да използва, публикува, разпространява и адаптира изпратеното съдържание.",
            "(2) Това включва, но не се ограничава до:",
            "публикуване в сайта mirenmagazine.com;",
            "публикуване в социалните мрежи на MIREN MAG;",
            "включване в дигиталното или печатното издание на списанието MIREN.",
            "(3) Участниците се съгласяват, че съдържанието им може да бъде използвано за маркетингови, рекламни и редакционни цели на MIREN MAG.",
            "(4) Участниците запазват авторството върху своите творби, но предоставят право за използване съгласно горепосочените условия.",
            "9. Допълнителни условия",
            "(1) С участието си участниците приемат настоящите правила.",
            "(2) Организаторът си запазва правото да променя или допълва настоящите правила при необходимост.",
            "(3) Организаторът има право да дисквалифицира участници при:",
            "нарушение на правилата;",
            "предоставяне на неавторско съдържание;",
            "неподходящо или незаконно съдържание.",
          ]
        : [
            "1) Organizer: The competition is organized by MIREN MAG.",
            "2) Period: Submissions are accepted within the timeframe announced on the MIREN ART page.",
            "3) Eligibility: Each entrant must have an account on mirenmagazine.com and a valid entry code.",
            "4) Formats: Both static and dynamic visual concepts are accepted, including motion-style and VFX ideas.",
            "5) Evaluation: Originality, visual impact, concept, execution quality and alignment with MIREN identity.",
            "6) Prizes: 1st place — €100, 2nd place — €50, 3rd place — €25, all paid via bank transfer. All three winners will be featured in MIREN magazine.",
            "7) Copyright: Entrants confirm the submitted work is original or that they own all required rights.",
            "8) Usage rights: MIREN may feature submitted works on the website, social media and magazine for editorial and branding use.",
            "9) The organizer reserves the right to moderate and remove inappropriate, offensive or unlawful content.",
            "10) By participating, entrants accept these terms.",
          ],
    [lang]
  )
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
    document.body.classList.add("miren-art-route")

    return () => {
      document.body.classList.remove("miren-art-route")
    }
  }, [])
  
  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      try {
        const res = await api.get("/miren-art/code")
        if (!alive) return
        const existing = String(res.data?.code || "").trim()
        if (existing) setCode(existing)
      } catch {}
    })()
    return () => {
      alive = false
    }
  }, [user])

  return (
    <div className="miren-art">
      <section className="miren-art-hero-v2">
        <div className="miren-art-noise" aria-hidden="true" />
        <div className="miren-art-particle miren-art-particle--a" aria-hidden="true" />
        <div className="miren-art-particle miren-art-particle--b" aria-hidden="true" />
        <div className="miren-art-particle miren-art-particle--c" aria-hidden="true" />

        <div className="miren-art-topbar">
          <button className={`lang-btn ${lang === "bg" ? "active" : ""}`} onClick={() => setLang("bg")} type="button">
            BG
          </button>
          <button className={`lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")} type="button">
            EN
          </button>
        </div>

        <motion.div className="miren-art-hero-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
          <div className="miren-hero-grid">
            <div>
              <p className="miren-art-kicker">{t.heroSubtitle}</p>
              <h1>MIREN ART</h1>
              <p className="miren-art-lead">{t.heroText}</p>
              <div className="miren-art-hero-actions">
                <button className="btn outline" onClick={() => setOpenRules(true)} type="button">
                  {t.readRules}
                </button>
                <span className="miren-deadline-badge">{t.deadline}</span>
              </div>
            </div>

            <aside className="miren-code-card">
              <h3>{t.generateCode}</h3>
              <button className="btn primary" onClick={generateEntryCode} disabled={codeBusy} type="button">
                {t.generateCode}
              </button>
              <AnimatePresence mode="wait">
                {code && (
                  <motion.div
                    key={code}
                    className="code-pill"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                  >
                    <strong>{code}</strong>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(code)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 1200)
                        } catch {}
                      }}
                    >
                      {copied ? t.copied : t.copy}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {codeMsg && <p className="muted">{codeMsg}</p>}
              <p className="muted">{t.helper}</p>
            </aside>
          </div>
        </motion.div>
      </section>

      <motion.section className="miren-section" {...reveal}>
        <h2>{t.aboutTitle}</h2>
        <p>{t.aboutText}</p>
      </motion.section>

      <motion.section className="miren-section" {...reveal}>
        <h2>{t.eligibleTitle}</h2>
        <div className="miren-grid">
          {artTypes.map(([bg, en]) => (
            <article key={en} className="miren-card">
              <h3>{lang === "bg" ? bg : en}</h3>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section className="miren-section" {...reveal}>
        <h2>{t.howTitle}</h2>
        <div className="timeline">
          {t.steps.map((step, i) => (
            <div key={step} className="timeline-item">
              <span>{`0${i + 1}`}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section className="miren-section submit-panel" {...reveal}>
        <div className="submit-shell">
          <div className="submit-left">
            <h2>{t.discordTitle}</h2>
            <a className="btn primary" href={DISCORD_URL} target="_blank" rel="noreferrer">
              {t.joinDiscord}
            </a>
          </div>
          <div className="email-card submit-right">
            <p>{t.mailText}</p>
            <a className="btn outline" href={gmailComposeHref} target="_blank" rel="noreferrer">
              {t.mail}
            </a>
            <small>{CONTACT_EMAIL}</small>
            <small>{lang === "bg" ? "Template: име + Instagram handle + код + title (MIREN ART)." : "Template: name + Instagram handle + code + title (MIREN ART)."}</small>
            <small>
              {lang === "bg" ? "Ако Gmail не се отвори, използвай fallback:" : "If Gmail does not open, use fallback:"}{" "}
              <a href={mailtoHref}>{lang === "bg" ? "mailto линк" : "mailto link"}</a>
            </small>
          </div>
        </div>
      </motion.section>

      <motion.section className="miren-section" {...reveal}>
        <h2>{t.prizeTitle}</h2>
        <p style={{ opacity: 0.65, marginBottom: "1.5rem", fontSize: "0.95rem" }}>{t.prizeText}</p>
        <div className="miren-prizes">
          <article className="miren-prize-card miren-prize-card--gold">
            <div className="miren-prize-rank">🥇</div>
            <div className="miren-prize-place">{lang === "bg" ? "1-во място" : "1st Place"}</div>
            <div className="miren-prize-amount">100€</div>
          </article>
          <article className="miren-prize-card miren-prize-card--silver">
            <div className="miren-prize-rank">🥈</div>
            <div className="miren-prize-place">{lang === "bg" ? "2-ро място" : "2nd Place"}</div>
            <div className="miren-prize-amount">50€</div>
          </article>
          <article className="miren-prize-card miren-prize-card--bronze">
            <div className="miren-prize-rank">🥉</div>
            <div className="miren-prize-place">{lang === "bg" ? "3-то място" : "3rd Place"}</div>
            <div className="miren-prize-amount">25€</div>
          </article>
        </div>
      </motion.section>

      <motion.section className="miren-section" {...reveal}>
        <article className="miren-card">
          <h2>{t.evaluationTitle}</h2>
          <p>{t.evaluationText}</p>
        </article>
      </motion.section>

      <motion.section className="miren-section rights" {...reveal}>
        <h2>{t.rightsTitle}</h2>
        <p>{t.rightsText}</p>
      </motion.section>

      <AnimatePresence>
        {openRules && (
          <motion.div className="rules-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpenRules(false)}>
            <motion.div className="rules-modal" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={(e) => e.stopPropagation()}>
              <div className="rules-head">
                <h3>{t.rulesTitle}</h3>
                <button type="button" className="cart-close" onClick={() => setOpenRules(false)}>
                  ✕
                </button>
              </div>
              <div className="rules-body">
                {rulesParagraphs.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}