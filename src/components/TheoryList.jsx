import { useState, useEffect, useCallback } from 'react'
import { getAllTheories, deleteTheory, renameTheory } from '../lib/theoryStorage'
import TheoryViewer from './TheoryViewer'
import heroImg from '../assets/hero.png'

export default function TheoryList({ onGoAdmin, onBack, isAdmin }) {
  const [theories, setTheories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTheory, setSelectedTheory] = useState(null)
  const [renamingTitle, setRenamingTitle] = useState(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameError, setRenameError] = useState("")

  const loadTheories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllTheories()
      setTheories(data)
    } catch (e) {
      console.error("Failed to load theories:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTheories()
  }, [loadTheories])

  const handleDelete = async (title) => {
    if (window.confirm(`Delete theory "${title}"? This cannot be undone.`)) {
      try {
        await deleteTheory(title)
        await loadTheories()
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
      await renameTheory(renamingTitle, renameValue.trim())
      setRenamingTitle(null)
      setRenameValue("")
      setRenameError("")
      await loadTheories()
    } catch (e) {
      setRenameError(e.message)
    }
  }

  // If viewing a theory, show the full viewer
  if (selectedTheory) {
    return (
      <div className="theory-page">
        <div className="theory-nav">
          <button className="admin-btn admin-btn-ghost" onClick={() => setSelectedTheory(null)}>
            ← Back to Theory List
          </button>
        </div>
        <TheoryViewer theory={selectedTheory} />
      </div>
    )
  }

  // Theory list view
  return (
    <div className="theory-list">
      <div className="theory-list-header">
        <h2 className="theory-list-title">📖 Theory</h2>
        <p className="theory-list-subtitle">Study grammar and vocabulary before taking tests</p>
      </div>

      {loading ? (
        <div className="theory-list-loading">
          <p>Loading theory content...</p>
        </div>
      ) : theories.length === 0 ? (
        <div className="theory-list-empty">
          <img src={heroImg} alt="Kangaroo" className="empty-kangaroo-img" />
          <h3>No theory content yet</h3>
          <p>Import theory content from the admin panel to get started.</p>
          <button className="admin-btn admin-btn-primary" onClick={onGoAdmin}>
            Go to Admin
          </button>
        </div>
      ) : (
        <div className="theory-grid">
          {theories.map((blob, index) => (
            <div
              key={blob.theory.title}
              className="theory-card"
              style={{ "--delay": `${index * 0.08}s` }}
            >
              <div className="theory-card-glow" />
              <div className="theory-card-content">
                {renamingTitle === blob.theory.title ? (
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
                    <h3 className="theory-card-title">{blob.theory.title}</h3>
                    {blob.theory.subtitle && (
                      <p className="theory-card-desc">{blob.theory.subtitle}</p>
                    )}
                    <div className="theory-card-meta">
                      <span>{blob.theory.sections?.length || 0} sections</span>
                    </div>
                    <div className="theory-card-actions">
                      <button
                        className="theory-card-btn theory-card-read"
                        onClick={() => setSelectedTheory(blob)}
                      >
                        Read →
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            className="theory-card-btn theory-card-rename"
                            onClick={() => startRename(blob.theory.title)}
                          >
                            Rename
                          </button>
                          <button
                            className="theory-card-btn theory-card-delete"
                            onClick={() => handleDelete(blob.theory.title)}
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
