// lib/supabase.ts — Cliente browser apenas (safe para Client Components)
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Fallback garante que o cliente funciona mesmo sem env vars no Vercel
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ehbpsghmueulqwspyxrn.supabase.co'
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoYnBzZ2htdWV1bHF3c3B5eHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDA0ODYsImV4cCI6MjA5NDI3NjQ4Nn0.uAsR7JdvLpvvk3G7N-H0_djyfUPIqc5wESSGg8L8jpE'
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON)
}

export function createServiceClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
