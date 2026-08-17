/**
 * Kangaroo CBT — Supabase Client
 *
 * Configure with your Supabase project URL and anon key.
 * Create a .env file or set these directly.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://zbstjsghxbbkyxmoqweu.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic3Rqc2doeGJia3l4bW9xd2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDU3MDMsImV4cCI6MjEwMjMyMTcwM30.JIhn7hHfuzqc4cRCTP7GFxS-x-qzltQqkBJGomrjCbg"

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = !!supabase
