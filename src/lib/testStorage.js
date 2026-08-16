/**
 * Kangaroo CBT — Test Storage v2
 *
 * Uses Supabase when configured, falls back to localStorage for dev/demo.
 * All functions are async to support Supabase network calls.
 */

import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = "kangaroo-cbt-tests"

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

function localSaveAll(tests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests))
}

// ─────────────────────────────────────────
// PUBLIC API (all async)
// ─────────────────────────────────────────

/**
 * Get all stored tests.
 */
export async function getAllTests() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Supabase get tests error:", error.message)
      // Fallback to localStorage on error
      return localGetAll()
    }

    // Convert Supabase rows back to blob format
    return data.map(row => row.test_data)
  }

  return localGetAll()
}

/**
 * Get a single test by title.
 */
export async function getTest(title) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("tests")
      .select("test_data")
      .eq("title", title)
      .single()

    if (error) {
      console.error("Supabase get test error:", error.message)
      return localGetAll().find(t => t.test.title === title) || null
    }

    return data?.test_data || null
  }

  return localGetAll().find(t => t.test.title === title) || null
}

/**
 * Save a validated test blob. Returns the saved test.
 * Rejects if a test with the same title already exists.
 */
export async function saveTest(blob) {
  const title = blob.test.title

  if (isSupabaseConfigured) {
    // Check for duplicates
    const { data: existing } = await supabase
      .from("tests")
      .select("id")
      .eq("title", title)
      .maybeSingle()

    if (existing) {
      throw new Error(`A test with the title "${title}" already exists. Delete it first or change the title.`)
    }

    const { data, error } = await supabase
      .from("tests")
      .insert({
        title,
        description: blob.test.description || "",
        time_limit_minutes: blob.test.time_limit_minutes || 45,
        test_data: blob
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase save test error:", error.message)
      throw new Error(`Failed to save test: ${error.message}`)
    }

    return blob
  }

  // localStorage fallback
  const tests = localGetAll()
  if (tests.some(t => t.test.title === title)) {
    throw new Error(`A test with the title "${title}" already exists. Delete it first or change the title.`)
  }
  tests.push(blob)
  localSaveAll(tests)
  return blob
}

/**
 * Delete a test by title.
 */
export async function deleteTest(title) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from("tests")
      .delete()
      .eq("title", title)

    if (error) {
      console.error("Supabase delete test error:", error.message)
      throw new Error(`Failed to delete test: ${error.message}`)
    }
    return
  }

  // localStorage fallback
  const tests = localGetAll()
  const filtered = tests.filter(t => t.test.title !== title)
  if (filtered.length === tests.length) {
    throw new Error(`Test "${title}" not found.`)
  }
  localSaveAll(filtered)
}

/**
 * Check if a test with the given title exists.
 */
export async function testExists(title) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("tests")
      .select("id")
      .eq("title", title)
      .maybeSingle()
    return !!data
  }

  return localGetAll().some(t => t.test.title === title)
}

/**
 * Replace an existing test (overwrite by title).
 */
export async function replaceTest(oldTitle, newBlob) {
  const newTitle = newBlob.test.title

  if (isSupabaseConfigured) {
    // Delete old, insert new
    await supabase.from("tests").delete().eq("title", oldTitle)

    const { data, error } = await supabase
      .from("tests")
      .insert({
        title: newTitle,
        description: newBlob.test.description || "",
        time_limit_minutes: newBlob.test.time_limit_minutes || 45,
        test_data: newBlob
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase replace test error:", error.message)
      throw new Error(`Failed to replace test: ${error.message}`)
    }

    return newBlob
  }

  // localStorage fallback
  const tests = localGetAll()
  const index = tests.findIndex(t => t.test.title === oldTitle)
  if (index === -1) {
    throw new Error(`Test "${oldTitle}" not found.`)
  }
  tests[index] = newBlob
  localSaveAll(tests)
  return newBlob
}

/**
 * Rename a test (change title only, keep all other data).
 */
export async function renameTest(oldTitle, newTitle) {
  if (!newTitle || !newTitle.trim()) {
    throw new Error("New title cannot be empty.")
  }
  if (oldTitle === newTitle) return

  // Check new title doesn't already exist
  const exists = await testExists(newTitle)
  if (exists) {
    throw new Error(`A test named "${newTitle}" already exists.`)
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("tests")
      .select("test_data")
      .eq("title", oldTitle)
      .single()

    if (error || !data) {
      throw new Error(`Test "${oldTitle}" not found.`)
    }

    // Update the blob's internal title
    const blob = { ...data.test_data }
    blob.test = { ...blob.test, title: newTitle }

    // Delete old, insert new
    await supabase.from("tests").delete().eq("title", oldTitle)

    const { error: insertError } = await supabase
      .from("tests")
      .insert({
        title: newTitle,
        description: blob.test.description || "",
        time_limit_minutes: blob.test.time_limit_minutes || 45,
        test_data: blob
      })

    if (insertError) {
      throw new Error(`Failed to rename test: ${insertError.message}`)
    }
    return
  }

  // localStorage fallback
  const tests = localGetAll()
  const index = tests.findIndex(t => t.test.title === oldTitle)
  if (index === -1) {
    throw new Error(`Test "${oldTitle}" not found.`)
  }
  const blob = { ...tests[index] }
  blob.test = { ...blob.test, title: newTitle }
  tests[index] = blob
  localSaveAll(tests)
}

/**
 * Get summary info for all tests.
 * This is a lightweight version that doesn't need full test_data.
 */
export async function getTestSummaries() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("tests")
      .select("title, description, time_limit_minutes, test_data")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Supabase get summaries error:", error.message)
      // Fallback to local
      return localGetAll().map(blob => ({
        title: blob.test.title,
        description: blob.test.description || "",
        exercise_count: blob.test.exercises.length,
        question_count: blob.test.exercises.reduce((sum, ex) => sum + ex.questions.length, 0),
        time_limit: blob.test.time_limit_minutes || 45
      }))
    }

    return data.map(row => {
      const td = row.test_data
      return {
        title: row.title,
        description: row.description || "",
        exercise_count: td.test?.exercises?.length || 0,
        question_count: (td.test?.exercises || []).reduce((sum, ex) => sum + (ex.questions?.length || 0), 0),
        time_limit: row.time_limit_minutes || 45
      }
    })
  }

  return localGetAll().map(blob => ({
    title: blob.test.title,
    description: blob.test.description || "",
    exercise_count: blob.test.exercises.length,
    question_count: blob.test.exercises.reduce((sum, ex) => sum + ex.questions.length, 0),
    time_limit: blob.test.time_limit_minutes || 45
  }))
}
