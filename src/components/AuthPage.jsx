import { useState } from 'react'
import { useAuth } from './AuthProvider'

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
      <GlowOrbs />
      <FloatingKangaroos />

      <div className="auth-card">
        <div className="auth-kangaroo">🦘</div>
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

// Minimal imports for decorative components used in auth page
function GlowOrbs() {
  return (
    <div className="glow-orbs">
      <div className="glow-orb orb-1" />
      <div className="glow-orb orb-2" />
      <div className="glow-orb orb-3" />
      <div className="glow-orb orb-4" />
    </div>
  )
}

function FloatingKangaroos() {
  const kangaroos = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 20,
    duration: 15 + Math.random() * 20,
    size: 20 + Math.random() * 30,
    opacity: 0.03 + Math.random() * 0.06
  }))

  return (
    <div className="floating-kangaroos">
      {kangaroos.map(k => (
        <div
          key={k.id}
          className="floating-kangaroo"
          style={{
            left: `${k.left}%`,
            animationDelay: `${k.delay}s`,
            animationDuration: `${k.duration}s`,
            fontSize: `${k.size}px`,
            opacity: k.opacity
          }}
        >
          🦘
        </div>
      ))}
    </div>
  )
}
