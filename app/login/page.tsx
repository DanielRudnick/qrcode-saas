'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Mode = 'login' | 'reset' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const isNetwork = error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')
      setMsg({
        text: isNetwork
          ? 'Erro de conexão com o servidor. Aguarde alguns instantes e tente novamente.'
          : 'E-mail ou senha incorretos.',
        type: 'error',
      })
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    router.push(profile?.role === 'admin' ? '/dashboard/admin' : '/dashboard/client')
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setMsg({ text: 'Digite seu e-mail acima.', type: 'error' }); return }
    setLoading(true)
    setMsg(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    setLoading(false)
    if (error) {
      setMsg({ text: 'Erro ao enviar. Tente novamente.', type: 'error' })
    } else {
      setMsg({ text: '✓ Link de redefinição enviado! Verifique sua caixa de entrada.', type: 'success' })
      setMode('login')
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setMsg({ text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' })
      return
    }
    setLoading(true)
    setMsg(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    setLoading(false)
    if (error) {
      setMsg({ text: error.message.includes('already registered')
        ? 'E-mail já cadastrado. Faça login.'
        : 'Erro ao criar conta. Tente novamente.', type: 'error' })
    } else {
      setMsg({ text: '✓ Conta criada! Verifique seu e-mail para confirmar o cadastro.', type: 'success' })
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

  const subtitle = mode === 'login' ? 'Acesse sua conta' : mode === 'reset' ? 'Redefinir senha' : 'Criar nova conta'

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
          <p style={{ color: '#666', fontSize: 14, margin: '6px 0 0' }}>{subtitle}</p>
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

          {mode === 'signup' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>Nome</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome completo" style={input}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="seu@email.com" style={input}
            />
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>Senha</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" style={input}
              />
            </div>
          )}

          {mode === 'login' && (
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%', background: '#00e5ff', color: '#0a0a0a',
                border: 'none', borderRadius: 8, padding: '12px',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', marginBottom: '1rem', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          )}

          {mode === 'reset' && (
            <button
              onClick={handleReset}
              disabled={loading}
              style={{
                width: '100%', background: '#00e5ff', color: '#0a0a0a',
                border: 'none', borderRadius: 8, padding: '12px',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', marginBottom: '1rem', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>
          )}

          {mode === 'signup' && (
            <button
              onClick={handleSignup}
              disabled={loading}
              style={{
                width: '100%', background: '#00e5ff', color: '#0a0a0a',
                border: 'none', borderRadius: 8, padding: '12px',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', marginBottom: '1rem', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          )}

          <div style={{ borderTop: '1px solid #252525', margin: '1rem 0' }} />

          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => { setMode('signup'); setMsg(null) }}
                style={{
                  width: '100%', background: 'none',
                  border: '1px solid #2a2a2a', borderRadius: 8,
                  color: '#aaa', padding: '11px',
                  fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  marginBottom: '0.75rem',
                }}
              >
                Criar nova conta
              </button>
              <button
                type="button"
                onClick={() => { setMode('reset'); setMsg(null) }}
                style={{
                  width: '100%', background: 'none',
                  border: '1px solid #2a2a2a', borderRadius: 8,
                  color: '#aaa', padding: '11px',
                  fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Esqueci minha senha
              </button>
            </>
          )}

          {(mode === 'reset' || mode === 'signup') && (
            <button
              type="button"
              onClick={() => { setMode('login'); setMsg(null) }}
              style={{
                width: '100%', background: 'none',
                border: '1px solid #2a2a2a', borderRadius: 8,
                color: '#aaa', padding: '11px',
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Voltar ao login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
