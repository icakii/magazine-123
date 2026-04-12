// client/src/main.jsx
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
import Store from "./pages/Store"
import Opportunities from "./pages/Opportunities"
import MirenArt from "./pages/MirenArt"
// Компоненти
import NavBar from "./components/NavBar"
import Footer from "./components/Footer"
import AuthGuard from "./components/AuthGuard"
import MaintenanceGate from "./components/MaintenanceGate"
import ScrollReveal from "./components/ScrollReveal"
import ScrollParallaxDecor from "./components/ScrollParallaxDecor"

// Auth provider
import { AuthProvider, useAuth } from "./context/AuthContext"

// Стилове
import "./styles/global.css"
import "./styles/layout.css"
import "./styles/animations.css"

const ADMIN_EMAILS = ["icaki@mirenmagazine.com", "info@mirenmagazine.com", "info@mirenmagaizne.com"]

function DevLockedRoute({ sectionName, children }) {
  const { user, loading } = useAuth()
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email)

  if (loading) {
    return (
      <div className="page">
        <p className="subhead">Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <h2 className="headline">{sectionName} is under development</h2>
          <p className="subhead">
            This section is currently unavailable. Only admins can access it until it is ready.
          </p>
        </div>
      </div>
    )
  }

  return children
} 

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
  <AuthProvider>
    <BrowserRouter>
      <ThemeBootstrap />
      <ScrollReveal />

      <MaintenanceGate>
        <NavBar />
        <ScrollParallaxDecor />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* Публични */}
            <Route path="/home" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/events" element={<Events />} />
            <Route path="/leaderboards" element={<Leaderboards />} />
                        <Route
              path="/about"
              element={
                <DevLockedRoute sectionName="About us">
                  <About />
                </DevLockedRoute>
              }
            />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/help" element={<Help />} />
            <Route
              path="/store"
              element={
                <DevLockedRoute sectionName="Store">
                  <Store />
                </DevLockedRoute>
              }
            />
            <Route path="/opportunities" element={<Opportunities />} />
                        <Route path="/miren-art" element={<MirenArt />} />
            <Route path="/partnership" element={<Navigate to="/opportunities" replace />} />
            <Route path="/partnerships" element={<Navigate to="/opportunities" replace />} />
            {/* Auth */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/confirm" element={<Confirm />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/2fa/verify" element={<TwoFAVerify />} />

            {/* Protected */}
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
                <DevLockedRoute sectionName="Subscriptions">
                  <Subscriptions />
                </DevLockedRoute>
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
                       <Route path="/e-magazine" element={<EMagazine />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <AuthGuard>
                  <AdminPanel />
                </AuthGuard>
              }
            />

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
        <Footer />
      </MaintenanceGate>
    </BrowserRouter>
  </AuthProvider>
)
