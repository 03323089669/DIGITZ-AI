import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  getChatSessions,
  renameChatSession,
  setChatSessionFlags,
  deleteChatSession,
} from '../api/client.js'

const navItems = [
  { label: 'Dashboard', icon: 'ti-layout-dashboard', to: '/' },
  { label: 'Knowledge Base', icon: 'ti-books', to: '/vault' },
  { label: 'Query Logs', icon: 'ti-list-search', to: '/queries' },
  { label: 'Vector DB', icon: 'ti-database', to: '/vector-db' },
  { label: 'Campaigns', icon: 'ti-speakerphone', to: '/campaigns' },
  { label: 'Analytics', icon: 'ti-chart-bar', to: '/analytics' },
  { label: 'Reports', icon: 'ti-report-analytics', to: '/reports' },
]

const systemItems = [
  { label: 'Settings', icon: 'ti-settings', to: '/settings' },
  { label: 'Users', icon: 'ti-users', to: '/users' },
]

// Mirrors backend/routers/conversations_api.py `_group_key` bucketing so the
// sidebar groups line up with what the API would return.
function groupKeyFor(createdAtIso) {
  if (!createdAtIso) return 'Older'
  const dt = new Date(createdAtIso)
  if (Number.isNaN(dt.getTime())) return 'Older'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(todayStart.getDate() - 1)
  const last7Start = new Date(todayStart)
  last7Start.setDate(todayStart.getDate() - 7)
  const last30Start = new Date(todayStart)
  last30Start.setDate(todayStart.getDate() - 30)

  if (dt >= todayStart) return 'Today'
  if (dt >= yesterdayStart && dt < todayStart) return 'Yesterday'
  if (dt >= last7Start && dt < yesterdayStart) return 'Last Week'
  if (dt >= last30Start && dt < last7Start) return 'Last Month'
  return 'Older'
}

const GROUP_ORDER = ['Pinned', 'Today', 'Yesterday', 'Last Week', 'Last Month', 'Older']

