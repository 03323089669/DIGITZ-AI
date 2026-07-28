import React, { useEffect, useState } from 'react'
import { getUsers, inviteUser, setUserStatus, editUser } from '../api/client.js'

const ROLE_COLORS = {
  admin: 'badge-brand',
  manager: 'badge-teal',
  analyst: 'badge-blue',
  viewer: 'badge-muted',
}

const STATUS_COLORS = {
  active: 'badge-teal',
  inactive: 'badge-muted',
  invited: 'badge-amber',
  suspended: 'badge-red',
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteResult, setInviteResult] = useState(null) // { email, temp_password }

  const [editingUser, setEditingUser] = useState(null) // user object being edited
  const [editRole, setEditRole] = useState('viewer')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [pendingActionId, setPendingActionId] = useState(null)

  const loadUsers = () => {
    setLoading(true)
    setError(null)
    getUsers()
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load users. Is the backend running?'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filtered = users.filter((u) => {
    const matchSearch =
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    admins: users.filter((u) => u.role === 'admin').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteSubmitting(true)
    setActionError(null)
    try {
      const res = await inviteUser({ email: inviteEmail.trim(), role: inviteRole })
      setInviteResult({ email: inviteEmail.trim(), temp_password: res.temp_password })
      loadUsers()
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Could not invite user')
    } finally {
      setInviteSubmitting(false)
    }
  }

  const closeInviteModal = () => {
    setInviteOpen(false)
    setInviteResult(null)
    setInviteEmail('')
    setInviteRole('viewer')
    setActionError(null)
  }

  const toggleStatus = async (user) => {
    setPendingActionId(user.id)
    setActionError(null)
    const nextStatus = user.status === 'active' ? 'inactive' : 'active'
    try {
      await setUserStatus(user.id, nextStatus)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)))
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Could not update user status')
    } finally {
      setPendingActionId(null)
    }
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setEditRole(user.role)
    setActionError(null)
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    setEditSubmitting(true)
    setActionError(null)
    try {
      await editUser(editingUser.id, { role: editRole })
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, role: editRole } : u)))
      setEditingUser(null)
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Could not update user')
    } finally {
      setEditSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats row */}
      <div className="grid-4">
        {[
          { label: 'Total Users',   value: stats.total,    icon: 'ti-users',          color: 'var(--brand)',   bg: 'var(--brand-glow)' },
          { label: 'Active',        value: stats.active,   icon: 'ti-user-check',     color: 'var(--teal)',    bg: 'var(--teal-bg)' },
          { label: 'Admin Roles',   value: stats.admins,   icon: 'ti-shield-lock',    color: 'var(--amber)',   bg: 'var(--amber-bg)' },
          { label: 'Inactive',      value: stats.inactive, icon: 'ti-user-off',       color: 'var(--muted)',   bg: 'var(--bg3)' },
        ].map((stat) => (
          <div key={stat.label} className="stat-card card-hover">
            <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
              <i className={`ti ${stat.icon}`} />
            </div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {actionError && (
        <div className="alert alert-error" style={{ padding: '10px 14px' }}>
          <i className="ti ti-alert-triangle" /> {actionError}
        </div>
      )}

      {/* Toolbar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div className="flex-between" style={{ gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flex: 1 }}>
            <div className="search-form" style={{ flex: 1, maxWidth: 340 }}>
              <i className="ti ti-search" />
              <input
                className="search-input"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select-box"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button
            type="button"
            className="topbar-btn"
            onClick={() => setInviteOpen(true)}
          >
            <i className="ti ti-user-plus" /> Invite User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-hd" style={{ marginBottom: 0 }}>
            <h2>Team Members</h2>
            <span className="badge badge-muted">{filtered.length} users</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
              <i className="ti ti-loader-2" style={{ fontSize: 20, display: 'block', marginBottom: 8 }} />
              Loading team members…
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', color: 'var(--red, #e5484d)', padding: '40px 0' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 20, display: 'block', marginBottom: 8 }} />
              {error}
              <div style={{ marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={loadUsers}>Retry</button>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Brands Access</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className="avatar"
                          style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}
                        >
                          {(user.name || user.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{user.name || user.email}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_COLORS[user.role] || 'badge-muted'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[user.status] || 'badge-muted'}`}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'currentColor',
                            display: 'inline-block',
                          }}
                        />
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13 }}>{user.brands_count} brand{user.brands_count !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '5px 10px', fontSize: 11 }}
                          disabled={user.role === 'admin' || pendingActionId === user.id}
                          onClick={() => toggleStatus(user)}
                        >
                          {pendingActionId === user.id
                            ? '…'
                            : user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: '5px 10px', fontSize: 11 }}
                            title="Edit user"
                            onClick={() => openEdit(user)}
                          >
                            <i className="ti ti-pencil" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0' }}>
                      No users found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="modal-overlay" onClick={closeInviteModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'var(--brand-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand)',
                }}
              >
                <i className="ti ti-user-plus" style={{ fontSize: 16 }} />
              </div>
              Invite Team Member
            </div>
            {inviteResult ? (
              <div style={{ padding: '12px 0' }}>
                <div style={{ textAlign: 'center', color: 'var(--teal)', marginBottom: 16 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 40, display: 'block', marginBottom: 10 }} />
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Account created</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{inviteResult.email}</div>
                </div>
                <div className="alert" style={{ fontSize: 12, lineHeight: 1.5, padding: '10px 12px' }}>
                  <i className="ti ti-info-circle" /> Email delivery isn't configured on this backend yet, so
                  no invite email was sent. Share this temporary password with them directly:
                  <div style={{
                    marginTop: 8, padding: '8px 10px', borderRadius: 6,
                    background: 'var(--bg3)', fontFamily: 'monospace', fontSize: 13,
                    userSelect: 'all',
                  }}>
                    {inviteResult.temp_password}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="topbar-btn" onClick={closeInviteModal}>Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} style={{ display: 'grid', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="select-box w-full"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="viewer">Viewer — read-only access</option>
                    <option value="analyst">Analyst — queries & reports</option>
                    <option value="manager">Manager — brand management</option>
                    <option value="admin">Admin — full access</option>
                  </select>
                </div>
                {actionError && (
                  <div className="alert alert-error" style={{ fontSize: 12, padding: '8px 10px' }}>{actionError}</div>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={closeInviteModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="topbar-btn" disabled={inviteSubmitting}>
                    <i className="ti ti-send" /> {inviteSubmitting ? 'Sending…' : 'Send Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <div
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'var(--brand-glow)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--brand)',
                }}
              >
                <i className="ti ti-pencil" style={{ fontSize: 15 }} />
              </div>
              Edit {editingUser.name || editingUser.email}
            </div>
            <form onSubmit={handleEditSave} style={{ display: 'grid', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="select-box w-full"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <option value="viewer">Viewer — read-only access</option>
                  <option value="analyst">Analyst — queries & reports</option>
                  <option value="manager">Manager — brand management</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>
              {actionError && (
                <div className="alert alert-error" style={{ fontSize: 12, padding: '8px 10px' }}>{actionError}</div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="topbar-btn" disabled={editSubmitting}>
                  {editSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
