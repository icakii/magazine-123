const defaultLang =
  (typeof window !== "undefined" && localStorage.getItem("lang")) || "bg"

let currentLang = defaultLang

export const dict = {
  bg: {
    brand: "MIREN",

opportunities: "Партньорства",

opp_title: "Партньорства",
opp_banner_kicker: "Важно",
opp_banner_text:
  "Цените се договарят индивидуално и изискват одобрение. Не могат да се закупят директно.",

opp_chip: "Approved only",
opp_contact_btn: "Contact us",
opp_footer_note:
  "Ще се свържем с теб по имейл възможно най-скоро.",

opp_card1_title: "Become a collaborator",
opp_card1_text:
  "Работи с MIREN по съдържание, кампании и creative идеи. Търсим хора със стил и консистентност.",
opp_card1_bullets: [
  "Brand collaboration / кампании",
  "Co-created content & shooting",
  "Long-term partnership options",
],
opp_card1_subject: "Become a collaborator — MIREN",

opp_card2_title: "Become a sponsor",
opp_card2_text:
  "Спонсорирай проект/рубрика/брой. Перфектно за брандове, които искат премиум позициониране и доверие.",
opp_card2_bullets: [
  "Premium visibility & placement",
  "Tailored sponsor packages",
  "Monthly or per-campaign options",
],
opp_card2_subject: "Become a sponsor — MIREN",

opp_card3_title: "Get your own article",
opp_card3_text:
  "Искаш твоя история/бранд/проект да бъде представен като статия. Всичко минава през редакторско одобрение.",
opp_card3_bullets: [
  "Editorial review & approval",
  "Professional writing & layout",
  "Optional visuals / gallery support",
],
opp_card3_subject: "Get your own article — MIREN",

// --- OPPORTUNITIES EMAIL HELP ---

opp_email_help_title: "Как работи контактът?",
opp_email_help_text:
  "Бутонът отваря Gmail чернова в браузъра. Ако не си влязъл в Gmail, ще бъдеш помолен да влезеш. При нужда можеш да използваш резервния линк за имейл приложение.",

opp_email_help_alt: "Отвори в имейл приложение",

    // HOME
    home_title: "Добре дошъл в MIREN",
    home_sub: "Тук ще откриеш сигурност, стил и функционалност.",
    home_user_sub: "Разгледай най-новото ни съдържание.",
    welcome: "Добре дошъл",
    start: "Започни",
    read_news: "Прочети новини",
    featured: "Подбрани",
    read_more: "Прочети още",
    premium_content: "Premium съдържание",
    subscribe_unlock: "Абонирай се за достъп",

    // HERO INTRO
    hero_kicker: "NEW ISSUE",
    hero_subtitle: "Е-списанието е тук — влез в пълната версия на сайта.",
    hero_swipe: "Swipe down за сайта",
    hero_hint: "Можеш да се върнеш тук като скролнеш нагоре.",

    profile_username_section: "Потребителско име",
profile_premium_only: "Premium only 🔒",
profile_wait: "Изчакай {days} дни",
profile_available_in: "Достъпно след {days} дни",
profile_edit: "Редакция",
profile_save: "Запази",
profile_cancel: "Отказ",
profile_saving: "Запазване...",
profile_new_username_placeholder: "Ново потребителско име",
profile_username_hint: "Можеш да смениш името веднъж на {days} дни.",
profile_premium_feature_error: "Това е Premium функция.",
profile_username_cooldown_error: "Можеш да сменяш името веднъж на {days} дни.",
profile_username_too_short: "Името е твърде късо (мин 3 символа).",
profile_username_updated: "Името е обновено!",
profile_username_error: "Грешка при смяна на името.",
profile_endpoint_missing: "Грешка: endpoint за username липсва (404). Добави: POST /api/user/update-username",
profile_reset_btn: "Изпрати имейл за смяна на парола",
profile_reset_sent: "Линкът е изпратен на имейла ти!",
profile_reset_error: "Грешка при изпращане на линка.",
profile_2fa_setup_btn: "🛡️ Настрой 2FA",
profile_2fa_active: "✅ 2FA е активирано",


    // NAV (drawer)
    home: "Начало",
    news: "Новини",
    events: "Събития",
    gallery: "Галерия",
    games: "Игри",
    emag: "Е-списание",
    about: "За нас",
    contact: "Контакти",
    store: "Магазин",
    subscriptions: "Абонаменти",
    help: "Помощ",
    profile: "Профил",

        displayName: "Име",
    email: "Имейл",
    subscription: "Абонамент",
    security: "Безопасност",

    // AUTH/UI
    create_account: "Създай Акаунт",
    register: "Регистрация",
    login: "Вход",
    logout: "Изход",
    theme: "Тема",
    language: "Език",
    loading: "Зареждане...",
    home_discord_title: "Влез в нашия Discord сървър",
    home_discord_text: "Вземай ъпдейти за списанието, събития, игри и community дропове в реално време.",
    home_discord_btn: "Влез в Discord",
    home_no_featured: "Все още няма подбрани статии.",
    home_work_title: "Работи с нас ✨",
    home_work_text: "Партньорства, спонсорства и custom бранд кампании с MIREN MAG. Нека направим нещо смело заедно.",
    home_work_cta: "Отвори партньорства",
    home_weekly_schedule: "Седмична програма",

    // NEWSLETTER
    newsletter_title: "📩 Абонирай се за новини!",
    newsletter_text:
      "Бъди запознат с най-новото в света на Мирен. Получавай известия за нови статии и събития.",
    newsletter_placeholder: "Твоят имейл",
    newsletter_btn: "Абонирай се",
    newsletter_success: "Успешно се абонира! ✅",

    // CONFIRM
    // BG
confirm_processing: "Потвърждаваме...",
confirm_no_token: "Липсва токен за потвърждение.",
confirm_success: "Имейлът е потвърден! ✅",
confirm_failed: "Невалиден или изтекъл линк.",
go_home: "Към началото",

confirm_title: "Потвърждение по имейл",
confirm_button: "Потвърди",


confirm_email_title: "Потвърждение по имейл",
twofa_setup_title: "Настройка на 2FA",
twofa_verify_title: "Потвърди 2FA",
twofa_send: "Изпрати имейл",
twofa_resend: "Изпрати пак",
twofa_code_placeholder: "Въведи код",
twofa_verify_btn: "Потвърди",


    footer_copy: "© 2026 MIREN MAG. Всички права запазени.",
  },

  en: {
    brand: "MIREN",

    opportunities: "Partnerships",

opp_title: "Partnerships",
opp_banner_kicker: "Important",
opp_banner_text:
  "Prices are negotiated individually and require approval. These can’t be purchased directly.",

opp_chip: "Approved only",
opp_contact_btn: "Contact us",
opp_footer_note: "We’ll reply by email as soon as possible.",

opp_card1_title: "Become a collaborator",
opp_card1_text:
  "Work with MIREN on content, campaigns, and creative ideas. We’re looking for people with style and consistency.",
opp_card1_bullets: [
  "Brand collaborations / campaigns",
  "Co-created content & shooting",
  "Long-term partnership options",
],
opp_card1_subject: "Become a collaborator — MIREN",

opp_card2_title: "Become a sponsor",
opp_card2_text:
  "Sponsor a project/section/issue. Perfect for brands that want premium placement and trust.",
opp_card2_bullets: [
  "Premium visibility & placement",
  "Tailored sponsor packages",
  "Monthly or per-campaign options",
],
opp_card2_subject: "Become a sponsor — MIREN",

opp_card3_title: "Get your own article",
opp_card3_text:
  "Want your story/brand/project featured as an article? Everything goes through editorial approval.",
opp_card3_bullets: [
  "Editorial review & approval",
  "Professional writing & layout",
  "Optional visuals / gallery support",
],
opp_card3_subject: "Get your own article — MIREN",

// EN
opp_email_help_title: "How does contact work?",
opp_email_help_text:
  "The button opens a Gmail draft in your browser. If you’re not logged into Gmail, you’ll be asked to sign in. You can also use the fallback link to open your email app.",

opp_email_help_alt: "Open in email app",


    home_title: "Welcome to MIREN",
    home_sub: "Here you’ll find security, style and functionality.",
    home_user_sub: "Explore our latest content.",
    welcome: "Welcome",
    start: "Get started",
    read_news: "Read News",
    featured: "Featured",
    read_more: "Read More",
    premium_content: "Premium content",
    subscribe_unlock: "Subscribe to unlock",

    hero_kicker: "NEW ISSUE",
    hero_subtitle: "The e-magazine is here — enter the full site experience.",
    hero_swipe: "Swipe down for the site",
    hero_hint: "Scroll up anytime to return here.",

    profile_username_section: "Username",
profile_premium_only: "Premium only 🔒",
profile_wait: "Wait {days} days",
profile_available_in: "Available in {days} days",
profile_edit: "Edit",
profile_save: "Save",
profile_cancel: "Cancel",
profile_saving: "Saving...",
profile_new_username_placeholder: "New username",
profile_username_hint: "You can change your username once every {days} days.",
profile_premium_feature_error: "This is a Premium feature.",
profile_username_cooldown_error: "You can change your username once every {days} days.",
profile_username_too_short: "Name too short (min 3 chars).",
profile_username_updated: "Username updated!",
profile_username_error: "Error updating username.",
profile_endpoint_missing: "Username endpoint not found (404). Add: POST /api/user/update-username",
profile_reset_btn: "Send email to reset password",
profile_reset_sent: "Reset link sent to your email!",
profile_reset_error: "Error sending link.",
profile_2fa_setup_btn: "🛡️ Configure 2FA",
profile_2fa_active: "✅ Two-Factor Authentication is Active",


    home: "Home",
    news: "News",
    events: "Events",
    gallery: "Gallery",
    games: "Games",
    emag: "E-Magazine",
    about: "About",
    contact: "Contact",
    store: "Store",
    subscriptions: "Subscriptions",
    help: "Help",
    profile: "Profile",

    displayName: "Username",
    email: "Email",
    subscription: "Subscription",
    security: "Security",

    create_account: "Create Account",
    register: "Register",
    login: "Login",
    logout: "Logout",
    theme: "Theme",
    language: "Language",
    loading: "Loading...",
    home_discord_title: "Join our Discord server",
    home_discord_text: "Get magazine updates, events, games and community drops in real time.",
    home_discord_btn: "Join Discord",
    home_no_featured: "No featured articles yet.",
    home_work_title: "Work with us ✨",
    home_work_text: "Partnerships, sponsorships and custom brand campaigns with MIREN MAG. Let’s build something bold together.",
    home_work_cta: "Open Partnerships",
    home_weekly_schedule: "Weekly Schedule",

    newsletter_title: "📩 Subscribe to news!",
    newsletter_text:
      "Stay up to date with the latest from MIREN. Get notified about new articles and events.",
    newsletter_placeholder: "Your best email",
    newsletter_btn: "Subscribe",
    newsletter_success: "Successfully subscribed! ✅",

    // EN
confirm_processing: "Confirming...",
confirm_no_token: "Missing confirmation token.",
confirm_success: "Email confirmed! ✅",
confirm_failed: "Invalid or expired link.",
go_home: "Go home",

confirm_title: "Email verification",
confirm_button: "Confirm",


confirm_email_title: "Email verification",
twofa_setup_title: "2FA Setup",
twofa_verify_title: "2FA Verify",
twofa_send: "Send Email",
twofa_resend: "Resend",
twofa_code_placeholder: "Enter code",
twofa_verify_btn: "Verify",


    footer_copy: "© 2026 MIREN MAG. All rights reserved.",
  },
}

export function t(key) {
  const table = dict[currentLang] || dict.bg
  return table[key] ?? key
}

export function getLang() {
  return currentLang
}

export function setLang(next) {
  currentLang = next === "en" ? "en" : "bg"
  if (typeof window !== "undefined") {
    localStorage.setItem("lang", currentLang)
    window.dispatchEvent(
      new CustomEvent("lang:change", { detail: { lang: currentLang } })
    )
  }
}
