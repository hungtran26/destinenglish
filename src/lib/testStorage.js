/**
 * Kangaroo CBT — Test Storage
 *
 * Persists imported tests in localStorage.
 * Provides CRUD operations for test management.
 */

const STORAGE_KEY = "kangaroo-cbt-tests"

/**
 * Get all stored tests.
 */
export function getAllTests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Get a single test by its title (or index).
 */
export function getTest(title) {
  const tests = getAllTests()
  return tests.find(t => t.test.title === title) || null
}

/**
 * Save a validated test blob. Returns the saved test.
 * Rejects if a test with the same title already exists.
 */
export function saveTest(blob) {
  const tests = getAllTests()
  const title = blob.test.title

  if (tests.some(t => t.test.title === title)) {
    throw new Error(`A test with the title "${title}" already exists. Delete it first or change the title.`)
  }

  tests.push(blob)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests))
  return blob
}

/**
 * Delete a test by title.
 */
export function deleteTest(title) {
  const tests = getAllTests()
  const filtered = tests.filter(t => t.test.title !== title)
  if (filtered.length === tests.length) {
    throw new Error(`Test "${title}" not found.`)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

/**
 * Replace a test (for re-import).
 */
export function replaceTest(oldTitle, newBlob) {
  const tests = getAllTests()
  const index = tests.findIndex(t => t.test.title === oldTitle)
  if (index === -1) {
    throw new Error(`Test "${oldTitle}" not found.`)
  }
  tests[index] = newBlob
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests))
  return newBlob
}

/**
 * Get summary info for all tests.
 */
export function getTestSummaries() {
  return getAllTests().map(blob => ({
    title: blob.test.title,
    description: blob.test.description || "",
    exercise_count: blob.test.exercises.length,
    question_count: blob.test.exercises.reduce((sum, ex) => sum + ex.questions.length, 0),
    time_limit: blob.test.time_limit_minutes || 45
  }))
}
