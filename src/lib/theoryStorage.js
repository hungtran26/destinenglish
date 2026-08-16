/**
 * Kangaroo CBT — Theory Storage
 *
 * Stores theory content separately from tests.
 * Uses Supabase when configured, falls back to localStorage.
 */

import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = "kangaroo-cbt-theories"

// ─────────────────────────────────────────
// LOCAL STORAGE FALLBACK
// ─────────────────────────────────────────

function localGetAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function localSaveAll(theories) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theories))
}

// ─────────────────────────────────────────
// PUBLIC API (all async)
// ─────────────────────────────────────────

/**
 * Get all stored theories.
 */
export async function getAllTheories() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("theories")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Supabase get theories error:", error.message)
      return localGetAll()
    }

    return data.map(row => row.theory_data)
  }

  return localGetAll()
}

/**
 * Get a single theory by title.
 */
export async function getTheory(title) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("theories")
      .select("theory_data")
      .eq("title", title)
      .single()

    if (error) {
      console.error("Supabase get theory error:", error.message)
      return localGetAll().find(t => t.theory.title === title) || null
    }

    return data?.theory_data || null
  }

  return localGetAll().find(t => t.theory.title === title) || null
}

/**
 * Save a theory blob. Returns the saved theory.
 */
export async function saveTheory(blob) {
  const title = blob.theory.title

  if (isSupabaseConfigured) {
    const { data: existing } = await supabase
      .from("theories")
      .select("id")
      .eq("title", title)
      .maybeSingle()

    if (existing) {
      throw new Error(`A theory with the title "${title}" already exists.`)
    }

    const { data, error } = await supabase
      .from("theories")
      .insert({
        title,
        subtitle: blob.theory.subtitle || "",
        theory_data: blob
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save theory: ${error.message}`)
    }

    return blob
  }

  const theories = localGetAll()
  if (theories.some(t => t.theory.title === title)) {
    throw new Error(`A theory with the title "${title}" already exists.`)
  }
  theories.push(blob)
  localSaveAll(theories)
  return blob
}

/**
 * Check if a theory with the given title exists.
 */
export async function theoryExists(title) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("theories")
      .select("id")
      .eq("title", title)
      .maybeSingle()
    return !!data
  }

  return localGetAll().some(t => t.theory.title === title)
}

/**
 * Replace an existing theory (overwrite by title).
 */
export async function replaceTheory(oldTitle, newBlob) {
  const newTitle = newBlob.theory.title

  if (isSupabaseConfigured) {
    await supabase.from("theories").delete().eq("title", oldTitle)

    const { error } = await supabase
      .from("theories")
      .insert({
        title: newTitle,
        subtitle: newBlob.theory.subtitle || "",
        theory_data: newBlob
      })

    if (error) {
      throw new Error(`Failed to replace theory: ${error.message}`)
    }
    return newBlob
  }

  const theories = localGetAll()
  const index = theories.findIndex(t => t.theory.title === oldTitle)
  if (index === -1) {
    throw new Error(`Theory "${oldTitle}" not found.`)
  }
  theories[index] = newBlob
  localSaveAll(theories)
  return newBlob
}

/**
 * Rename a theory (change title only).
 */
export async function renameTheory(oldTitle, newTitle) {
  if (!newTitle || !newTitle.trim()) {
    throw new Error("New title cannot be empty.")
  }
  if (oldTitle === newTitle) return

  const exists = await theoryExists(newTitle)
  if (exists) {
    throw new Error(`A theory named "${newTitle}" already exists.`)
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("theories")
      .select("theory_data")
      .eq("title", oldTitle)
      .single()

    if (error || !data) {
      throw new Error(`Theory "${oldTitle}" not found.`)
    }

    const blob = { ...data.theory_data }
    blob.theory = { ...blob.theory, title: newTitle }

    await supabase.from("theories").delete().eq("title", oldTitle)

    const { error: insertError } = await supabase
      .from("theories")
      .insert({
        title: newTitle,
        subtitle: blob.theory.subtitle || "",
        theory_data: blob
      })

    if (insertError) {
      throw new Error(`Failed to rename theory: ${insertError.message}`)
    }
    return
  }

  const theories = localGetAll()
  const index = theories.findIndex(t => t.theory.title === oldTitle)
  if (index === -1) {
    throw new Error(`Theory "${oldTitle}" not found.`)
  }
  const blob = { ...theories[index] }
  blob.theory = { ...blob.theory, title: newTitle }
  theories[index] = blob
  localSaveAll(theories)
}

/**
 * Delete a theory by title.
 */
export async function deleteTheory(title) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from("theories")
      .delete()
      .eq("title", title)

    if (error) {
      throw new Error(`Failed to delete theory: ${error.message}`)
    }
    return
  }

  const theories = localGetAll()
  const filtered = theories.filter(t => t.theory.title !== title)
  if (filtered.length === theories.length) {
    throw new Error(`Theory "${title}" not found.`)
  }
  localSaveAll(filtered)
}
