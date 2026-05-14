'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { buildQRContent, generateQRDataURL, generateSlug, QR_TYPE_LABELS } from '@/lib/qr'
import type { Profile, QRStats, QRType, ECL, QRCode, QRDetailStats } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

// ── Componentes locais ────────────────────────────────────────
function Badge({ type }: { type: QRType }) {
  const colors: Record<string, { bg: string; color: string }> = {
    url:      { bg: '#0a1a2a', color: '#00e5ff' },
    whatsapp: { bg: '#0a1a0a', color: '#4ade80' },
    vcard:    { bg: '#1a0a2a', color: '#c084fc' },
    pdf:      { bg: '#1a1200', color: '#fbbf24' },
    texto:    { bg: '#1a1a1a', color: '#888' },
  }
  const c = colors[type] || colors.texto
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500 }}>
      {QR_TYPE_LABELS[type]}
    </span>
  )
}

const S = {
  input: {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#fff',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  label: { display: 'block', color: '#666', fontSize: 12, marginBottom: 6 } as React.CSSProperties,
  field: { marginBottom: '1rem' } as React.CSSProperties,
}

// ── Formulários por tipo ──────────────────────────────────────
function URLForm({ data, onChange }: { data: any; onChange: (k: string, v: string | boolean) => void }) {
  return (
    <>
      <div style={S.field}>
        <label style={S.label}>URL de destino</label>
        <input style={S.input} type="url" placeholder="https://seusite.com.br" value={data.url || ''} onChange={e => onChange('url', e.target.value)} />
      </div>
      <div style={S.field}>
        <label style={S.label}>Rótulo interno</label>
        <input style={S.input} type="text" placeholder="Ex: Site principal" value={data.label || ''} onChange={e => onChange('label', e.target.value)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" id="dyn" checked={!!data.is_dynamic} onChange={e => onChange('is_dynamic', e.target.checked)} style={{ width: 'auto' }} />
        <label htmlFor="dyn" style={{ color: '#888', fontSize: 13, cursor: 'pointer' }}>QR Dinâmico (link editável depois)</label>
      </div>
    </>
  )
}

function WhatsAppForm({ data, onChange }: { data: any; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <div style={S.field}>
        <label style={S.label}>Número (com DDI e DDD)</label>
        <input style={S.input} type="text" placeholder="5541999990000" value={data.phone || ''} onChange={e => onChange('phone', e.target.value)} />
      </div>
      <div style={S.field}>
        <label style={S.label}>Rótulo</label>
        <input style={S.input} type="text" placeholder="WhatsApp do hotel" value={data.label || ''} onChange={e => onChange('label', e.target.value)} />
      </div>
      <div style={S.field}>
        <label style={S.label}>Mensagem pré-preenchida</label>
        <textarea style={{ ...S.input, height: 80, resize: 'vertical' }} placeholder="Olá! Gostaria de saber mais..." value={data.message || ''} onChange={e => onChange('message', e.target.value)} />
      </div>
    </>
  )
}

function VCardForm({ data, onChange }: { data: any; onChange: (k: string, v: string) => void }) {
  return (
    <>
      {[
        { key: 'full_name', label: 'Nome completo', placeholder: 'João Silva' },
        { key: 'company',   label: 'Empresa',       placeholder: 'Pousada Bella Vista' },
        { key: 'phone',     label: 'Telefone',       placeholder: '5541999990000' },
        { key: 'email',     label: 'E-mail',         placeholder: 'contato@pousada.com' },
        { key: 'website',   label: 'Site',           placeholder: 'https://pousada.com.br' },
        { key: 'label',     label: 'Rótulo interno', placeholder: 'Cartão João' },
      ].map(f => (
        <div style={S.field} key={f.key}>
          <label style={S.label}>{f.label}</label>
          <input style={S.input} type="text" placeholder={f.placeholder} value={data[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} />
        </div>
      ))}
    </>
  )
}

function PDFForm({ data, onChange }: { data: any; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <div style={S.field}>
        <label style={S.label}>URL do arquivo</label>
        <input style={S.input} type="url" placeholder="https://drive.google.com/..." value={data.file_url || ''} onChange={e => onChange('file_url', e.target.value)} />
      </div>
      <div style={S.field}>
        <label style={S.label}>Rótulo</label>
        <input style={S.input} type="text" placeholder="Cardápio 2025" value={data.label || ''} onChange={e => onChange('label', e.target.value)} />
      </div>
    </>
  )
}

function TextForm({ data, onChange }: { data: any; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <div style={S.field}>
        <label style={S.label}>Texto livre</label>
        <textarea style={{ ...S.input, height: 100, resize: 'vertical' }} placeholder="Digite qualquer conteúdo..." value={data.text || ''} onChange={e => onChange('text', e.target.value)} />
      </div>
      <div style={S.field}>
        <label style={S.label}>Rótulo</label>
        <input style={S.input} type="text" placeholder="Mensagem de boas-vindas" value={data.label || ''} onChange={e => onChange('label', e.target.value)} />
      </div>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function ClientDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<'gerar' | 'historico' | 'scans'>('gerar')
  const [qrType, setQrType] = useState<QRType>('url')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [ecl, setEcl] = useState<ECL>('M')
  const [qrDataURL, setQrDataURL] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [history, setHistory] = useState<QRStats[]>([])
  const [selectedQR, setSelectedQR] = useState<QRDetailStats | null>(null)
  const [editDynamic, setEditDynamic] = useState<{ id: string; label: string; url: string } | null>(null)
  const [viewQR, setViewQR] = useState<{ id: string; label: string; dataURL: string; content: string; target_url: string | null; slug: string | null; is_dynamic: boolean } | null>(null)

  const previewTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
    })
  }, [supabase, router])

  // Gerar preview com debounce
  useEffect(() => {
    clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(async () => {
      const content = buildQRContent(qrType, formData)
      if (!content) { setQrDataURL(''); return }
      const url = await generateQRDataURL(content, { fgColor, bgColor, ecl, size: 220 })
      setQrDataURL(url)
    }, 300)
    return () => clearTimeout(previewTimer.current)
  }, [qrType, formData, fgColor, bgColor, ecl])

  const loadHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('qr_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setHistory(data || [])
  }, [supabase])

  useEffect(() => { if (tab === 'historico') loadHistory() }, [tab, loadHistory])

  function handleFieldChange(key: string, value: string | boolean) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const content = buildQRContent(qrType, formData)
    if (!content) { setSaveMsg('Preencha o conteúdo antes de salvar.'); return }
    setSaving(true)
    setSaveMsg('')

    const label = formData.label || content.substring(0, 40)
    const isDynamic = !!formData.is_dynamic
    const slug = isDynamic ? generateSlug() : null

    const { error } = await supabase.from('qrcodes').insert({
      user_id: user.id,
      type: qrType,
      label,
      content: isDynamic ? (slug ? `${window.location.origin}/r/${slug}` : content) : content,
      target_url: isDynamic ? content : null,
      slug,
      is_dynamic: isDynamic,
      fg_color: fgColor,
      bg_color: bgColor,
      ecl,
      size: 256,
    })

    if (error) {
      setSaveMsg('Erro ao salvar: ' + error.message)
    } else {
      setSaveMsg('QR Code salvo!')
      setTab('historico')
    }
    setSaving(false)
  }

  async function handleDownload(format: 'png' | 'svg') {
    if (!qrDataURL) return
    const a = document.createElement('a')
    if (format === 'png') {
      a.href = qrDataURL
      a.download = `qr_${formData.label || 'code'}.png`
    } else {
      const label = formData.label || 'code'
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><image href="${qrDataURL}" width="256" height="256"/></svg>`
      a.href = `data:image/svg+xml;base64,${btoa(svgContent)}`
      a.download = `qr_${label}.svg`
    }
    a.click()
  }

  async function loadQRDetail(qrId: string) {
    const { data: qr } = await supabase.from('qrcodes').select('*').eq('id', qrId).single()
    if (!qr) return
    const { data: scans } = await supabase
      .from('qr_scans')
      .select('scanned_at, device_type')
      .eq('qr_id', qrId)
      .order('scanned_at', { ascending: false })
      .limit(200)

    // Agrupar por dia
    const byDay: Record<string, number> = {}
    const byDevice: Record<string, number> = {}
    for (const s of scans || []) {
      const day = s.scanned_at.substring(0, 10)
      byDay[day] = (byDay[day] || 0) + 1
      byDevice[s.device_type || 'unknown'] = (byDevice[s.device_type || 'unknown'] || 0) + 1
    }

    setSelectedQR({
      qr,
      total_scans: scans?.length || 0,
      scans_7d: 0,
      scans_30d: 0,
      last_scan_at: scans?.[0]?.scanned_at || null,
      by_day: Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
      by_device: Object.entries(byDevice).map(([device_type, count]) => ({ device_type: device_type as any, count })),
    })
    setTab('scans')
  }

  async function handleUpdateDynamic(e: React.FormEvent) {
    e.preventDefault()
    if (!editDynamic) return
    const content = buildQRContent('url', { url: editDynamic.url })
    await supabase.from('qrcodes').update({ target_url: editDynamic.url, label: editDynamic.label }).eq('id', editDynamic.id)
    setEditDynamic(null)
    loadHistory()
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar este QR Code?')) return
    await supabase.from('qrcodes').delete().eq('id', id)
    loadHistory()
  }

  async function handleViewQR(qrId: string) {
    const { data: qr } = await supabase.from('qrcodes').select('*').eq('id', qrId).single()
    if (!qr) return
    const dataURL = await generateQRDataURL(qr.content, { fgColor: qr.fg_color, bgColor: qr.bg_color, ecl: qr.ecl, size: 256 })
    setViewQR({ id: qr.id, label: qr.label, dataURL, content: qr.content, target_url: qr.target_url, slug: qr.slug, is_dynamic: qr.is_dynamic })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const TYPES: { key: QRType; label: string }[] = [
    { key: 'url', label: 'URL' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'vcard', label: 'vCard' },
    { key: 'pdf', label: 'PDF' },
    { key: 'texto', label: 'Texto' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: '1px solid #1a1a1a', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: '#00e5ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 700 }}>Q</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>QR Manager</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#666', fontSize: 13 }}>{profile?.full_name || profile?.email}</span>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '1px solid #1a1a1a', paddingBottom: 0 }}>
          {[
            { key: 'gerar', label: 'Gerar QR' },
            { key: 'historico', label: 'Meus QR Codes' },
            ...(selectedQR ? [{ key: 'scans', label: 'Analytics' }] : []),
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)} style={{
              background: 'none', border: 'none',
              borderBottom: tab === t.key ? '2px solid #00e5ff' : '2px solid transparent',
              color: tab === t.key ? '#fff' : '#666',
              padding: '8px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit', marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Gerar */}
        {tab === 'gerar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.5rem', alignItems: 'start' }}>
            <div>
              {/* Tipo de QR */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {TYPES.map(t => (
                  <button key={t.key} onClick={() => { setQrType(t.key); setFormData({}) }}
                    style={{
                      padding: '7px 16px', fontSize: 13, borderRadius: 20, cursor: 'pointer',
                      border: qrType === t.key ? '1px solid #00e5ff' : '1px solid #2a2a2a',
                      background: qrType === t.key ? '#001a1f' : 'none',
                      color: qrType === t.key ? '#00e5ff' : '#888',
                      fontFamily: 'inherit', fontWeight: 500,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Formulário por tipo */}
              <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
                {qrType === 'url'      && <URLForm      data={formData} onChange={handleFieldChange} />}
                {qrType === 'whatsapp' && <WhatsAppForm data={formData} onChange={handleFieldChange} />}
                {qrType === 'vcard'    && <VCardForm    data={formData} onChange={handleFieldChange} />}
                {qrType === 'pdf'      && <PDFForm      data={formData} onChange={handleFieldChange} />}
                {qrType === 'texto'    && <TextForm     data={formData} onChange={handleFieldChange} />}
              </div>

              {/* Aparência */}
              <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>Personalizar aparência</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={S.field}>
                    <label style={S.label}>Cor do QR</label>
                    <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)}
                      style={{ width: '100%', height: 36, padding: '2px 4px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, cursor: 'pointer' }} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Cor do fundo</label>
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                      style={{ width: '100%', height: 36, padding: '2px 4px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, cursor: 'pointer' }} />
                  </div>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Nível de correção de erro</label>
                  <select value={ecl} onChange={e => setEcl(e.target.value as ECL)}
                    style={{ ...S.input }}>
                    <option value="L">L — Baixo (mais limpo)</option>
                    <option value="M">M — Médio (recomendado)</option>
                    <option value="Q">Q — Quartil</option>
                    <option value="H">H — Alto (para QR com logo)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {qrDataURL ? (
                <img src={qrDataURL} width={200} height={200} alt="QR Code preview"
                  style={{ borderRadius: 8, border: '1px solid #252525' }} />
              ) : (
                <div style={{
                  width: 200, height: 200, border: '1px dashed #2a2a2a', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#444', fontSize: 13, textAlign: 'center', padding: '1rem',
                }}>
                  Preencha os campos para gerar o preview
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleDownload('png')} disabled={!qrDataURL}
                  style={{ padding: '7px 14px', fontSize: 13, borderRadius: 8, cursor: qrDataURL ? 'pointer' : 'not-allowed', border: '1px solid #2a2a2a', background: 'none', color: qrDataURL ? '#fff' : '#444', fontFamily: 'inherit' }}>
                  PNG
                </button>
                <button onClick={() => handleDownload('svg')} disabled={!qrDataURL}
                  style={{ padding: '7px 14px', fontSize: 13, borderRadius: 8, cursor: qrDataURL ? 'pointer' : 'not-allowed', border: '1px solid #2a2a2a', background: 'none', color: qrDataURL ? '#fff' : '#444', fontFamily: 'inherit' }}>
                  SVG
                </button>
              </div>

              {saveMsg && (
                <div style={{ color: saveMsg.includes('Erro') ? '#f87171' : '#4ade80', fontSize: 13, textAlign: 'center' }}>
                  {saveMsg}
                </div>
              )}

              <button onClick={handleSave} disabled={saving || !qrDataURL}
                style={{
                  width: '100%', background: saving || !qrDataURL ? '#0a3a44' : '#00e5ff',
                  color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '11px',
                  fontSize: 14, fontWeight: 600, cursor: saving || !qrDataURL ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}>
                {saving ? 'Salvando...' : 'Salvar QR Code'}
              </button>
            </div>
          </div>
        )}

        {/* Modal Ver QR */}
        {viewQR && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => { if (e.target === e.currentTarget) setViewQR(null) }}>
            <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 16, padding: '1.5rem', maxWidth: 320, width: '100%', margin: '0 1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <img src={viewQR.dataURL} width={220} height={220} alt="QR Code" style={{ borderRadius: 8, border: '1px solid #252525' }} />
                <div style={{ fontWeight: 600, fontSize: 15, textAlign: 'center' }}>{viewQR.label}</div>
                {viewQR.is_dynamic && viewQR.target_url ? (
                  <div style={{ width: '100%' }}>
                    <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>URL de destino</div>
                    <div style={{ color: '#00e5ff', fontSize: 13, wordBreak: 'break-all' }}>{viewQR.target_url}</div>
                  </div>
                ) : (
                  <div style={{ width: '100%' }}>
                    <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Conteúdo</div>
                    <div style={{ color: '#ccc', fontSize: 13, wordBreak: 'break-all', overflow: 'hidden', maxHeight: 60, textOverflow: 'ellipsis' }}>{viewQR.content.substring(0, 120)}{viewQR.content.length > 120 ? '…' : ''}</div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  <button
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = viewQR.dataURL
                      a.download = `qr_${viewQR.label || 'code'}.png`
                      a.click()
                    }}
                    style={{ background: '#00e5ff', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Baixar PNG</button>
                  {viewQR.is_dynamic && (
                    <button
                      onClick={async () => {
                        const { data } = await supabase.from('qrcodes').select('target_url').eq('id', viewQR.id).single()
                        setEditDynamic({ id: viewQR.id, label: viewQR.label, url: data?.target_url || '' })
                        setViewQR(null)
                      }}
                      style={{ background: 'none', border: '1px solid #c084fc', borderRadius: 8, color: '#c084fc', padding: '9px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                    >Editar URL</button>
                  )}
                  <button
                    onClick={() => setViewQR(null)}
                    style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', padding: '9px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Fechar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Histórico */}
        {tab === 'historico' && (
          <div>
            {/* Modal editar dinâmico */}
            {editDynamic && (
              <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Editar QR Dinâmico</div>
                <form onSubmit={handleUpdateDynamic}>
                  <div style={S.field}>
                    <label style={S.label}>Rótulo</label>
                    <input style={S.input} value={editDynamic.label} onChange={e => setEditDynamic(d => d ? { ...d, label: e.target.value } : d)} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Nova URL de destino</label>
                    <input style={S.input} type="url" value={editDynamic.url} onChange={e => setEditDynamic(d => d ? { ...d, url: e.target.value } : d)} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={{ background: '#00e5ff', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Salvar</button>
                    <button type="button" onClick={() => setEditDynamic(null)} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                  </div>
                </form>
              </div>
            )}

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontSize: 14 }}>
                Nenhum QR Code salvo ainda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map(qr => (
                  <div key={qr.id} style={{
                    background: '#161616', border: '1px solid #252525', borderRadius: 12,
                    padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Badge type={qr.type} />
                        {qr.is_dynamic && (
                          <span style={{ background: '#1a0a2a', color: '#c084fc', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>DINÂMICO</span>
                        )}
                        <span style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>{qr.label || '(sem nome)'}</span>
                      </div>
                      <div style={{ color: '#555', fontSize: 12 }}>
                        {new Date(qr.created_at).toLocaleDateString('pt-BR')} ·{' '}
                        {qr.last_scan_at ? `Último scan: ${new Date(qr.last_scan_at).toLocaleDateString('pt-BR')}` : 'Nunca escaneado'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, textAlign: 'center' }}>
                      <div>
                        <div style={{ color: '#4ade80', fontWeight: 600 }}>{Number(qr.total_scans)}</div>
                        <div style={{ color: '#555', fontSize: 11 }}>Scans</div>
                      </div>
                      <div>
                        <div style={{ color: '#00e5ff', fontWeight: 600 }}>{Number(qr.scans_7d)}</div>
                        <div style={{ color: '#555', fontSize: 11 }}>7 dias</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleViewQR(qr.id)}
                        style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Ver QR
                      </button>
                      <button onClick={() => loadQRDetail(qr.id)}
                        style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#00e5ff', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Analytics
                      </button>
                      {qr.is_dynamic && (
                        <button onClick={async () => {
                          const { data } = await supabase.from('qrcodes').select('target_url').eq('id', qr.id).single()
                          setEditDynamic({ id: qr.id, label: qr.label, url: data?.target_url || '' })
                        }}
                          style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#c084fc', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Editar URL
                        </button>
                      )}
                      <button onClick={() => handleDelete(qr.id)}
                        style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#f87171', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Scans / Analytics */}
        {tab === 'scans' && selectedQR && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <button onClick={() => setTab('historico')}
                style={{ background: 'none', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                ← Voltar
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Badge type={selectedQR.qr.type} />
                <span style={{ fontWeight: 600, fontSize: 16 }}>{selectedQR.qr.label}</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: '2rem' }}>
              {[
                { label: 'Scans totais', value: selectedQR.total_scans, color: '#4ade80' },
                { label: 'Último scan', value: selectedQR.last_scan_at ? new Date(selectedQR.last_scan_at).toLocaleDateString('pt-BR') : '—' },
                { label: 'Criado em', value: new Date(selectedQR.qr.created_at).toLocaleDateString('pt-BR') },
              ].map(s => (
                <div key={s.label} style={{ background: '#161616', border: '1px solid #252525', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ color: s.color || '#fff', fontSize: 20, fontWeight: 600 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Gráfico por dia */}
            {selectedQR.by_day.length > 0 && (
              <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>Scans por dia (últimos 14 dias)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={selectedQR.by_day}>
                    <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fill: '#555', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: '#161616', border: '1px solid #252525', borderRadius: 8, fontSize: 13 }}
                      labelStyle={{ color: '#888' }}
                      itemStyle={{ color: '#00e5ff' }}
                    />
                    <Bar dataKey="count" fill="#00e5ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Por dispositivo */}
            {selectedQR.by_device.length > 0 && (
              <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>Por dispositivo</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {selectedQR.by_device.map(d => (
                    <div key={d.device_type} style={{
                      background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10,
                      padding: '10px 16px', textAlign: 'center',
                    }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 18 }}>{d.count}</div>
                      <div style={{ color: '#555', fontSize: 12 }}>{d.device_type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedQR.total_scans === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontSize: 14 }}>
                Este QR Code ainda não foi escaneado.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
