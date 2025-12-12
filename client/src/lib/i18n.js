// src/lib/i18n.js
const defaultLang = (typeof window !== "undefined" && localStorage.getItem("lang")) || "bg"
let currentLang = defaultLang

const dict = {
  bg: {
    brand: "MIREN",
    home_title: "Добре дошъл в MIREN",
    home_sub: "Тук ще откриеш сигурност, стил и функционалност.",
    start: "Започни",
    gallery: "Галерия",
    about: "За нас",
    contact: "Контакти",
    help: "Помощ",
    profile: "Профил",
    subscriptions: "Абонаменти",
    register: "Регистрация",
    login: "Вход",
    logout: "Изход",
    theme: "Тема",
    language: "Език",
    confirm_email_title: "Потвърждение на имейл",
    confirm_email_progress: "Потвърждаваме...",
    email: "Имейл",
    password: "Парола",
    displayName: "Потребителско име",
    create_account: "Създай акаунт",
    not_logged_in: "Не си влязъл.",
    go_login: "Влез",
    loading: "Зареждане...",
    footer_copy: "© 2025 MIREN. Всички права запазени.",

    // NEW: newsletter + nav label
    newsletter_title: "Абонирай се за новини!",
    newsletter_text:
      "Бъди запознат с най-новото в света на Мирен. Получавай известия за нови статии и събития.",
    newsletter_placeholder: "Твоят най-добър имейл",
    newsletter_button: "Абонирай се",
    newsletter_success: "Успешно се абонира! ✅",
    newsletter_error: "Грешка при абонамента. Опитай пак.",
    nav_emag: "E-списание",
  },

  en: {
    brand: "MIREN",
    home_title: "Welcome to MIREN",
    home_sub: "Here you’ll find security, style and functionality.",
    start: "Get started",
    gallery: "Gallery",
    about: "About",
    contact: "Contacts",
    help: "Help",
    profile: "Profile",
    subscriptions: "Subscriptions",
    register: "Register",
    login: "Login",
    logout: "Logout",
    theme: "Theme",
    language: "Language",
    confirm_email_title: "Email confirmation",
    confirm_email_progress: "Confirming...",
    email: "Email",
    password: "Password",
    displayName: "Display name",
    create_account: "Create account",
    not_logged_in: "You are not logged in.",
    go_login: "Login",
    loading: "Loading...",
    footer_copy: "© 2025 MIREN. All rights reserved.",

    // NEW: newsletter + nav label
    newsletter_title: "Subscribe for updates!",
    newsletter_text:
      "Stay up to date with the latest from MIREN. Get notifications about new articles and events.",
    newsletter_placeholder: "Your best email",
    newsletter_button: "Subscribe",
    newsletter_success: "Successfully subscribed! ✅",
    newsletter_error: "Subscription failed. Please try again.",
    nav_emag: "E-Magazine",
  },
}

export function t(key) {
  const table = dict[currentLang] || dict.bg
  return table[key] || key
}

export function getLang() {
  return currentLang
}

export function setLang(next) {
  currentLang = next === "en" ? "en" : "bg"
  if (typeof window !== "undefined") {
    localStorage.setItem("lang", currentLang)
    window.dispatchEvent(new CustomEvent("lang:change", { detail: { lang: currentLang } }))
  }
}
