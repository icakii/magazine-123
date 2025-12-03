import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import TwoFASetup from './pages/TwoFASetup'
import TwoFAVerify from './pages/TwoFAVerify'
import Profile from './pages/Profile'
import AdminPanel from './pages/AdminPanel'
import ResetPassword from './pages/ResetPassword'
import Games from './pages/Games'
import EMagazine from './pages/EMagazine'
import Leaderboards from './pages/Leaderboards'
import Subscriptions from './pages/Subscriptions'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import About from './pages/About'
import Gallery from './pages/Gallery'
import Contact from './pages/Contact'
import Help from './pages/Help'
import Confirm from './pages/Confirm'
import News from './pages/News'
import Events from './pages/Events'
// НОВ ИМПОРТ
import WordGameArchive from './pages/WGArchive'

import './styles/global.css'
import './styles/layout.css'
import './styles/animations.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <NavBar />
    <main className="app-main">
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path="/news" element={<News />} />
        <Route path="/events" element={<Events />} />
        <Route path='/leaderboards' element={<Leaderboards />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/games" element={<Games />} />
        
        {/* НОВИЯТ ROUTE ЗА АРХИВА */}
        <Route path="/word-game-archive" element={<WordGameArchive />} />
        
        <Route path="/e-magazine" element={<EMagazine />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path='/about' element={<About />} />
        <Route path='/gallery' element={<Gallery />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/help' element={<Help />} />
        <Route path='/register' element={<Register />} />
        <Route path='/login' element={<Login />} />
        <Route path='/2fa/setup' element={<TwoFASetup />} />
        <Route path='/2fa/verify' element={<TwoFAVerify />} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/subscriptions' element={<Subscriptions />} />
      </Routes>
    </main>
    <Footer />
  </BrowserRouter>
)