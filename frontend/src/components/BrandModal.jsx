import React, { useEffect, useState } from 'react'

const PRESET_COLORS = [
  '#7b6ef6', '#e85c8a', '#f0a030', '#2bcfa0',
  '#4a9ef0', '#5ec45e', '#ff6b6b', '#ffd93d',
]

const DEFAULT_BRAND = {
  key: '',
  name: '',
  color: '#7b6ef6',
  description: '',
  industry: '',
  website: '',
  status: 'active',
  logo_url: '',
}

export default function BrandModal({ open, onClose, onSave, initialData }) {
  const [brand, setBrand] = useState(DEFAULT_BRAND)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (initialData) {
      setBrand({
        key:         initialData.key         || '',
        name:        initialData.name        || '',
        color:       initialData.color       || '#7b6ef6',
        description: initialData.description || '',
        industry:    initialData.industry    || '',
        website:     initialData.website     || '',
        status:      initialData.status      || 'active',
        logo_url:    initialData.logo_url    || '',
      })
    } else {
      setBrand(DEFAULT_BRAND)
    }
    setErrors({})
  }, [initialData, open])

  if (!open) return null

  const set = (key, value) => {
    setBrand((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!brand.key.trim()) e.key = 'Brand key is required'
    else if (!/^[a-z0-9-]+$/.test(brand.key.trim())) e.key = 'Use only lowercase letters, numbers and hyphens'
    if (!brand.name.trim()) e.name = 'Brand name is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      await onSave({ ...brand, key: brand.key.trim().toLowerCase() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: brand.color + '22',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: brand.color,
                  fontSize: 16,
                  border: `1px solid ${brand.color}44`,
                }}
              >
                <i className="ti ti-building" />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                {initialData ? 'Edit Brand' : 'Add New Brand'}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 44 }}>
              {initialData
                ? 'Update brand metadata and settings'
                : 'Create a new brand workspace with AI knowledge'}
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            style={{ border: 'none', background: 'var(--bg3)', flexShrink: 0 }}
          >
            <i className="ti ti-x" style={{ fontSize: 15 }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div className="grid-2" style={{ gap: 12 }}>
            {/* Brand Key */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Brand Key <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                className="form-input"
                value={brand.key}
                onChange={(e) => set('key', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                disabled={Boolean(initialData)}
                placeholder="my-brand"
                style={errors.key ? { borderColor: 'var(--red)' } : {}}
              />
              {errors.key && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{errors.key}</div>
              )}
            </div>

            {/* Brand Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Brand Name <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                className="form-input"
                value={brand.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="My Brand"
                style={errors.name ? { borderColor: 'var(--red)' } : {}}
              />
              {errors.name && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{errors.name}</div>
              )}
            </div>

            {/* Industry */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Industry</label>
              <input
                className="form-input"
                value={brand.industry}
                onChange={(e) => set('industry', e.target.value)}
                placeholder="Beauty, Retail, Automotive…"
              />
            </div>

            {/* Status */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select
                className="select-box w-full"
                value={brand.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Website */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Website</label>
              <input
                className="form-input"
                value={brand.website}
                onChange={(e) => set('website', e.target.value)}
                placeholder="https://brand.com"
              />
            </div>

            {/* Logo URL */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Logo URL</label>
              <input
                className="form-input"
                value={brand.logo_url}
                onChange={(e) => set('logo_url', e.target.value)}
                placeholder="https://…/logo.png"
              />
            </div>
          </div>

          {/* Brand Color */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Brand Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: c,
                    border: brand.color === c ? '3px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                    transform: brand.color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={brand.color}
                onChange={(e) => set('color', e.target.value)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '2px solid var(--border2)',
                  cursor: 'pointer',
                  padding: 0,
                  background: 'transparent',
                }}
                title="Custom color"
              />
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  marginLeft: 4,
                  fontFamily: 'monospace',
                }}
              >
                {brand.color}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={3}
              value={brand.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="A short summary of this brand's identity and focus area…"
              style={{ resize: 'vertical', minHeight: 76 }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
              marginTop: 4,
            }}
          >
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="topbar-btn"
              disabled={saving}
              style={{ minWidth: 120 }}
            >
              {saving ? (
                <>
                  <div
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  Saving…
                </>
              ) : (
                <>
                  <i className="ti ti-device-floppy" />
                  {initialData ? 'Update Brand' : 'Create Brand'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
