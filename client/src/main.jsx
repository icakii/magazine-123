import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

// Страници
import Home from "./pages/Home"
import Register from "./pages/Register"
import Login from "./pages/Login"
import TwoFASetup from "./pages/TwoFASetup"
import TwoFAVerify from "./pages/TwoFAVerify"
import Profile from "./pages/Profile"
import AdminPanel from "./pages/AdminPanel"
import Games from "./pages/Games"
import EMagazine from "./pages/EMagazine"
import Leaderboards from "./pages/Leaderboards"
import Subscriptions from "./pages/Subscriptions"
import About from "./pages/About"
import Gallery from "./pages/Gallery"
import Contact from "./pages/Contact"
import Help from "./pages/Help"
import Confirm from "./pages/Confirm"
import News from "./pages/News"
import Events from "./pages/Events"
import WordGameArchive from "./pages/WGArchive"
import ResetPassword from "./pages/ResetPassword"

// Компоненти
import NavBar from "./components/NavBar"
import Footer from "./components/Footer"
import AuthGuard from "./components/AuthGuard"
import MaintenanceGate from "./components/MaintenanceGate"

// ✅ Auth Context Provider
import { AuthProvider } from "./context/AuthContext"

// Стилове
import "./styles/global.css"
import "./styles/layout.css"
import "./styles/animations.css"

/**
 * ✅ FIX: persist theme across routes + reloads
 */
function ThemeBootstrap() {
  useEffect(() => {
    const KEY = "miren_theme"

    const apply = (value) => {
      const theme = value === "dark" ? "dark" : "light"
      document.documentElement.setAttribute("data-theme", theme)
      try {
        localStorage.setItem(KEY, theme)
      } catch {}
    }

    let saved = "light"
    try {
      saved = localStorage.getItem(KEY) || "light"
    } catch {}

    const current = document.documentElement.getAttribute("data-theme")
    apply(current || saved)

    const onStorage = (e) => {
      if (e.key === KEY) apply(e.newValue)
    }
    window.addEventListener("storage", onStorage)

    return () => window.removeEventListener("storage", onStorage)
  }, [])

  return null
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeBootstrap />

    {/* ✅ AuthProvider трябва да е НАЙ-ОТГОРЕ, за да работи useAuth навсякъде */}
    <AuthProvider>
      {/* ✅ MaintenanceGate трябва да е ВЪТРЕ в AuthProvider (ползва useAuth) */}
      <MaintenanceGate>
        <NavBar />
        <main className="app-main">
          <Routes>
            {/* Redirect: винаги като влезеш в сайта -> /home */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* Публични страници */}
            <Route path="/home" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/events" element={<Events />} />
            <Route path="/leaderboards" element={<Leaderboards />} />
            <Route path="/about" element={<About />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/help" element={<Help />} />

            {/* Auth страници */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/confirm" element={<Confirm />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/2fa/verify" element={<TwoFAVerify />} />

            {/* Защитени страници (с AuthGuard) */}
            <Route
              path="/profile"
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              }
            />
            <Route
              path="/2fa/setup"
              element={
                <AuthGuard>
                  <TwoFASetup />
                </AuthGuard>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <AuthGuard>
                  <Subscriptions />
                </AuthGuard>
              }
            />
            <Route
              path="/games"
              element={
                <AuthGuard>
                  <Games />
                </AuthGuard>
              }
            />
            <Route
              path="/word-game-archive"
              element={
                <AuthGuard>
                  <WordGameArchive />
                </AuthGuard>
              }
            />
            <Route
              path="/e-magazine"
              element={
                <AuthGuard>
                  <EMagazine />
                </AuthGuard>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <AuthGuard>
                  <AdminPanel />
                </AuthGuard>
              }
            />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
        <Footer />
      </MaintenanceGate>
    </AuthProvider>
  </BrowserRouter>
)
