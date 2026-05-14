'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, QRStats } from '@/types'

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

  const [tab, setTab] = useState<'clients' | 'qrcodes' | 'create_client'>('clients')
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
              const owner = clients.find(c => c.user_id === qr.user_id)
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
      </main>
    </div>
  )
}
