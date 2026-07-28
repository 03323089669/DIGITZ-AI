import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getUploadSummary } from '../api/client.js'
import logo from '../assets/digitz.svg'

const quickActions = [
  { icon: 'ti-sparkles', label: 'Generate Campaign Copy', detail: 'AI Studio → Creative mode', to: '/studio?mode=Creative' },
  { icon: 'ti-cloud-upload', label: 'Upload Brand Files', detail: 'Data Vault → active brand', to: '/vault' },
  { icon: 'ti-file-analytics', label: 'Generate Report', detail: 'Reports → AI-powered', to: '/reports' },
  { icon: 'ti-speakerphone', label: 'New Campaign', detail: 'Campaigns → Start brief', to: '/campaigns' },
]

export default function Dashboard({ selectedBrand, summary: externalSummary = {}, onEditBrand, onDeleteBrand }) {
  const [summary, setSummary] = useState({
    total_docs: 0,
    total_queries: 0,
    total_active_brands: 0,
    total_reports: 0,
    total_campaigns: 0,
    total_users: 0,
    active_users: 0,
    api_usage: 0,
    brands: [],
    query_history: [],
    ...externalSummary,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    setSummary((current) => ({ ...current, ...externalSummary }))
  }, [externalSummary])

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true)
      try {
        const data = await getUploadSummary()
        setSummary((current) => ({ ...current, ...data }))
      } catch (error) {
        console.error('Failed to load dashboard summary', error)
      } finally {
        setLoading(false)
      }
    }
    loadSummary()
  }, [])

  const brandRows = useMemo(() => {
    const rows = (summary.brands || [])
      .map((brand) => ({
        ...brand,
        last_upload: brand.last_upload || null,
        status: brand.status || (brand.docs > 0 ? 'active' : 'idle'),
      }))
      .sort((a, b) => (b.docs || 0) - (a.docs || 0))

    if (!search.trim()) return rows

    const query = search.trim().toLowerCase()
    return rows.filter((brand) => brand.name.toLowerCase().includes(query) || (brand.key || '').toLowerCase().includes(query))
  }, [summary.brands, search])

  const recentQueries = summary.query_history || []

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#121214] border border-white/[0.06] rounded-xl p-5 animate-pulse h-[110px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#121214] border border-white/[0.06] rounded-xl p-6 h-[300px] animate-pulse" />
          <div className="bg-[#121214] border border-white/[0.06] rounded-xl p-6 h-[300px] animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page space-y-6">
      <motion.div
        className="dashboard-hero card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <img
            src={logo}
            alt="Digitz AI logo"
            style={{ width: 106, height: 76, borderRadius: 18, background: '#120825', padding: '10px' }}
          />
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
              Digitz AI Dashboard
            </div>
            <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: '0.95rem' }}>
              Enterprise-grade brand intelligence with real-time AI insights.
            </div>
          </div>
        </div>
      </motion.div>
      {/* 8 Metric Cards Grid */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value text-white">{summary.total_users || 0}</div>
          <div className="stat-change" style={{ color: 'var(--muted)' }}>
            <i className="ti ti-users" /> Accounts registered
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Users</div>
          <div className="stat-value text-[#10b981]">{summary.active_users || 0}</div>
          <div className="stat-change text-[#10b981]/80">
            <i className="ti ti-activity" /> Active sessions
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total AI Queries</div>
          <div className="stat-value text-[#7c3aed]">{summary.total_queries || 0}</div>
          <div className="stat-change text-[#7c3aed]/80">
            <i className="ti ti-message" /> Prompts run
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">API Usage</div>
          <div className="stat-value text-[#3b82f6]">{summary.api_usage || 0}</div>
          <div className="stat-change text-[#3b82f6]/80">
            <i className="ti ti-server" /> Vectors + calls
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Brands</div>
          <div className="stat-value text-[#f59e0b]">{summary.total_active_brands || 0}</div>
          <div className="stat-change text-[#f59e0b]/80">
            <i className="ti ti-building" /> Operational spaces
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Documents</div>
          <div className="stat-value text-[#14b8a6]">{summary.total_docs || 0}</div>
          <div className="stat-change text-[#14b8a6]/80">
            <i className="ti ti-database" /> RAG Knowledge Files
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">AI Responses</div>
          <div className="stat-value text-[#ec4899]">{summary.total_queries || 0}</div>
          <div className="stat-change text-[#ec4899]/80">
            <i className="ti ti-sparkles" /> Generated responses
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Brands</div>
          <div className="stat-value text-gray-300" style={{ fontSize: '1.25rem', height: '38px', display: 'flex', alignItems: 'center' }}>
            {summary.brands?.filter((b) => b.status === 'active').length || 0}
          </div>
          <div className="stat-change" style={{ color: 'var(--muted)' }}>
            <i className="ti ti-building" /> Operational
          </div>
        </div>
      </motion.div>

      {/* Main content grid */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="card lg:col-span-2">
          <div className="section-hd">
            <h2>Brand Activity</h2>
            <span className="muted small">Live metrics from the database</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands by name or key..."
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="topbar-btn cursor-pointer" type="button" onClick={() => navigate(`/brand/${selectedBrand?.key || ''}`)}>
              View Active Brand
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>AI Queries</th>
                  <th>Documents</th>
                  <th>Files</th>
                  <th>Status</th>
                  <th>Last Upload</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brandRows.length > 0 ? (
                  brandRows.map((brand) => (
                    <tr key={brand.key || brand.name}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="brand-dot flex-shrink-0" style={{ background: brand.color || 'var(--faint)' }} />
                          <span className="fw-500 font-semibold text-white">{brand.name}</span>
                        </div>
                      </td>
                      <td>{brand.queries}</td>
                      <td>{brand.docs}</td>
                      <td>{brand.files}</td>
                      <td>
                        <span className="badge font-medium" style={{ background: brand.status === 'active' ? 'var(--teal-bg)' : 'var(--bg3)', color: brand.status === 'active' ? 'var(--teal)' : 'var(--muted)' }}>
                          {brand.status}
                        </span>
                      </td>
                      <td>{brand.last_upload ? new Date(brand.last_upload).toLocaleDateString() : '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button className="stat-action cursor-pointer font-medium hover:text-[#7c3aed]" type="button" onClick={() => navigate(`/brand/${brand.key}`)}>
                            View
                          </button>
                          <button className="stat-action cursor-pointer font-medium hover:text-[#7c3aed]" type="button" onClick={() => onEditBrand?.(brand)}>
                            Edit
                          </button>
                          <button className="stat-action cursor-pointer font-medium hover:text-red-500" type="button" onClick={() => onDeleteBrand?.(brand.key)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }} className="py-8">
                      No brands available yet. Add a brand to begin tracking activity.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="section-hd">
            <h2>Quick Actions</h2>
          </div>
          <div className="space-y-2.5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="file-row w-full cursor-pointer hover:bg-white/[0.02]"
                onClick={() => navigate(action.to)}
                style={{ justifyContent: 'space-between' }}
              >
                <div className="file-icon flex-shrink-0" style={{ background: 'var(--brand-glow)', color: 'var(--brand)' }}>
                  <i className={`ti ${action.icon}`} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }} className="ml-3 min-w-0">
                  <div className="file-name truncate text-sm font-medium text-white">{action.label}</div>
                  <div className="file-meta truncate text-xs text-gray-400">{action.detail}</div>
                </div>
                <i className="ti ti-chevron-right ml-2 text-gray-600" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Recent AI Queries */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="section-hd">
          <h2>Recent AI Queries</h2>
          <span className="view-all cursor-pointer hover:text-white" onClick={() => navigate('/studio')}>View Studio <i className="ti ti-chevron-right" /></span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Query</th>
                <th>Brand</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentQueries.length > 0 ? (
                recentQueries.map((item, index) => (
                  <tr key={`${item.query}-${index}`}>
                    <td className="fw-500 font-semibold text-white max-w-[300px] truncate">{item.query}</td>
                    <td>
                      <span className="badge font-medium uppercase text-xs" style={{ background: 'var(--brand-glow)', color: 'var(--brand)' }}>
                        {item.brand}
                      </span>
                    </td>
                    <td>{item.mode || 'N/A'}</td>
                    <td>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}</td>
                    <td>
                      <span className="badge font-medium text-xs bg-teal-500/10 text-[#14b8a6]">
                        {item.status || 'Done'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }} className="py-8">
                    No recent AI queries yet. Ask the AI in AI Studio to populate this list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}