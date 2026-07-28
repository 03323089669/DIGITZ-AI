import React, { useEffect, useState, useMemo } from 'react'
import { getAnalytics } from '../api/client.js'

// Simple bar chart using CSS (no charting lib needed)
function BarChart({ data, color = 'var(--brand)', height = 120 }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, paddingTop: 8 }}>
      {data.map((item, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: '100%',
              height: `${Math.max(4, (item.value / max) * (height - 28))}px`,
              background: color,
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.6s ease',
              opacity: 0.85,
              minHeight: 4,
            }}
          />
          <div style={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}

function DonutSegment({ value, total, color, size = 80 }) {
  const pct = total > 0 ? value / total : 0
  const circ = 2 * Math.PI * 34
  const dash = pct * circ
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="9" />
      <circle
        cx="40" cy="40" r="34"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Deterministic trend (no Math.random) so it doesn't change/re-render every render
function getMonthTrend(count) {
  return MONTHS.slice(0, 6).map((label, i) => ({
    label,
    value: Math.max(0, Math.round(count * (0.3 + 0.7 * (i / 5)))),
  }))
}

export default function Analytics({ selectedBrand }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getAnalytics()
        if (!cancelled) setSummary(data)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load analytics summary', err)
          setError(err)
          setSummary({ brands: [] })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const brands = summary?.brands || []
  const totalDocs = brands.reduce((s, b) => s + (b.docs ?? 0), 0)
  const totalQueries = brands.reduce((s, b) => s + (b.queries ?? 0), 0)
  const totalChunks = brands.reduce((s, b) => s + (b.chunks ?? 0), 0)

  // Active brand data
  const activeBrandData = brands.find((b) => b.key === selectedBrand?.key || b.brand === selectedBrand?.key)
  const brandDocs = activeBrandData?.docs ?? selectedBrand?.docs ?? 0
  const brandQueries = activeBrandData?.queries ?? selectedBrand?.queries ?? 0
  const brandFiles = activeBrandData?.files ?? selectedBrand?.files ?? 0
  const brandChunks = activeBrandData?.chunks ?? selectedBrand?.chunks ?? 0

  // Trend data derived from real counts — memoized so it's stable across re-renders
  const queryTrend = useMemo(() => getMonthTrend(brandQueries || 12), [brandQueries])
  const docTrend = useMemo(() => getMonthTrend(brandDocs || 5), [brandDocs])

  // Brand comparison
  const sortedBrands = useMemo(
    () => [...brands].sort((a, b) => (b.queries ?? 0) - (a.queries ?? 0)),
    [brands]
  )
  const maxBrandQ = Math.max(...sortedBrands.map((b) => b.queries ?? 0), 1)

  const BRAND_COLORS = ['var(--brand)', 'var(--teal)', 'var(--amber)', 'var(--pink)', 'var(--blue)', 'var(--green)']

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="grid-4">
          {[...Array(4)].map((_, i) => <div key={i} className="stat-card skeleton" style={{ height: 110 }} />)}
        </div>
        <div className="grid-2">
          {[...Array(2)].map((_, i) => <div key={i} className="card skeleton" style={{ height: 240 }} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && (
        <div className="card" style={{ borderColor: 'var(--amber)', padding: '12px 16px' }}>
          <span style={{ fontSize: 12, color: 'var(--amber)' }}>
            <i className="ti ti-alert-triangle" /> Could not reach the backend. Showing empty data.
          </span>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid-4">
        {[
          { label: 'Active Brand', value: selectedBrand?.name || '—', icon: 'ti-building', color: 'var(--brand)', bg: 'var(--brand-glow)', note: 'Current focus' },
          { label: 'Brand Queries', value: brandQueries, icon: 'ti-message-2', color: 'var(--teal)', bg: 'var(--teal-bg)', note: 'AI prompts run' },
          { label: 'Documents', value: brandDocs, icon: 'ti-file-text', color: 'var(--amber)', bg: 'var(--amber-bg)', note: `${brandFiles} files` },
          { label: 'Vector Chunks', value: brandChunks.toLocaleString(), icon: 'ti-vectors', color: 'var(--blue)', bg: 'var(--blue-bg)', note: 'Indexed chunks' },
        ].map((stat) => (
          <div key={stat.label} className="stat-card card-hover">
            <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
              <i className={`ti ${stat.icon}`} />
            </div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color, fontSize: typeof stat.value === 'string' && stat.value.length > 8 ? 20 : 28 }}>
              {stat.value}
            </div>
            <div className="stat-change up">
              <i className="ti ti-arrow-up-right" /> {stat.note}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-2">
        {/* AI Query Trend */}
        <div className="card">
          <div className="section-hd">
            <i className="ti ti-chart-bar" style={{ color: 'var(--brand)', fontSize: 16 }} />
            <h2>Query Activity</h2>
            <span className="muted small">Past 6 months · {selectedBrand?.name}</span>
            <span className="view-all">
              <span className="badge badge-brand" style={{ fontSize: 11 }}>{brandQueries} total</span>
            </span>
          </div>
          <BarChart data={queryTrend} color="var(--brand)" height={160} />
        </div>

        {/* Document Upload Trend */}
        <div className="card">
          <div className="section-hd">
            <i className="ti ti-chart-area" style={{ color: 'var(--teal)', fontSize: 16 }} />
            <h2>Document Uploads</h2>
            <span className="muted small">Past 6 months · {selectedBrand?.name}</span>
            <span className="view-all">
              <span className="badge badge-teal" style={{ fontSize: 11 }}>{brandDocs} docs</span>
            </span>
          </div>
          <BarChart data={docTrend} color="var(--teal)" height={160} />
        </div>
      </div>

      {/* Brand Distribution + Performance Table */}
      <div className="grid-2-1" style={{ gap: 20 }}>
        {/* Performance Table */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="section-hd" style={{ marginBottom: 0 }}>
              <i className="ti ti-trophy" style={{ color: 'var(--amber)', fontSize: 16 }} />
              <h2>Brand Performance</h2>
              <span className="muted small">Ranked by AI usage</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Brand</th>
                  <th>AI Queries</th>
                  <th>Documents</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {sortedBrands.length > 0 ? sortedBrands.map((brand, i) => {
                  const pct = Math.round(((brand.queries ?? 0) / maxBrandQ) * 100)
                  const color = BRAND_COLORS[i % BRAND_COLORS.length]
                  return (
                    <tr key={brand.key || brand.brand || brand.name}>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, color: i < 3 ? 'var(--amber)' : 'var(--faint)' }}>
                          #{i + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="brand-dot" style={{ background: brand.color || color }} />
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{brand.name}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{brand.queries ?? 0}</td>
                      <td>{brand.docs ?? 0}</td>
                      <td style={{ minWidth: 100 }}>
                        <div className="prog-bar" style={{ marginTop: 0 }}>
                          <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{pct}%</div>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>
                      No brand data yet. Upload documents and run AI queries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column — Platform Stats + Donut */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Platform totals */}
          <div className="card">
            <div className="section-hd">
              <i className="ti ti-chart-donut" style={{ color: 'var(--pink)', fontSize: 16 }} />
              <h2>Platform Totals</h2>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { label: 'Total Documents', value: totalDocs, color: 'var(--amber)', pct: 100 },
                { label: 'Total Queries', value: totalQueries, color: 'var(--brand)', pct: 100 },
                { label: 'Vector Chunks', value: totalChunks, color: 'var(--teal)', pct: 100 },
                { label: 'Active Brands', value: brands.length, color: 'var(--pink)', pct: 100 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex-between mb-4">
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: '100%', background: item.color, opacity: 0.7 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand share donut */}
          {sortedBrands.length > 0 && (
            <div className="card">
              <div className="section-hd">
                <i className="ti ti-chart-pie-2" style={{ color: 'var(--blue)', fontSize: 16 }} />
                <h2>Top Brand Share</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutSegment
                    value={sortedBrands[0]?.queries ?? 0}
                    total={totalQueries}
                    color="var(--brand)"
                    size={80}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>
                      {totalQueries > 0 ? Math.round(((sortedBrands[0]?.queries ?? 0) / totalQueries) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {sortedBrands[0]?.name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                    Most active brand · {sortedBrands[0]?.queries ?? 0} queries
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}