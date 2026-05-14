// ============================================================
// middleware.ts — Proteção de rotas
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/api/redirect', '/auth/callback']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  // Redirecionar para login se não autenticado
  if (!session && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Se já logado e tentando acessar login, redirecionar para dashboard
  if (session && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const dest = profile?.role === 'admin' ? '/dashboard/admin' : '/dashboard/client'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Proteger rotas admin
  if (pathname.startsWith('/dashboard/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/client', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
