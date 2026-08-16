import { useState } from 'react'
import { useAuth } from './AuthProvider'
import heroImg from '../assets/hero.png'

/**
 * AuthPage — Login/Signup form
 */
export default function AuthPage({ onBack }) {
  const { signUp, signIn } = useAuth()
  const [mode, setMode] = useState("signin") // "signin" | "signup"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "signup") {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message || "An error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Sunshine />
      <Clouds />
      <Flowers />

      <div className="auth-card">
        <img src={heroImg} alt="Kangaroo" className="auth-kangaroo-img" />
        <h2 className="auth-title">
          {mode === "signin" ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="auth-subtitle">
          {mode === "signin"
            ? "Sign in to access your tests"
            : "Sign up to start learning"}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "..." : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "signin" ? (
            <p>Don't have an account? <button onClick={() => { setMode("signup"); setError("") }}>Sign Up</button></p>
          ) : (
            <p>Already have an account? <button onClick={() => { setMode("signin"); setError("") }}>Sign In</button></p>
          )}
        </div>

        {onBack && (
          <button className="auth-back" onClick={onBack}>
            ← Back to home
          </button>
        )}
      </div>
    </div>
  )
}

function Sunshine() {
  return <div className="sunshine" />
}

function Clouds() {
  return (
    <div className="clouds">
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />
    </div>
  )
}

function Flowers() {
  const flowers = [
    { left: '10%', emoji: '🌸', delay: 0 },
    { left: '30%', emoji: '🌼', delay: 0.5 },
    { left: '50%', emoji: '🌷', delay: 1.2 },
    { left: '70%', emoji: '🌻', delay: 0.8 },
    { left: '90%', emoji: '🌸', delay: 1.5 }
  ]
  return (
    <div className="flowers">
      {flowers.map((f, i) => (
        <div key={i} className="flower" style={{ left: f.left, animationDelay: `${f.delay}s` }}>
          {f.emoji}
        </div>
      ))}
    </div>
  )
}
