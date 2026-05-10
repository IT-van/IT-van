import { useState } from 'react'
import { register, login } from '../../lib/auth'
import useStore from '../../store'

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setCurrentUser = useStore((s) => s.setCurrentUser)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = mode === 'login'
        ? await login(username.trim(), password)
        : await register(username.trim(), password)

      setCurrentUser(user)
      onAuthenticated(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" stroke="url(#grad)" strokeWidth="2" />
              <path d="M12 20 L20 12 L28 20 L20 28 Z" fill="url(#grad)" opacity="0.8" />
              <circle cx="20" cy="20" r="4" fill="white" />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>Nexus Chat</h1>
          <p>Anonymous • Encrypted • Free</p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError('') }}
          >
            Sign In
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError('') }}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              autoComplete="username"
              minLength={2}
              maxLength={32}
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={4}
              required
            />
          </div>

          {error && (
            <div className="auth-error">
              <span>⚠</span> {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : mode === 'login' ? 'Enter Nexus' : 'Create Account'}
          </button>
        </form>

        <p className="auth-note">
          No email. No phone. Just a username and password.
        </p>
      </div>
    </div>
  )
}
