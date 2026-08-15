import { useState } from 'react'
import './App.css'
import heroImg from './assets/hero.png'

import { AuthProvider, useAuth } from './components/AuthProvider'
import AuthPage from './components/AuthPage'
import TestList from './components/TestList'
import AdminImport from './components/AdminImport'
import TestTaker from './components/TestTaker'
import TestResults from './components/TestResults'

// ─────────────────────────────────────────
// Decorative Components
// ─────────────────────────────────────────

function Sunshine() {
  return <div className="sunshine" />
}

function Clouds() {
  return (
    <div className="clouds">
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />
      <div className="cloud cloud-4" />
      <div className="cloud cloud-5" />
    </div>
  )
}

function Grass() {
  const blades = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    height: 30 + Math.random() * 40,
    delay: Math.random() * 2
  }))

  return (
    <div className="grass-footer">
      {blades.map(b => (
        <div
          key={b.id}
          className="grass-blade"
          style={{
            left: `${b.left}%`,
            height: `${b.height}px`,
            animationDelay: `${b.delay}s`
          }}
        />
      ))}
    </div>
  )
}

function Flowers() {
  const flowers = [
    { left: '5%', emoji: '🌸', delay: 0 },
    { left: '15%', emoji: '🌼', delay: 0.5 },
    { left: '25%', emoji: '🌷', delay: 1.2 },
    { left: '35%', emoji: '🌻', delay: 0.8 },
    { left: '55%', emoji: '🌸', delay: 1.5 },
    { left: '65%', emoji: '🌼', delay: 0.3 },
    { left: '75%', emoji: '🌷', delay: 1.0 },
    { left: '85%', emoji: '🌻', delay: 0.7 },
    { left: '95%', emoji: '🌸', delay: 1.3 }
  ]

  return (
    <div className="flowers">
      {flowers.map((f, i) => (
        <div
          key={i}
          className="flower"
          style={{ left: f.left, animationDelay: `${f.delay}s` }}
        >
          {f.emoji}
        </div>
      ))}
    </div>
  )
}

function Particles() {
  const colors = ['#3B9AE8', '#4CAF50', '#FFD93D', '#FF6B9D', '#FF9800', '#81C784']
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 3 + Math.random() * 5,
    size: 3 + Math.random() * 8,
    color: colors[i % colors.length]
  }))

  return (
    <div className="particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────
// Landing Page
// ─────────────────────────────────────────

function LandingPage({ onStart, onGoAdmin }) {
  return (
    <div className="landing-page">
      <Sunshine />
      <Clouds />
      <Grass />
      <Flowers />
      <Particles />

      <div className="landing-content">
        <div className="kangaroo-hero">
          <img src={heroImg} alt="Kangaroo mascot" className="kangaroo-main-img" />
          <div className="kangaroo-shadow" />
        </div>

        <h1 className="landing-title">
          <span className="title-word title-kangaroo">Kangaroo</span>
          <span className="title-word title-cbt">CBT</span>
        </h1>

        <p className="landing-subtitle">
          Master English with Australia's most exciting test platform!
        </p>

        <button className="start-button" onClick={onStart}>
          <span className="start-button-text">Browse Tests</span>
          <span className="start-button-icon">🦘</span>
          <div className="start-button-ripple" />
        </button>

        <button className="admin-link" onClick={onGoAdmin}>
          Admin Panel
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// User Header (shows auth status)
// ─────────────────────────────────────────

function UserHeader() {
  const { user, profile, isAdmin, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="user-header">
      <span className="user-email">{user.email}</span>
      {isAdmin && <span className="user-admin-badge">Admin</span>}
      <button className="user-signout" onClick={signOut}>Sign Out</button>
    </div>
  )
}

// ─────────────────────────────────────────
// Main App (auth-aware)
// ─────────────────────────────────────────

const PAGES = {
  LANDING: "landing",
  AUTH: "auth",
  TEST_LIST: "test_list",
  ADMIN: "admin",
  TAKING: "taking",
  RESULTS: "results"
}

function AppContent() {
  const { user, isAdmin, loading } = useAuth()
  const [page, setPage] = useState(PAGES.LANDING)
  const [activeTest, setActiveTest] = useState(null)
  const [lastAnswers, setLastAnswers] = useState(null)

  if (loading) {
    return (
      <div className="app">
        <Sunshine />
        <Clouds />
        <div className="loading-screen">
          <img src={heroImg} alt="" className="kangaroo-main-img" style={{ width: 120, height: 120 }} />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const handleStart = () => {
    if (!user) {
      setPage(PAGES.AUTH)
    } else {
      setPage(PAGES.TEST_LIST)
    }
  }

  const handleGoAdmin = () => {
    if (!user) {
      setPage(PAGES.AUTH)
    } else if (!isAdmin) {
      alert("Admin access required.")
    } else {
      setPage(PAGES.ADMIN)
    }
  }

  const handleAuthSuccess = () => {
    setPage(PAGES.TEST_LIST)
  }

  const handleSelectTest = (testBlob) => {
    setActiveTest(testBlob)
    setPage(PAGES.TAKING)
  }

  const handleCompleteTest = (answers) => {
    setLastAnswers(answers)
    setPage(PAGES.RESULTS)
  }

  const handleRetake = () => {
    setLastAnswers(null)
    setPage(PAGES.TAKING)
  }

  const handleBackToTests = () => {
    setActiveTest(null)
    setPage(PAGES.TEST_LIST)
  }

  const handleHome = () => {
    setActiveTest(null)
    setLastAnswers(null)
    setPage(PAGES.LANDING)
  }

  const handleImportComplete = () => {
    setPage(PAGES.TEST_LIST)
  }

  return (
    <div className="app">
      {page === PAGES.LANDING && (
        <LandingPage onStart={handleStart} onGoAdmin={handleGoAdmin} />
      )}

      {page === PAGES.AUTH && (
        <AuthPage onBack={handleHome} />
      )}

      {page === PAGES.TEST_LIST && (
        <>
          <Sunshine />
          <Clouds />
          <Grass />
          <Flowers />
          <UserHeader />
          <div className="page-container">
            <TestList onSelectTest={handleSelectTest} onGoAdmin={handleGoAdmin} />
            <div className="page-footer">
              <button className="admin-btn admin-btn-ghost" onClick={handleHome}>
                Home
              </button>
              {isAdmin && (
                <button className="admin-btn admin-btn-ghost" onClick={handleGoAdmin}>
                  Admin
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {page === PAGES.ADMIN && isAdmin && (
        <>
          <Sunshine />
          <Clouds />
          <Grass />
          <Flowers />
          <UserHeader />
          <div className="page-container">
            <AdminImport onImportComplete={handleImportComplete} onBack={handleHome} />
          </div>
        </>
      )}

      {page === PAGES.TAKING && activeTest && (
        <TestTaker
          testData={activeTest}
          onComplete={handleCompleteTest}
          onBack={handleBackToTests}
        />
      )}

      {page === PAGES.RESULTS && activeTest && lastAnswers && (
        <TestResults
          testData={activeTest}
          answers={lastAnswers}
          onHome={handleHome}
          onRetake={handleRetake}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// Root App (with AuthProvider)
// ─────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
