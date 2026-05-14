// app/api/admin/create-client/route.ts
// Rota protegida: só admin pode criar clientes
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Verificar se o usuário logado é admin
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    // Criar usuário com service role
    const { email, password, full_name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 })
    }

    const adminClient = createServiceClient()
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        role: 'client',
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // O trigger handle_new_user cria o perfil automaticamente
    // Mas garantimos que o full_name está correto
    if (newUser.user && full_name) {
      await adminClient
        .from('profiles')
        .update({ full_name })
        .eq('id', newUser.user.id)
    }

    return NextResponse.json({
      success: true,
      user_id: newUser.user?.id,
      email,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 })
  }
}
