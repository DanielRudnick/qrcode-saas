'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { buildQRContent, generateQRDataURL, generateSlug, QR_TYPE_LABELS } from '@/lib/qr'
import type { Profile, QRStats, QRType, ECL, QRCode } from '@/types'

// ── Estilos compartilhados ────────────────────────────────────
const S = {
  input: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
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

// ── Componentes internos ──────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      background: '#161616',
      border: '1px solid #252525',
      borderRadius: 12,
      padding: '1.25rem',
    }}>
      <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color: color || '#fff', fontSize: 24, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function Badge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    url:      { bg: '#0a1a2a', color: '#00e5ff' },
    whatsapp: { bg: '#0a1a0a', color: '#4ade80' },
    vcard:    { bg: '#1a0a2a', color: '#c084fc' },
    pdf:      { bg: '#1a1200', color: '#fbbf24' },
    texto:    { bg: '#1a1a1a', color: '#888' },
  }
  const c = colors[type] || colors.texto
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      fontSize: 11,
      padding: '3px 8px',
      borderRadius: 20,
      fontWeight: 500,
    }}>
      {type.toUpperCase()}
    </span>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function AdminDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [tab, setTab] = useState<'clients' | 'qrcodes' | 'create_client' | 'my_qrcodes' | 'create_qr'>('clients')
  const [clients, setClients] = useState<Profile[]>([])
  const [qrstats, setQrstats] = useState<QRStats[]>([])
  const [loading, setLoading] = useState(true)
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null)

  // Criar cliente
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPass, setNewPass] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  // Criar QR
  const [qrType, setQrType] = useState<QRType>('url')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [ecl, setEcl] = useState<ECL>('M')
  const [qrDataURL, setQrDataURL] = useState<string>('')
  const [savingQR, setSavingQR] = useState(false)
  const [saveQRMsg, setSaveQRMsg] = useState('')
  const [adminQRHistory, setAdminQRHistory] = useState<any[]>([])
  const [viewQR, setViewQR] = useState<{ id: string; label: string; dataURL: string; content: string; target_url: string | null; is_dynamic: boolean } | null>(null)
  const [editDynamic, setEditDynamic] = useState<{ id: string; label: string; url: string } | null>(null)

  const previewTimer = useRef<NodeJS.Timeout>()

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: profile }, { data: profileList }, { data: qrList }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false }),
      supabase.from('qr_stats').select('*').order('created_at', { ascending: false }).limit(50),
    ])

    setAdminProfile(profile)
    setClients(profileList || [])
    setQrstats(qrList || [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { loadData() }, [loadData])

  // Preview com debounce
  useEffect(() => {
    if (tab !== 'create_qr') return
    clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(async () => {
      const content = buildQRContent(qrType, formData)
      if (!content) { setQrDataURL(''); return }
      const url = await generateQRDataURL(content, { fgColor, bgColor, ecl, size: 220 })
      setQrDataURL(url)
    }, 300)
    return () => clearTimeout(previewTimer.current)
  }, [qrType, formData, fgColor, bgColor, ecl, tab])

  const loadAdminHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('qrcodes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setAdminQRHistory(data || [])
  }, [supabase])

  useEffect(() => { if (tab === 'my_qrcodes') loadAdminHistory() }, [tab, loadAdminHistory])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    setCreateSuccess('')

    const res = await fetch('/api/admin/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: newPass, full_name: newName }),
    })
    const json = await res.json()

    if (!res.ok) {
      setCreateError(json.error || 'Erro ao criar cliente.')
    } else {
      setCreateSuccess(`Cliente ${newEmail} criado com sucesso!`)
      setNewEmail(''); setNewName(''); setNewPass('')
      loadData()
    }
    setCreating(false)
  }

  async function toggleClientStatus(clientId: string, active: boolean) {
    await supabase.from('profiles').update({ active: !active }).eq('id', clientId)
    loadData()
  }

  function handleFieldChange(key: string, value: string | boolean) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function handleAdminSaveQR() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const content = buildQRContent(qrType, formData)
    if (!content) { setSaveQRMsg('Preencha o conteúdo antes de salvar.'); return }
    setSavingQR(true); setSaveQRMsg('')
    const label = formData.label || content.substring(0, 40)
    const isDynamic = !!formData.is_dynamic
    const slug = isDynamic ? generateSlug() : null
    const { error } = await supabase.from('qrcodes').insert({
      user_id: user.id, type: qrType, label,
      content: isDynamic ? (slug ? `${window.location.origin}/r/${slug}` : content) : content,
      target_url: isDynamic ? content : null, slug, is_dynamic: isDynamic,
      fg_color: fgColor, bg_color: bgColor, ecl, size: 256,
    })
    if (error) { setSaveQRMsg('Erro: ' + error.message) } else { setSaveQRMsg('QR salvo!'); setTab('my_qrcodes') }
    setSavingQR(false)
  }

  async function handleViewQR(qrId: string) {
    const { data: qr } = await supabase.from('qrcodes').select('*').eq('id', qrId).single()
    if (!qr) return
    const dataURL = await generateQRDataURL(qr.content, { fgColor: qr.fg_color, bgColor: qr.bg_color, ecl: qr.ecl, size: 256 })
    setViewQR({ id: qr.id, label: qr.label, dataURL, content: qr.content, target_url: qr.target_url, is_dynamic: qr.is_dynamic })
  }

  async function handleAdminDelete(id: string) {
    if (!confirm('Deletar este QR Code?')) return
    await supabase.from('qrcodes').delete().eq('id', id)
    loadAdminHistory()
  }

  async function handleAdminUpdateDynamic(e: React.FormEvent) {
    e.preventDefault()
    if (!editDynamic) return
    await supabase.from('qrcodes').update({ target_url: editDynamic.url, label: editDynamic.label }).eq('id', editDynamic.id)
    setEditDynamic(null)
    loadAdminHistory()
  }

  const TYPES: { key: QRType; label: string }[] = [
    { key: 'url', label: 'URL' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'vcard', label: 'vCard' },
    { key: 'pdf', label: 'PDF' },
    { key: 'texto', label: 'Texto' },
  ]

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ color: '#00e5ff', fontSize: 14 }}>Carregando...</div>
      </div>
    )
  }

  const totalScans = qrstats.reduce((acc, q) => acc + Number(q.total_scans), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1a1a1a',
        padding: '0 1.5rem',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32,
            background: '#00e5ff',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 700 }}>Q</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>QR Manager</span>
          <span style={{
            background: '#1a0a1a',
            color: '#ff3f8e',
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 20,
            fontWeight: 500,
          }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#666', fontSize: 13 }}>{adminProfile?.email}</span>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              color: '#888',
              padding: '6px 12px',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '2rem' }}>
          <StatCard label="Clientes ativos" value={clients.filter(c => c.active).length} color="#00e5ff" />
          <StatCard label="Total de QR Codes" value={qrstats.length} />
          <StatCard label="Scans totais" value={totalScans.toLocaleString('pt-BR')} color="#4ade80" />
          <StatCard label="QRs dinâmicos" value={qrstats.filter(q => q.is_dynamic).length} color="#c084fc" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '1px solid #1a1a1a', paddingBottom: 0 }}>
          {[
            { key: 'clients', label: 'Clientes' },
            { key: 'qrcodes', label: 'Todos os QR Codes' },
            { key: 'create_client', label: '+ Novo cliente' },
            { key: 'my_qrcodes', label: 'Meus QRs' },
            { key: 'create_qr', label: '+ Criar QR' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === t.key ? '2px solid #00e5ff' : '2px solid transparent',
                color: tab === t.key ? '#fff' : '#666',
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Clientes */}
        {tab === 'clients' && (
          <div>
            {clients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontSize: 14 }}>
                Nenhum cliente cadastrado ainda. Clique em "+ Novo cliente".
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clients.map(client => {
                  const clientQRs = qrstats.filter(q => q.user_id === client.id)
                  const clientScans = clientQRs.reduce((acc, q) => acc + Number(q.total_scans), 0)
                  return (
                    <div key={client.id} style={{
                      background: '#161616',
                      border: '1px solid #252525',
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38, height: 38,
                          background: '#1a1a2a',
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#00e5ff',
                          fontSize: 14,
                          fontWeight: 600,
                        }}>
                          {(client.full_name || client.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>
                            {client.full_name || '—'}
                          </div>
                          <div style={{ color: '#666', fontSize: 13 }}>{client.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#fff', fontWeight: 600 }}>{clientQRs.length}</div>
                          <div style={{ color: '#555', fontSize: 11 }}>QR Codes</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#4ade80', fontWeight: 600 }}>{clientScans}</div>
                          <div style={{ color: '#555', fontSize: 11 }}>Scans</div>
                        </div>
                        <span style={{
                          background: client.active ? '#0a1a0a' : '#1a0a0a',
                          color: client.active ? '#4ade80' : '#f87171',
                          fontSize: 11,
                          padding: '3px 10px',
                          borderRadius: 20,
                        }}>
                          {client.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          onClick={() => toggleClientStatus(client.id, client.active)}
                          style={{
                            background: 'none',
                            border: '1px solid #2a2a2a',
                            borderRadius: 8,
                            color: '#888',
                            padding: '5px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {client.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Todos os QR Codes */}
        {tab === 'qrcodes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {qrstats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontSize: 14 }}>
                Nenhum QR Code gerado ainda.
              </div>
            ) : qrstats.map(qr => {
              const owner = clients.find(c => c.id === qr.user_id)
              return (
                <div key={qr.id} style={{
                  background: '#161616',
                  border: '1px solid #252525',
                  borderRadius: 12,
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Badge type={qr.type} />
                      {qr.is_dynamic && (
                        <span style={{ background: '#1a0a2a', color: '#c084fc', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>
                          DINÂMICO
                        </span>
                      )}
                      <span style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>{qr.label || '(sem nome)'}</span>
                    </div>
                    <div style={{ color: '#555', fontSize: 12 }}>
                      Cliente: {owner?.full_name || owner?.email || qr.user_id.slice(0, 8)} ·{' '}
                      {new Date(qr.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, textAlign: 'center' }}>
                    <div>
                      <div style={{ color: '#4ade80', fontWeight: 600 }}>{Number(qr.total_scans).toLocaleString('pt-BR')}</div>
                      <div style={{ color: '#555', fontSize: 11 }}>Scans</div>
                    </div>
                    <div>
                      <div style={{ color: '#00e5ff', fontWeight: 600 }}>{Number(qr.scans_7d)}</div>
                      <div style={{ color: '#555', fontSize: 11 }}>7 dias</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab: Criar cliente */}
        {tab === 'create_client' && (
          <div style={{ maxWidth: 480 }}>
            <form
              onSubmit={handleCreateClient}
              style={{
                background: '#161616',
                border: '1px solid #252525',
                borderRadius: 16,
                padding: '2rem',
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 1.5rem' }}>Novo cliente</h2>

              {createError && (
                <div style={{ background: '#1a0a0a', border: '1px solid #ff3f3f44', borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem', color: '#ff6060', fontSize: 13 }}>
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div style={{ background: '#0a1a0a', border: '1px solid #4ade8044', borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem', color: '#4ade80', fontSize: 13 }}>
                  {createSuccess}
                </div>
              )}

              {[
                { label: 'Nome completo', value: newName, setter: setNewName, type: 'text', placeholder: 'João Silva' },
                { label: 'E-mail', value: newEmail, setter: setNewEmail, type: 'email', placeholder: 'joao@hotel.com' },
                { label: 'Senha inicial', value: newPass, setter: setNewPass, type: 'password', placeholder: '••••••••' },
              ].map(field => (
                <div key={field.label} style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    required
                    placeholder={field.placeholder}
                    style={{
                      width: '100%',
                      background: '#0a0a0a',
                      border: '1px solid #2a2a2a',
                      borderRadius: 8,
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={creating}
                style={{
                  width: '100%',
                  background: creating ? '#0099aa' : '#00e5ff',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: creating ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {creating ? 'Criando...' : 'Criar cliente'}
              </button>
            </form>
          </div>
        )}

        {/* Tab: Criar QR */}
        {tab === 'create_qr' && (
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

              {saveQRMsg && (
                <div style={{ color: saveQRMsg.includes('Erro') ? '#f87171' : '#4ade80', fontSize: 13, textAlign: 'center' }}>
                  {saveQRMsg}
                </div>
              )}

              <button onClick={handleAdminSaveQR} disabled={savingQR || !qrDataURL}
                style={{
                  width: '100%', background: savingQR || !qrDataURL ? '#0a3a44' : '#00e5ff',
                  color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '11px',
                  fontSize: 14, fontWeight: 600, cursor: savingQR || !qrDataURL ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}>
                {savingQR ? 'Salvando...' : 'Salvar QR Code'}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Meus QRs */}
        {tab === 'my_qrcodes' && (
          <div>
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

            {/* Modal Editar Dinâmico */}
            {editDynamic && (
              <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Editar QR Dinâmico</div>
                <form onSubmit={handleAdminUpdateDynamic}>
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

            {adminQRHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontSize: 14 }}>
                Nenhum QR Code salvo ainda. Clique em "+ Criar QR" para começar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {adminQRHistory.map((qr: any) => (
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
                        {new Date(qr.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleViewQR(qr.id)}
                        style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Ver QR
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
                      <button onClick={() => handleAdminDelete(qr.id)}
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
      </main>
    </div>
  )
}
