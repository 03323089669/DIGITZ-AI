import React, { useState } from 'react'
import { login } from '../api/client.js'
import logo from '../assets/digitz.svg'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess()
      }
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#09090b',
      padding: '1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#111113',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '2.25rem 2rem 2rem',
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 18px', borderRadius: '20px',
            background: 'rgba(124,58,237,0.12)',
            boxShadow: '0 20px 60px rgba(124,58,237,0.16)',
          }}>
            <img
              src={logo}
              alt="Digitz AI logo"
              style={{ width: '162px', height: '92px', borderRadius: '16px', background: '#120825', padding: '8px' }}
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                Digitz AI
              </div>
              <div style={{ fontSize: '12px', color: '#c7d2fe', marginTop: '2px' }}>
                Enterprise Brand Intelligence
              </div>
            </div>
          </div>
          <h1 style={{ fontSize: '21px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px', textAlign: 'center', margin: 0 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, textAlign: 'center' }}>
            Sign in to your enterprise dashboard
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '1.5rem' }} />

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: '1rem', padding: '10px 12px',
            borderRadius: '10px', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', fontSize: '12.5px', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '15px', flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-mail" style={{
                position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                color: '#4b5563', fontSize: '15px', pointerEvents: 'none',
              }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('dz-password').focus()}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                required
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 14px 11px 38px',
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '11px', color: '#f3f4f6', fontSize: '14px',
                  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-lock" style={{
                position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                color: '#4b5563', fontSize: '15px', pointerEvents: 'none',
              }} />
              <input
                id="dz-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 40px 11px 38px',
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '11px', color: '#f3f4f6', fontSize: '14px',
                  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6b7280', padding: '2px', display: 'flex', alignItems: 'center',
                }}
              >
                <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} style={{ fontSize: '15px' }} />
              </button>
            </div>
          </div>

          {/* Forgot */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
            <button type="button" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12.5px', color: '#7c3aed', padding: 0, fontFamily: 'inherit',
            }}>
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? '#5b21b6' : '#7c3aed',
              border: 'none', borderRadius: '11px',
              color: '#fff', fontSize: '14.5px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.15s, transform 0.1s',
              boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              marginTop: '4px', fontFamily: 'inherit',
              opacity: loading ? 0.75 : 1,
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = '#6d28d9' }}
            onMouseLeave={e => { if (!loading) e.target.style.background = '#7c3aed' }}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.99)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.25)',
                  borderTopColor: '#fff',
                  animation: 'dz-spin 0.65s linear infinite',
                }} />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <i className="ti ti-arrow-right" style={{ fontSize: '15px' }} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '11.5px', color: '#374151' }}>
          Digitz AI Platform · Enterprise Edition
        </p>
      </div>

      <style>{`
        @keyframes dz-spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #374151 !important; }
      `}</style>
    </div>
  )
}