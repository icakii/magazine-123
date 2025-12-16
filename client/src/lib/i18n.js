const defaultLang =
  (typeof window !== "undefined" && localStorage.getItem("lang")) || "bg"

let currentLang = defaultLang

export const dict = {
  bg: {
    brand: "MIREN",

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

    // NAV (drawer)
    home: "Начало",
    news: "Новини",
    events: "Събития",
    gallery: "Галерия",
    games: "Игри",
    emag: "Е-списание",
    about: "За нас",
    contact: "Контакти",
    subscriptions: "Абонаменти",
    help: "Помощ",
    profile: "Профил",

    // AUTH/UI
    register: "Регистрация",
    login: "Вход",
    logout: "Изход",
    theme: "Тема",
    loading: "Зареждане...",

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


    footer_copy: "© 2025 MIREN. Всички права запазени.",
  },

  en: {
    brand: "MIREN",

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

    home: "Home",
    news: "News",
    events: "Events",
    gallery: "Gallery",
    games: "Games",
    emag: "E-Magazine",
    about: "About",
    contact: "Contact",
    subscriptions: "Subscriptions",
    help: "Help",
    profile: "Profile",

    register: "Register",
    login: "Login",
    logout: "Logout",
    theme: "Theme",
    loading: "Loading...",

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


    footer_copy: "© 2025 MIREN. All rights reserved.",
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
