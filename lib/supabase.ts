// lib/supabase.ts — Cliente browser apenas (safe para Client Components)
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON)
}

export function createServiceClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
