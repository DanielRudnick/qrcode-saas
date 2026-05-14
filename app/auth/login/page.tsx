'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin') {
      router.push('/dashboard/admin')
    } else {
      router.push('/dashboard/client')
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Digite seu e-mail para redefinir a senha.'); return }
    setLoading(true)
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (resetError) {
      setError('Erro ao enviar e-mail. Tente novamente.')
    } else {
      setResetMsg('E-mail de redefinição enviado! Verifique sua caixa de entrada.')
      setResetMode(false)
    }
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

      <div style={{
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Logo / Marca */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            background: '#00e5ff',
            borderRadius: 14,
            marginBottom: '1rem',
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
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 600, margin: 0 }}>
            QR Manager
          </h1>
          <p style={{ color: '#666', fontSize: 14, margin: '6px 0 0' }}>
            Acesse sua conta
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={resetMode ? handleResetPassword : handleLogin}
          style={{
            background: '#161616',
            border: '1px solid #252525',
            borderRadius: 16,
            padding: '2rem',
          }}
        >
          {error && (
            <div style={{
              background: '#1a0a0a',
              border: '1px solid #ff3f3f44',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: '1.25rem',
              color: '#ff6060',
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {resetMsg && (
            <div style={{
              background: '#0a1a0a',
              border: '1px solid #4ade8044',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: '1.25rem',
              color: '#4ade80',
              fontSize: 14,
            }}>
              {resetMsg}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
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

          {!resetMode && (
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
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
          )}

          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => { setResetMode(m => !m); setError(''); setResetMsg('') }}
              style={{ background: 'none', border: 'none', color: '#00e5ff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
            >
              {resetMode ? '← Voltar ao login' : 'Esqueceu a senha?'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#0099aa' : '#00e5ff',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 8,
              padding: '12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '...' : resetMode ? 'Enviar link de redefinição' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#444', fontSize: 13, marginTop: '1.5rem' }}>
          Não tem acesso? Fale com o administrador.
        </p>
      </div>
    </div>
  )
}
