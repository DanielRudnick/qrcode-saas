// ============================================================
// lib/qr.ts — Helpers de geração de conteúdo QR
// ============================================================
import QRCode from 'qrcode'
import type { QRType, VCardFormData, ECL } from '@/types'

// ── Gerar conteúdo textual do QR por tipo ─────────────────────
export function buildQRContent(type: QRType, data: Record<string, string>): string {
  switch (type) {
    case 'url':
      return data.url || ''

    case 'whatsapp': {
      const num = data.phone.replace(/\D/g, '')
      const msg = data.message ? `?text=${encodeURIComponent(data.message)}` : ''
      return `https://wa.me/${num}${msg}`
    }

    case 'vcard': {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${data.full_name}`,
        data.company ? `ORG:${data.company}` : '',
        data.phone   ? `TEL:${data.phone}` : '',
        data.email   ? `EMAIL:${data.email}` : '',
        data.website ? `URL:${data.website}` : '',
        'END:VCARD',
      ]
      return lines.filter(Boolean).join('\n')
    }

    case 'pdf':
      return data.file_url || ''

    case 'texto':
      return data.text || ''

    default:
      return ''
  }
}

// ── Gerar PNG base64 do QR ────────────────────────────────────
export async function generateQRDataURL(
  content: string,
  options: {
    fgColor?: string
    bgColor?: string
    size?: number
    ecl?: ECL
  } = {}
): Promise<string> {
  const { fgColor = '#000000', bgColor = '#ffffff', size = 256, ecl = 'M' } = options
  return QRCode.toDataURL(content, {
    color: { dark: fgColor, light: bgColor },
    width: size,
    errorCorrectionLevel: ecl,
    margin: 2,
  })
}

// ── Gerar slug único para QR dinâmico ─────────────────────────
export function generateSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let slug = ''
  const array = new Uint8Array(length)
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(array)
    for (const byte of array) slug += chars[byte % chars.length]
  } else {
    for (let i = 0; i < length; i++) slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

// ── Detectar tipo de dispositivo pelo User-Agent ──────────────
export function detectDevice(ua: string): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  if (!ua) return 'unknown'
  const mobile = /Android|webOS|iPhone|BlackBerry|Windows Phone/i.test(ua)
  const tablet = /iPad|Android(?!.*Mobile)/i.test(ua)
  if (tablet) return 'tablet'
  if (mobile) return 'mobile'
  return 'desktop'
}

// ── Badges de tipo ────────────────────────────────────────────
export const QR_TYPE_LABELS: Record<QRType, string> = {
  url:       'URL',
  whatsapp:  'WhatsApp',
  vcard:     'vCard',
  pdf:       'PDF',
  texto:     'Texto',
}

export const QR_TYPE_COLORS: Record<QRType, string> = {
  url:       'bg-blue-50 text-blue-800',
  whatsapp:  'bg-green-50 text-green-800',
  vcard:     'bg-purple-50 text-purple-800',
  pdf:       'bg-amber-50 text-amber-800',
  texto:     'bg-gray-100 text-gray-700',
}
