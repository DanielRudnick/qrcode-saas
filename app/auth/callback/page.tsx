'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase embeds the token in the URL hash — the client SDK picks it up automatically
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setMsg({ text: 'As senhas não coincidem.', type: 'error' })
      return
    }
    if (password.length < 6) {
      setMsg({ text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' })
      return
    }
    setLoading(true)
    setMsg(null)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setMsg({ text: 'Erro ao atualizar senha. Tente novamente.', type: 'error' })
    } else {
      setMsg({ text: '✓ Senha atualizada com sucesso! Redirecionando...', type: 'success' })
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  const input: React.CSSProperties = {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    padding: '11px 14px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      fontFamily: "'Space Grotesk', sans-serif",
      padding: '1rem',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, background: '#00e5ff', borderRadius: 14, marginBottom: '1rem',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" fill="#0a0a0a"/>
              <rect x="14" y="3" width="7" height="7" rx="1" fill="#0a0a0a"/>
              <rect x="3" y="14" width="7" height="7" rx="1" fill="#0a0a0a"/>
              <rect x="5" y="5" width="3" height="3" fill="#00e5ff"/>
              <rect x="16" y="5" width="3" height="3" fill="#00e5ff"/>
              <rect x="5" y="16" width="3" height="3" fill="#00e5ff"/>
              <rect x="14" y="14" width="3" height="3" fill="#0a0a0a"/>
              <rect x="18" y="14" width="3" height="3" fill="#0a0a0a"/>
              <rect x="14" y="18" width="3" height="3" fill="#0a0a0a"/>
              <rect x="18" y="18" width="3" height="3" fill="#0a0a0a"/>
            </svg>
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 600, margin: 0 }}>QR Manager</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '6px 0 0' }}>Definir nova senha</p>
        </div>

        <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 16, padding: '2rem' }}>
          {msg && (
            <div style={{
              background: msg.type === 'error' ? '#1a0a0a' : '#0a1a0a',
              border: `1px solid ${msg.type === 'error' ? '#ff3f3f44' : '#4ade8044'}`,
              borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem',
              color: msg.type === 'error' ? '#ff6060' : '#4ade80', fontSize: 14,
            }}>
              {msg.text}
            </div>
          )}

          {!ready ? (
            <p style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>
              Verificando link de redefinição...
            </p>
          ) : (
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={input}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>Confirmar senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={input}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: '#00e5ff', color: '#0a0a0a',
                  border: 'none', borderRadius: 8, padding: '12px',
                  fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
