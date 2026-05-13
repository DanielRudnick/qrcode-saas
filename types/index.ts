// ============================================================
// types/index.ts — Tipos centrais do QR Code SaaS
// ============================================================

export type UserRole = 'admin' | 'client'

export type QRType = 'url' | 'whatsapp' | 'vcard' | 'pdf' | 'texto'

export type ECL = 'L' | 'M' | 'Q' | 'H'

export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  active: boolean
  created_at: string
  updated_at: string
}

export interface QRCode {
  id: string
  user_id: string
  slug: string | null
  label: string
  type: QRType
  content: string
  target_url: string | null
  is_dynamic: boolean
  fg_color: string
  bg_color: string
  ecl: ECL
  size: number
  scan_count: number
  created_at: string
  updated_at: string
}

export interface QRScan {
  id: string
  qr_id: string
  scanned_at: string
  ip: string | null
  user_agent: string | null
  device_type: DeviceType
  country: string | null
  city: string | null
  referrer: string | null
}

export interface QRStats {
  id: string
  user_id: string
  label: string
  type: QRType
  slug: string | null
  is_dynamic: boolean
  created_at: string
  total_scans: number
  scans_7d: number
  scans_30d: number
  last_scan_at: string | null
}

// Formulários
export interface URLFormData {
  url: string
  label: string
  is_dynamic: boolean
}

export interface WhatsAppFormData {
  phone: string
  message: string
  label: string
}

export interface VCardFormData {
  full_name: string
  company: string
  phone: string
  email: string
  website: string
  label: string
}

export interface PDFFormData {
  file_url: string
  label: string
}

export interface TextFormData {
  text: string
  label: string
}

export type QRFormData =
  | ({ type: 'url' } & URLFormData)
  | ({ type: 'whatsapp' } & WhatsAppFormData)
  | ({ type: 'vcard' } & VCardFormData)
  | ({ type: 'pdf' } & PDFFormData)
  | ({ type: 'texto' } & TextFormData)

export interface QRCreatePayload {
  type: QRType
  label: string
  content: string
  target_url?: string
  is_dynamic: boolean
  fg_color: string
  bg_color: string
  ecl: ECL
  size: number
}

export interface ScansByDay {
  date: string
  count: number
}

export interface ScansByDevice {
  device_type: DeviceType
  count: number
}

export interface QRDetailStats {
  qr: QRCode
  total_scans: number
  scans_7d: number
  scans_30d: number
  last_scan_at: string | null
  by_day: ScansByDay[]
  by_device: ScansByDevice[]
}
