// app/api/redirect/[slug]/route.ts
// Rota pública: redireciona QR dinâmico e registra scan
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { detectDevice } from '@/lib/qr'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  const supabase = createServiceClient()

  // Buscar QR dinâmico pelo slug
  const { data: qr, error } = await supabase
    .from('qrcodes')
    .select('id, target_url, is_dynamic')
    .eq('slug', slug)
    .single()

  if (error || !qr || !qr.target_url) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Registrar scan assincronamente (não bloquear o redirect)
  const ua = request.headers.get('user-agent') || ''
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const device = detectDevice(ua)
  const referrer = request.headers.get('referer') || null

  // Inserir scan (fire-and-forget) — contagem agregada pela view qr_stats
  void Promise.resolve(supabase.from('qr_scans').insert({
    qr_id: qr.id,
    ip,
    user_agent: ua.substring(0, 255),
    device_type: device,
    referrer,
  })).catch(console.error)

  // Redirect imediato para o destino
  return NextResponse.redirect(qr.target_url, { status: 302 })
}
