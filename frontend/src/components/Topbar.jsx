import React, { useState, useRef, useEffect } from 'react'
import { getNotifications, getNotificationCounts, markNotificationRead, markAllNotificationsRead } from '../api/client.js'

const themeOptions = [
  { value: 'dark',   label: 'Dark Mode',    icon: 'ti-moon-stars' },
  { value: 'light',  label: 'Light Mode',   icon: 'ti-sun' },
  { value: 'black',  label: 'Black Mode',   icon: 'ti-circle-filled' },
  { value: 'system', label: 'System',       icon: 'ti-device-desktop' },
]

const pageSubtitles = {
  Dashboard:    'Overview',
  'AI Studio':  'Creative workspace',
  Campaigns:    'Campaign manager',
  Analytics:    'Brand performance',
  'Data Vault': 'Document storage',
  Reports:      'Generated reports',
  Settings:     'Configuration',
  Users:        'Team management',
  Search:       'Search results',
  Brand:        'Brand details',
}

export default function Topbar({
  activePage,
  activeBrand,
  onAskAI,
  onSearch,
  onThemeChange,
  theme,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [themeOpen, setThemeOpen] = useState(false)
  const themeRef = useRef(null)
  const subtitle = pageSubtitles[activePage] || 'Brand intelligence'
  const currentTheme = themeOptions.find((t) => t.value === theme) || themeOptions[0]

  // --- Notifications ---
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const notifRef = useRef(null)

  const refreshUnreadCount = () => {
    getNotificationCounts()
      .then((data) => setUnreadCount(data.unread || 0))
      .catch(() => {}) // silent — badge just won't update this cycle
  }

  useEffect(() => {
    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  const openNotifications = () => {
    const next = !notifOpen
    setNotifOpen(next)
    if (next) {
      setNotifLoading(true)
      getNotifications()
        .then((data) => setNotifications(data.notifications || []))
        .catch(() => setNotifications([]))
        .finally(() => setNotifLoading(false))
    }
  }

  const handleNotifClick = async (notif) => {
    if (!notif.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: 1 } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
      try {
        await markNotificationRead(notif.id)
      } catch {
        /* best-effort — UI already updated optimistically */
      }
    }
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch {
      /* best-effort */
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setThemeOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSearch && searchTerm.trim()) onSearch(searchTerm)
  }

  const handleThemeSelect = (value) => {
    onThemeChange?.(value)
    setThemeOpen(false)
  }

  return (
    <div className="topbar">
      {/* Page title */}
      <div className="topbar-title">
        {activePage}
        <span className="topbar-sub">{subtitle}</span>
      </div>

      {/* Search */}
      <form className="search-form" onSubmit={handleSubmit}>
        <i className="ti ti-search" />
        <input
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search across all brands..."
          id="topbar-search"
        />
      </form>

      {/* Active Brand badge */}
      <div className="topbar-brand-meta">
        <span
          className="badge badge-brand"
          style={{ fontSize: 12, padding: '5px 12px', gap: 6 }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--brand)',
              display: 'inline-block',
              boxShadow: '0 0 5px var(--brand)',
            }}
          />
          {activeBrand}
        </span>
      </div>

      {/* Theme Switcher */}
      <div className="theme-dropdown" ref={themeRef}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setThemeOpen((o) => !o)}
          title="Switch Theme"
          style={{ width: 34, height: 34, fontSize: 16 }}
        >
          <i className={`ti ${currentTheme.icon}`} />
        </button>
        {themeOpen && (
          <div className="theme-dropdown-menu">
            <div
              style={{
                padding: '10px 14px 8px',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderBottom: '1px solid var(--border)',
              }}
            >
              Appearance
            </div>
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`theme-option ${theme === opt.value ? 'active' : ''}`}
                onClick={() => handleThemeSelect(opt.value)}
              >
                <i className={`ti ${opt.icon}`} style={{ fontSize: 15 }} />
                {opt.label}
                {theme === opt.value && (
                  <i className="ti ti-check" style={{ marginLeft: 'auto', fontSize: 13 }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ask AI Button */}
      <button className="topbar-btn" type="button" onClick={onAskAI}>
        <i className="ti ti-sparkles" /> Ask AI
      </button>

      {/* Notifications */}
      <div className="theme-dropdown" ref={notifRef}>
        <button
          type="button"
          className="notif-btn"
          onClick={openNotifications}
          title="Notifications"
        >
          <i className="ti ti-bell" />
          {unreadCount > 0 && <div className="notif-dot" />}
        </button>
        {notifOpen && (
          <div className="theme-dropdown-menu" style={{ width: 320, right: 0, left: 'auto' }}>
            <div
              style={{
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {notifLoading ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                  <i className="ti ti-bell-off" style={{ fontSize: 20, display: 'block', marginBottom: 6 }} />
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotifClick(n)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                      background: n.read ? 'transparent' : 'var(--brand-glow)',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      color: 'var(--text)',
                    }}
                  >
                    <span
                      style={{
                        width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                        background: n.read ? 'transparent' : 'var(--brand)',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
