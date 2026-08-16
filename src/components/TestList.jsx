import { useState, useEffect, useCallback } from 'react'
import { getAllTests, deleteTest } from '../lib/testStorage'
import heroImg from '../assets/hero.png'

/**
 * TestList — displays all available tests and allows selecting one
 *
 * Shows each test with:
 * - Title
 * - Description
 * - Number of exercises
 * - Number of questions
 * - Time limit
 * - Start / Delete buttons
 */
export default function TestList({ onSelectTest, onGoAdmin }) {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)

  const loadTests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllTests()
      setTests(data)
    } catch (e) {
      console.error("Failed to load tests:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTests()
  }, [loadTests])

  const handleDelete = async (title) => {
    if (window.confirm(`Delete test "${title}"? This cannot be undone.`)) {
      try {
        await deleteTest(title)
        await loadTests()
      } catch (e) {
        alert("Delete failed: " + e.message)
      }
    }
  }

  if (loading) {
    return (
      <div className="test-list">
        <div className="test-list-header">
          <h2 className="test-list-title">Available Tests</h2>
          <p className="test-list-subtitle">Loading tests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="test-list">
      <div className="test-list-header">
        <h2 className="test-list-title">Available Tests</h2>
        <p className="test-list-subtitle">Choose a test to begin</p>
      </div>

      {tests.length === 0 ? (
        <div className="test-list-empty">
          <img src={heroImg} alt="Kangaroo" className="empty-kangaroo-img" />
          <h3>No tests yet</h3>
          <p>Import a test from the admin panel to get started.</p>
          <button className="admin-btn admin-btn-primary" onClick={onGoAdmin}>
            Go to Admin
          </button>
        </div>
      ) : (
        <div className="test-list-grid">
          {tests.map((blob, index) => (
            <div
              key={blob.test.title}
              className="test-list-card"
              style={{ "--delay": `${index * 0.08}s` }}
            >
              <div className="test-card-glow" />
              <div className="test-card-content">
                <h3 className="test-card-title">{blob.test.title}</h3>
                {blob.test.description && (
                  <p className="test-card-desc">{blob.test.description}</p>
                )}
                <div className="test-card-meta">
                  <span>{blob.test.exercises.length} exercises</span>
                  <span>
                    {blob.test.exercises.reduce((s, ex) => s + ex.questions.length, 0)} questions
                  </span>
                  <span>⏱ {blob.test.time_limit_minutes || 45} min</span>
                </div>
                <div className="test-card-actions">
                  <button
                    className="test-card-btn test-card-start"
                    onClick={() => onSelectTest(blob)}
                  >
                    Start Test →
                  </button>
                  <button
                    className="test-card-btn test-card-delete"
                    onClick={() => handleDelete(blob.test.title)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
