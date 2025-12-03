// client/src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Страници
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import TwoFASetup from './pages/TwoFASetup'
import TwoFAVerify from './pages/TwoFAVerify'
import Profile from './pages/Profile'
import AdminPanel from './pages/AdminPanel'
import Games from './pages/Games'
import EMagazine from './pages/EMagazine'
import Leaderboards from './pages/Leaderboards'
import Subscriptions from './pages/Subscriptions'
import About from './pages/About'
import Gallery from './pages/Gallery'
import Contact from './pages/Contact'
import Help from './pages/Help'
import Confirm from './pages/Confirm'
import News from './pages/News'
import Events from './pages/Events'
import WordGameArchive from './pages/WGArchive'
import ResetPassword from './pages/ResetPassword' // <-- НОВИЯТ ИМПОРТ

// Компоненти
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

// Стилове
import './styles/global.css'
import './styles/layout.css'
import './styles/animations.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <NavBar />
    <main className="app-main">
      <Routes>
        {/* Публични страници */}
        <Route path='/' element={<Home />} />
        <Route path="/news" element={<News />} />
        <Route path="/events" element={<Events />} />
        <Route path='/leaderboards' element={<Leaderboards />} />
        <Route path='/about' element={<About />} />
        <Route path='/gallery' element={<Gallery />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/help' element={<Help />} />
        
        {/* Auth страници */}
        <Route path='/register' element={<Register />} />
        <Route path='/login' element={<Login />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/reset-password" element={<ResetPassword />} /> {/* <-- НОВИЯТ ROUTE */}
        <Route path='/2fa/verify' element={<TwoFAVerify />} />

        {/* Защитени страници (изискват логин) */}
        <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path='/2fa/setup' element={<ProtectedRoute><TwoFASetup /></ProtectedRoute>} />
        <Route path='/subscriptions' element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
        <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
        <Route path="/word-game-archive" element={<ProtectedRoute><WordGameArchive /></ProtectedRoute>} />
        <Route path="/e-magazine" element={<ProtectedRoute><EMagazine /></ProtectedRoute>} />
        
        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      </Routes>
    </main>
    <Footer />
  </BrowserRouter>
)