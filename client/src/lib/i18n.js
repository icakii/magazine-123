// src/lib/i18n.js
const defaultLang =
  (typeof window !== "undefined" && localStorage.getItem("lang")) || "bg"

let currentLang = defaultLang

const dict = {
  bg: {
    brand: "MIREN",

    // Home
    home_title: "Добре дошъл в MIREN",
    home_sub: "Тук ще откриеш сигурност, стил и функционалност.",
    start: "Започни",
    read_news: "Прочети новини",
    featured: "Подбрани",

    // Nav / menu
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

    // Drawer labels (ако ги превеждаш)
    home: "Начало",
    news: "Новини",
    events: "Събития",
    gallery: "Галерия",
    games: "Игри",
    emag: "E-списание",

    // Newsletter
    newsletter_title: "📩 Абонирай се за новини!",
    newsletter_text:
      "Бъди запознат с най-новото в света на Мирен. Получавай известия за нови статии и събития.",
    newsletter_placeholder: "Имейл адрес",
    newsletter_btn: "Абонирай се",
    newsletter_success: "Успешно се абонира! ✅",

    // Misc
    loading: "Зареждане...",
    footer_copy: "© 2025 MIREN. Всички права запазени.",
  },

  en: {
    brand: "MIREN",

    // Home
    home_title: "Welcome to MIREN",
    home_sub: "Here you’ll find security, style and functionality.",
    start: "Get started",
    read_news: "Read News",
    featured: "Featured",

    // Nav / menu
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

    // Drawer labels
    home: "Home",
    news: "News",
    events: "Events",
    gallery: "Gallery",
    games: "Games",
    emag: "E-Magazine",

    // Newsletter
    newsletter_title: "📩 Subscribe to news!",
    newsletter_text:
      "Stay up to date with the newest in the world of Miren. Get notifications for new articles and events.",
    newsletter_placeholder: "Email address",
    newsletter_btn: "Subscribe",
    newsletter_success: "You have successfully subscribed! ✅",

    // Misc
    loading: "Loading...",
    footer_copy: "© 2025 MIREN. All rights reserved.",
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
    window.dispatchEvent(
      new CustomEvent("lang:change", { detail: { lang: currentLang } })
    )
  }
}