function RecentChatItem({ session, isActive, onOpen, onRename, onTogglePin, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(session.title || '')
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const commitRename = () => {
    setEditing(false)
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== session.title) onRename(session.id, trimmed)
  }

  return (
    <div
      className={`recent-item ${isActive ? 'active' : ''}`}
      style={{
        borderRadius: 8,
        position: 'relative',
        background: isActive ? 'var(--brand-glow)' : 'transparent',
        border: isActive ? '1px solid var(--brand-ring)' : '1px solid transparent',
      }}
    >
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px' }}>
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setEditing(false); setDraftTitle(session.title || '') }
            }}
            onBlur={commitRename}
            style={{
              flex: 1, fontSize: 12.5, background: 'var(--bg3)', color: 'var(--text)',
              border: '1px solid var(--brand-ring)', borderRadius: 6, padding: '5px 8px', outline: 'none',
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(session.id)}
          title={session.title || session.id}
          style={{
            width: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 6px 8px 10px',
          }}
        >
          {session.is_pinned ? (
            <i className="ti ti-pin-filled" style={{ color: 'var(--brand)', fontSize: 13, flexShrink: 0 }} />
          ) : (
            <i className="ti ti-message-question" style={{ color: 'var(--muted)', fontSize: 13, flexShrink: 0 }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, flex: 1, color: 'var(--text)' }}>
            {session.title || 'Untitled Chat'}
          </span>
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            className="recent-item-menu-btn"
            style={{ padding: '3px 4px', borderRadius: 4, opacity: 0.55, flexShrink: 0 }}
          >
            <i className="ti ti-dots-vertical" style={{ fontSize: 13 }} />
          </span>
        </button>
      )}

      {menuOpen && (
        <div
          ref={menuRef}
          className="card-sm recent-item-menu"
          style={{
            position: 'absolute', right: 4, top: '100%', zIndex: 40, minWidth: 150,
            padding: 4, display: 'flex', flexDirection: 'column', gap: 1,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <button type="button" className="recent-menu-action" onClick={() => { setMenuOpen(false); setEditing(true) }}>
            <i className="ti ti-pencil" /> Rename
          </button>
          <button type="button" className="recent-menu-action" onClick={() => { setMenuOpen(false); onTogglePin(session) }}>
            <i className={session.is_pinned ? 'ti ti-pinned-off' : 'ti ti-pin'} /> {session.is_pinned ? 'Unpin' : 'Pin'}
          </button>
          <button type="button" className="recent-menu-action danger" onClick={() => { setMenuOpen(false); onDelete(session.id) }}>
            <i className="ti ti-trash" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function Sidebar({
  activeBrand,
  brands,
  onBrandChange,
  onCreateBrand,
  onEditBrand,
  onDeleteBrand,
  user,
  onLogout,
}) {
  const navigate = useNavigate()
  const { session_id: activeSessionId } = useParams()

  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState('')
  const [chatSearch, setChatSearch] = useState('')

  const loadSessions = useCallback(async () => {
    const token = localStorage.getItem('digitz-token')
    if (!token) {
      setSessions([])
      setSessionsError('')
      return
    }
    setSessionsLoading(true)
    setSessionsError('')
    try {
      const data = await getChatSessions(activeBrand || null)
      setSessions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Recent sessions load failed:', e)
      setSessionsError(e?.message || 'Unable to load recent chats')
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [activeBrand])

  useEffect(() => {
    loadSessions()
  }, [loadSessions, user?.email])

  // Live refresh: when a message is sent elsewhere in the app it broadcasts
  // this event so the sidebar list + titles stay current without a full page poll.
  useEffect(() => {
    const handler = () => loadSessions()
    window.addEventListener('digitz:chat-updated', handler)
    return () => window.removeEventListener('digitz:chat-updated', handler)
  }, [loadSessions])

  const filteredSessions = useMemo(() => {
    const list = sessions.filter((s) => !s.is_archived)
    if (!chatSearch.trim()) return list
    const q = chatSearch.trim().toLowerCase()
    return list.filter((s) => (s.title || '').toLowerCase().includes(q))
  }, [sessions, chatSearch])

  const grouped = useMemo(() => {
    const buckets = {}
    for (const s of filteredSessions) {
      const key = s.is_pinned ? 'Pinned' : groupKeyFor(s.created_at)
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(s)
    }
    return buckets
  }, [filteredSessions])

  const handleOpen = (id) => navigate(`/chat/${id}`)

  const handleRename = async (id, title) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
    try {
      await renameChatSession(id, title)
    } catch (e) {
      console.error('Rename failed', e)
      loadSessions()
    }
  }

  const handleTogglePin = async (session) => {
    const nextPinned = !session.is_pinned
    setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, is_pinned: nextPinned } : s)))
    try {
      await setChatSessionFlags(session.id, { isPinned: nextPinned })
    } catch (e) {
      console.error('Pin toggle failed', e)
      loadSessions()
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this chat permanently?')) return
    setSessions((prev) => prev.filter((s) => s.id !== id))
    try {
      await deleteChatSession(id)
      if (activeSessionId === id) navigate('/studio')
    } catch (e) {
      console.error('Delete failed', e)
      loadSessions()
    }
  }

  const userInitial = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AD'
  const userName = user?.email ? user.email.split('@')[0] : 'Administrator'
  const userEmail = user?.email || 'admin@digitz.co'

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* 1. Header Section */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.05))', flexShrink: 0 }}>
        <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-brain" />
        </div>
        <div>
          <div className="logo-text" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text, #fff)' }}>Digitz AI</div>
          <div className="logo-sub" style={{ fontSize: '11px', opacity: 0.5 }}>Brand Intelligence</div>
        </div>
      </div>

      {/* New chat button */}
      <div style={{ padding: '12px 14px 4px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => navigate('/studio')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: 'var(--brand)', color: '#fff', border: 'none',
          }}
        >
          <i className="ti ti-plus" /> New Chat
        </button>
      </div>

      {/* 2. Scrollable Body Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Main Menu Sub-stack */}
        <div>
          <div className="sidebar-section" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.4, padding: '0px 6px 6px' }}>
            Main Menu
          </div>
          <nav className="nav-list" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px' }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: '16px' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge ? <span className="nav-badge" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>{item.badge}</span> : null}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Brands Section Sub-stack */}
        <div>
          <div
            className="sidebar-section"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0px 6px 6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.4 }}
          >
            <span>Brands</span>
            <span className="badge badge-muted" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}>
              {brands?.length || 0}
            </span>
          </div>

          <div className="sidebar-brands" style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '140px', overflowY: 'auto', paddingRight: '2px' }}>
            {brands && brands.map((brand) => (
              <div
                key={brand.key}
                className={`brand-pill ${activeBrand === brand.key ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '6px',
                  padding: '2px 8px'
                }}
              >
                <button
                  type="button"
                  className="brand-link"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 0',
                    minWidth: 0
                  }}
                  onClick={() => {
                    onBrandChange(brand.key)
                    navigate(`/brand/${brand.key}`)
                  }}
                >
                  <span className="brand-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: brand.color || 'var(--brand)', flexShrink: 0 }} />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      textAlign: 'left',
                      fontSize: '13px',
                      color: activeBrand === brand.key ? 'var(--text, #fff)' : 'var(--text-muted, rgba(255,255,255,0.7))'
                    }}
                  >
                    {brand.name}
                  </span>
                  <span className="brand-count" style={{ fontSize: '11px', opacity: 0.5, paddingRight: '4px' }}>{brand.docs ?? 0}</span>
                </button>

                <div className="brand-actions" style={{ display: 'flex', gap: '2px' }}>
                  <button
                    type="button"
                    className="brand-action"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                    onClick={() => onEditBrand?.(brand)}
                    title="Edit brand"
                  >
                    <i className="ti ti-pencil" style={{ fontSize: '13px' }} />
                  </button>
                  <button
                    type="button"
                    className="brand-delete"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                    onClick={() => onDeleteBrand?.(brand.key)}
                    title="Delete brand"
                  >
                    <i className="ti ti-trash" style={{ fontSize: '13px' }} />
                  </button>
                </div>
              </div>
            ))}

            {(!brands || brands.length === 0) && (
              <div style={{ padding: '10px 12px', fontSize: '12px', opacity: 0.4, textAlign: 'center', fontStyle: 'italic' }}>
                No brands available
              </div>
            )}
          </div>

          <div style={{ padding: '8px 0 0' }}>
            <button
              type="button"
              className="topbar-btn"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12.5px' }}
              onClick={onCreateBrand}
            >
              <i className="ti ti-plus" /> Add Brand
            </button>
          </div>
        </div>

        {/* Recent Chats Sub-stack: grouped Today / Yesterday / Last Week / Last Month */}
        <div>
          <div className="sidebar-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.4, padding: '0px 6px 6px' }}>
            <span>Recent Chats</span>
          </div>

          <div style={{ padding: '0 2px 8px' }}>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, opacity: 0.4 }} />
              <input
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search chats..."
                style={{
                  width: '100%', fontSize: 12, padding: '7px 8px 7px 26px', borderRadius: 7,
                  border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', outline: 'none',
                }}
              />
            </div>
          </div>

          <div className="sidebar-recent-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto', paddingRight: '2px' }}>
            {sessionsLoading && <div style={{ padding: '8px 12px', fontSize: '12px', opacity: 0.5 }}>Loading...</div>}
            {!sessionsLoading && sessionsError && (
              <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--red)' }}>{sessionsError}</div>
            )}
            {!sessionsLoading && !sessionsError && filteredSessions.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: '12px', opacity: 0.4, fontStyle: 'italic' }}>
                {chatSearch ? 'No chats match your search' : 'No saved chats yet'}
              </div>
            )}

            {!sessionsLoading && !sessionsError && GROUP_ORDER.map((groupName) => {
              const items = grouped[groupName]
              if (!items || items.length === 0) return null
              return (
                <div key={groupName}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.35, padding: '2px 8px 4px' }}>
                    {groupName}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {items.map((s) => (
                      <RecentChatItem
                        key={s.id}
                        session={s}
                        isActive={activeSessionId === s.id}
                        onOpen={handleOpen}
                        onRename={handleRename}
                        onTogglePin={handleTogglePin}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* System Sub-stack */}
        <div>
          <div className="sidebar-section" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.4, padding: '0px 6px 6px' }}>
            System
          </div>
          <nav className="nav-list" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {systemItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px' }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: '16px' }} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

      </div>

      {/* 3. Static Footer Section (Never gets pushed off-screen) */}
      <div className="sidebar-bottom" style={{ padding: '14px 16px', borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.05))', background: 'rgba(0, 0, 0, 0.1)', flexShrink: 0 }}>
        <div className="user-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, background: 'var(--brand, #7b6ef6)', color: '#fff' }}>
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name" style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text, #fff)' }}>{userName}</div>
            <div className="user-role" style={{ fontSize: '11px', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="icon-btn"
            title="Log Out"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--text)', opacity: 0.7 }}
          >
            <i className="ti ti-logout" style={{ fontSize: '16px' }} />
          </button>
        </div>
      </div>
    </aside>
  )
}
