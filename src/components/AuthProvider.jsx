/**
 * Kangaroo CBT — Authentication Context v2
 *
 * Provides auth state and methods throughout the app.
 * Uses Supabase when configured, falls back to localStorage for dev/demo.
 * Profile creation is handled here — no database trigger needed.
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          loadOrCreateProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null)
          if (session?.user) {
            loadOrCreateProfile(session.user.id)
          } else {
            setProfile(null)
            setLoading(false)
          }
        }
      )

      return () => subscription.unsubscribe()
    } else {
      const stored = localStorage.getItem("kangaroo-cbt-auth")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setUser(parsed.user)
          setProfile(parsed.profile)
        } catch {}
      }
      setLoading(false)
    }
  }, [])

  /**
   * Load existing profile, or create one if it doesn't exist.
   * First user = admin. Everyone else = student.
   */
  const loadOrCreateProfile = async (userId) => {
    try {
      // Step 1: Try to READ existing profile
      const { data: existing, error: readError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (readError) {
        console.error("Profile read error:", readError.message)
      }

      // Profile exists — use it
      if (existing) {
        setProfile(existing)
        setLoading(false)
        return
      }

      // Step 2: No profile exists — determine role
      // Use RPC to count ALL profiles (bypasses RLS)
      let role = "student"
      try {
        const { data: count, error: countError } = await supabase
          .rpc("get_profile_count")

        if (countError) {
          console.error("Profile count RPC error:", countError.message)
        }

        // If count is 0 or null, this is the first user → admin
        if (!count || count === 0) {
          role = "admin"
        }
      } catch (rpcErr) {
        console.warn("RPC unavailable, defaulting to student role:", rpcErr.message)
      }

      // Step 3: Create the profile
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: userId, role })
        .select()
        .single()

      if (insertError) {
        console.error("Profile insert error:", insertError.message)
        // If insert fails (e.g. race condition), try reading again
        const { data: retry } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle()

        if (retry) {
          setProfile(retry)
        } else {
          // Last resort: set profile in memory with default role
          setProfile({ id: userId, role: "student" })
        }
      } else {
        setProfile(newProfile)
      }
    } catch (err) {
      console.error("Profile error:", err)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return data
    } else {
      const users = JSON.parse(localStorage.getItem("kangaroo-cbt-users") || "[]")
      if (users.find(u => u.email === email)) {
        throw new Error("An account with this email already exists.")
      }

      const newUser = {
        id: crypto.randomUUID(),
        email,
        password,
        created_at: new Date().toISOString()
      }
      users.push(newUser)
      localStorage.setItem("kangaroo-cbt-users", JSON.stringify(users))

      const profiles = JSON.parse(localStorage.getItem("kangaroo-cbt-profiles") || "[]")
      const role = profiles.length === 0 ? "admin" : "student"
      const newProfile = { id: newUser.id, role, created_at: newUser.created_at }
      profiles.push(newProfile)
      localStorage.setItem("kangaroo-cbt-profiles", JSON.stringify(profiles))

      const userObj = { id: newUser.id, email: newUser.email }
      setUser(userObj)
      setProfile(newProfile)
      localStorage.setItem("kangaroo-cbt-auth", JSON.stringify({ user: userObj, profile: newProfile }))

      return { user: userObj }
    }
  }

  const signIn = async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    } else {
      const users = JSON.parse(localStorage.getItem("kangaroo-cbt-users") || "[]")
      const found = users.find(u => u.email === email && u.password === password)
      if (!found) {
        throw new Error("Invalid email or password.")
      }

      const profiles = JSON.parse(localStorage.getItem("kangaroo-cbt-profiles") || "[]")
      const profile = profiles.find(p => p.id === found.id)

      const userObj = { id: found.id, email: found.email }
      setUser(userObj)
      setProfile(profile || { id: found.id, role: "student" })
      localStorage.setItem("kangaroo-cbt-auth", JSON.stringify({
        user: userObj,
        profile: profile || { id: found.id, role: "student" }
      }))

      return { user: userObj }
    }
  }

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setProfile(null)
    localStorage.removeItem("kangaroo-cbt-auth")
  }

  const isAdmin = profile?.role === "admin"
  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isAuthenticated, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
