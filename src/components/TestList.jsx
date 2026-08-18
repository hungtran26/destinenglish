import { useState, useEffect, useCallback } from 'react'
import { getAllTests, deleteTest, renameTest } from '../lib/testStorage'
import heroImg from '../assets/hero.png'

export default function TestList({ onSelectTest, onGoAdmin, onReimport, isAdmin }) {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [renamingTitle, setRenamingTitle] = useState(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameError, setRenameError] = useState("")

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

  const startRename = (title) => {
    setRenamingTitle(title)
    setRenameValue(title)
    setRenameError("")
  }

  const cancelRename = () => {
    setRenamingTitle(null)
    setRenameValue("")
    setRenameError("")
  }

  const confirmRename = async () => {
    if (!renameValue.trim()) {
      setRenameError("Name cannot be empty.")
      return
    }
    try {
      await renameTest(renamingTitle, renameValue.trim())
      setRenamingTitle(null)
      setRenameValue("")
      setRenameError("")
      await loadTests()
    } catch (e) {
      setRenameError(e.message)
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
                {renamingTitle === blob.test.title ? (
                  <div className="rename-inline">
                    <input
                      type="text"
                      className="rename-input"
                      value={renameValue}
                      onChange={(e) => { setRenameValue(e.target.value); setRenameError("") }}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") cancelRename() }}
                      autoFocus
                    />
                    {renameError && <span className="rename-error">{renameError}</span>}
                    <div className="rename-actions">
                      <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={confirmRename}>Save</button>
                      <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={cancelRename}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="test-card-title">{blob.test.title}</h3>
                    {blob.test.description && (
                      <p className="test-card-desc">{blob.test.description}</p>
                    )}
                    <div className="test-card-meta">
                      <span>{blob.test.exercises.length} exercises</span>
                      <span>
                        {blob.test.exercises.reduce((s, ex) => s + ex.questions.length, 0)} questions
                      </span>
                      <span>⏱ {blob.test.exercises.reduce((s, ex) => s + ex.questions.length, 0)} min</span>
                    </div>
                    <div className="test-card-actions">
                      <button
                        className="test-card-btn test-card-start"
                        onClick={() => onSelectTest(blob)}
                      >
                        Start Test →
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            className="test-card-btn test-card-rename"
                            onClick={() => startRename(blob.test.title)}
                          >
                            Rename
                          </button>
                          <button
                            className="test-card-btn test-card-reimport"
                            onClick={() => onReimport && onReimport(blob.test.title)}
                          >
                            Re-import
                          </button>
                          <button
                            className="test-card-btn test-card-delete"
                            onClick={() => handleDelete(blob.test.title)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
