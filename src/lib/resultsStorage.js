import { supabase } from './supabase'

const RESULTS_TABLE = 'results'

function getLocalKey() {
  return 'kangaroo_results'
}

function getLocalResults() {
  try {
    return JSON.parse(localStorage.getItem(getLocalKey()) || '[]')
  } catch {
    return []
  }
}

function setLocalResults(results) {
  localStorage.setItem(getLocalKey(), JSON.stringify(results))
}

/**
 * Save a test result.
 * Returns the saved result object.
 */
export async function saveResult({ userId, testTitle, answers, results: scoreData }) {
  const record = {
    id: crypto.randomUUID(),
    user_id: userId,
    test_title: testTitle,
    answers,
    total_correct: scoreData.total_correct,
    total_questions: scoreData.total_questions,
    overall_pct: scoreData.overall_pct,
    created_at: new Date().toISOString()
  }

  if (supabase) {
    const { error } = await supabase.from(RESULTS_TABLE).insert(record)
    if (error) {
      console.warn('Supabase save failed, saving locally:', error.message)
      const local = getLocalResults()
      local.unshift(record)
      setLocalResults(local)
    }
  } else {
    const local = getLocalResults()
    local.unshift(record)
    setLocalResults(local)
  }

  return record
}

/**
 * Get all results for a user, newest first.
 */
export async function getUserResults(userId) {
  if (supabase) {
    const { data, error } = await supabase
      .from(RESULTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      if (data.length > 0) return data
      // Fall through to local if empty
    }
  }

  const local = getLocalResults()
  if (userId) {
    return local.filter(r => r.user_id === userId)
  }
  return local
}

/**
 * Get a single result by id.
 */
export async function getResult(id) {
  if (supabase) {
    const { data, error } = await supabase
      .from(RESULTS_TABLE)
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) return data
  }

  const local = getLocalResults()
  return local.find(r => r.id === id) || null
}

/**
 * Delete a single result.
 */
export async function deleteResult(id) {
  if (supabase) {
    const { error } = await supabase
      .from(RESULTS_TABLE)
      .delete()
      .eq('id', id)
    if (error) console.warn('Supabase delete failed:', error.message)
  }

  const local = getLocalResults()
  setLocalResults(local.filter(r => r.id !== id))
}
