import { useState, useEffect } from 'react'
import { saveTheory, theoryExists, replaceTheory } from '../lib/theoryStorage'
import { THEORY_PROMPT } from '../lib/theoryPrompt'
import TheoryViewer from './TheoryViewer'
import heroImg from '../assets/hero.png'

const STEPS = {
  PROMPT: "prompt",
  PASTE: "paste",
  VALIDATE: "validate",
  PREVIEW: "preview",
  IMPORT: "import"
}

export default function AdminTheoryImport({ onImportComplete, onBack, reimportTitle }) {
  const [step, setStep] = useState(STEPS.PROMPT)
  const [blobText, setBlobText] = useState("")
  const [parsedBlob, setParsedBlob] = useState(null)
  const [errors, setErrors] = useState([])
  const [importSuccess, setImportSuccess] = useState(false)
  const [importing, setImporting] = useState(false)
  const [parseError, setParseError] = useState("")
  const [theoryTitle, setTheoryTitle] = useState("")
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [pendingOverwriteTitle, setPendingOverwriteTitle] = useState("")

  useEffect(() => {
    if (reimportTitle) {
      setTheoryTitle(reimportTitle)
      setStep(STEPS.PASTE)
    }
  }, [reimportTitle])

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(THEORY_PROMPT)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = THEORY_PROMPT
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setStep(STEPS.PASTE)
  }

  const handleParse = () => {
    setParseError("")
    setErrors([])
    setParsedBlob(null)

    if (!blobText.trim()) {
      setParseError("Please paste the AI output first.")
      return
    }

    try {
      const parsed = JSON.parse(blobText)
      setParsedBlob(parsed)
      setTheoryTitle(parsed.theory?.title || "")
      setStep(STEPS.VALIDATE)
    } catch (e) {
      setParseError(`Invalid JSON: ${e.message}`)
    }
  }

  const handleValidate = () => {
    if (!parsedBlob) return
    const errs = []

    if (parsedBlob.schema_version !== "1.0") {
      errs.push(`Invalid schema_version: "${parsedBlob.schema_version}". Expected "1.0".`)
    }
    if (!parsedBlob.theory || typeof parsedBlob.theory !== "object") {
      errs.push("Missing or invalid 'theory' object.")
    } else {
      if (!parsedBlob.theory.title || typeof parsedBlob.theory.title !== "string") {
        errs.push("theory.title is required and must be a string.")
      }
      if (!Array.isArray(parsedBlob.theory.sections) || parsedBlob.theory.sections.length === 0) {
        errs.push("theory.sections must be a non-empty array.")
      } else {
        parsedBlob.theory.sections.forEach((section, i) => {
          if (!section.title) {
            errs.push(`Section ${i + 1}: 'title' is required.`)
          }
          if (!Array.isArray(section.blocks)) {
            errs.push(`Section ${i + 1}: 'blocks' must be an array.`)
          }
        })
      }
    }

    setErrors(errs)
    if (errs.length === 0) {
      setStep(STEPS.PREVIEW)
    }
  }

  const handleImport = async () => {
    if (!parsedBlob) return

    const updatedBlob = {
      ...parsedBlob,
      theory: { ...parsedBlob.theory, title: theoryTitle.trim() || parsedBlob.theory.title }
    }
    setParsedBlob(updatedBlob)

    const titleToSave = updatedBlob.theory.title

    const exists = await theoryExists(titleToSave)
    if (exists) {
      setPendingOverwriteTitle(titleToSave)
      setShowOverwriteConfirm(true)
      return
    }

    setImporting(true)
    try {
      await saveTheory(updatedBlob)
      setImportSuccess(true)
      setStep(STEPS.IMPORT)
    } catch (e) {
      setErrors([e.message])
    } finally {
      setImporting(false)
    }
  }

  const handleOverwriteConfirm = async () => {
    setShowOverwriteConfirm(false)
    setImporting(true)
    try {
      await replaceTheory(pendingOverwriteTitle, parsedBlob)
      setImportSuccess(true)
      setStep(STEPS.IMPORT)
    } catch (e) {
      setErrors([e.message])
    } finally {
      setImporting(false)
    }
  }

  const handleOverwriteCancel = () => {
    setShowOverwriteConfirm(false)
    setPendingOverwriteTitle("")
  }

  const handleClear = () => {
    setBlobText("")
    setParsedBlob(null)
    setErrors([])
    setParseError("")
    setImportSuccess(false)
    setTheoryTitle("")
    setShowOverwriteConfirm(false)
    setPendingOverwriteTitle("")
    setStep(STEPS.PASTE)
  }

  return (
    <div className="admin-import">
      {/* Step Indicator */}
      <div className="admin-steps">
        {[
          { key: STEPS.PROMPT, label: "1. Copy Prompt" },
          { key: STEPS.PASTE, label: "2. Paste Blob" },
          { key: STEPS.VALIDATE, label: "3. Validate" },
          { key: STEPS.PREVIEW, label: "4. Preview" },
          { key: STEPS.IMPORT, label: "5. Import" }
        ].map((s) => {
          const stepOrder = [STEPS.PROMPT, STEPS.PASTE, STEPS.VALIDATE, STEPS.PREVIEW, STEPS.IMPORT]
          const currentIdx = stepOrder.indexOf(step)
          const sIdx = stepOrder.indexOf(s.key)
          return (
            <div
              key={s.key}
              className={`admin-step ${step === s.key ? "admin-step-active" : ""} ${sIdx < currentIdx ? "admin-step-done" : ""}`}
            >
              {s.label}
            </div>
          )
        })}
      </div>

      <div className="admin-content">
        {/* STEP 1: Copy Prompt */}
        {step === STEPS.PROMPT && (
          <div className="admin-panel">
            <h2 className="admin-panel-title">📖 Theory Conversion Prompt</h2>
            <p className="admin-panel-desc">
              Copy this prompt, then paste it together with your raw theory/grammar page into an external AI like Gemini, ChatGPT, or Claude.
            </p>
            <div className="prompt-display">
              <textarea
                className="prompt-textarea"
                readOnly
                value={THEORY_PROMPT}
              />
            </div>
            <div className="admin-actions">
              <button className="admin-btn admin-btn-primary" onClick={handleCopyPrompt}>
                📋 Copy Prompt & Continue
              </button>
              <button className="admin-btn admin-btn-ghost" onClick={onBack}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Paste AI Output */}
        {step === STEPS.PASTE && (
          <div className="admin-panel">
            <h2 className="admin-panel-title">📄 Paste AI Output</h2>
            <p className="admin-panel-desc">
              Paste the JSON blob that the external AI generated. It should start with <code>{'{"schema_version": "1.0"'}</code>
            </p>

            <div className="test-title-edit">
              <label className="test-title-label">Theory Name:</label>
              <input
                type="text"
                className="test-title-input"
                value={theoryTitle}
                onChange={(e) => setTheoryTitle(e.target.value)}
                placeholder="Enter the name for this theory..."
              />
            </div>

            <textarea
              className="blob-textarea"
              value={blobText}
              onChange={(e) => setBlobText(e.target.value)}
              placeholder='Paste the converted theory JSON here...'
              rows={20}
            />
            {parseError && (
              <div className="admin-error">{parseError}</div>
            )}
            <div className="admin-actions">
              <button className="admin-btn admin-btn-primary" onClick={handleParse}>
                Validate JSON →
              </button>
              <button className="admin-btn admin-btn-ghost" onClick={handleClear}>
                Clear
              </button>
              <button className="admin-btn admin-btn-ghost" onClick={() => setStep(STEPS.PROMPT)}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Validation */}
        {step === STEPS.VALIDATE && (
          <div className="admin-panel">
            <h2 className="admin-panel-title">✅ Validation</h2>
            {errors.length === 0 ? (
              <div className="admin-success">
                <div className="admin-success-icon">✓</div>
                <p>Validation passed! The theory content is valid.</p>
                {parsedBlob.theory && (
                  <div className="admin-test-summary">
                    <strong>{parsedBlob.theory.title}</strong>
                    <span>{parsedBlob.theory.sections?.length || 0} sections</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="admin-errors">
                <p className="admin-errors-title">Validation failed with {errors.length} error(s):</p>
                <ul>
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="admin-actions">
              {errors.length === 0 && (
                <button className="admin-btn admin-btn-primary" onClick={() => setStep(STEPS.PREVIEW)}>
                  Preview →
                </button>
              )}
              <button className="admin-btn admin-btn-ghost" onClick={() => setStep(STEPS.PASTE)}>
                ← Edit Blob
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Preview */}
        {step === STEPS.PREVIEW && parsedBlob && (
          <div className="admin-panel admin-panel-wide">
            <h2 className="admin-panel-title">👁️ Preview</h2>
            <p className="admin-panel-desc">
              This is how students will see the theory content. Review carefully before importing.
            </p>

            <div className="test-title-edit">
              <label className="test-title-label">Theory Name:</label>
              <input
                type="text"
                className="test-title-input"
                value={theoryTitle}
                onChange={(e) => setTheoryTitle(e.target.value)}
                placeholder="Enter theory name..."
              />
            </div>

            <div className="admin-preview theory-preview-container">
              <TheoryViewer theory={parsedBlob} />
            </div>

            {showOverwriteConfirm && (
              <div className="admin-overwrite-confirm">
                <p>A theory named <strong>"{pendingOverwriteTitle}"</strong> already exists.</p>
                <p>Do you want to replace it with this new version?</p>
                <div className="admin-actions">
                  <button className="admin-btn admin-btn-primary" onClick={handleOverwriteConfirm} disabled={importing}>
                    {importing ? "Replacing..." : "Yes, Replace It"}
                  </button>
                  <button className="admin-btn admin-btn-ghost" onClick={handleOverwriteCancel}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="admin-actions">
              {!showOverwriteConfirm && (
                <button className="admin-btn admin-btn-primary" onClick={handleImport} disabled={importing || !theoryTitle.trim()}>
                  {importing ? "Importing..." : "🎉 Import Theory"}
                </button>
              )}
              <button className="admin-btn admin-btn-ghost" onClick={() => setStep(STEPS.PASTE)}>
                ← Edit Blob
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Import Complete */}
        {step === STEPS.IMPORT && importSuccess && (
          <div className="admin-panel">
            <h2 className="admin-panel-title">🎉 Import Complete!</h2>
            <div className="admin-success">
              <div className="admin-success-icon"><img src={heroImg} alt="Kangaroo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} /></div>
              <p>Theory <strong>{theoryTitle || parsedBlob.theory.title}</strong> has been imported successfully!</p>
              <p className="admin-success-sub">Students can now read this theory content.</p>
            </div>
            <div className="admin-actions">
              <button className="admin-btn admin-btn-primary" onClick={onImportComplete}>
                View Theory List
              </button>
              <button className="admin-btn admin-btn-ghost" onClick={() => {
                setBlobText("")
                setParsedBlob(null)
                setErrors([])
                setImportSuccess(false)
                setTheoryTitle("")
                setShowOverwriteConfirm(false)
                setPendingOverwriteTitle("")
                setStep(STEPS.PROMPT)
              }}>
                Import Another Theory
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
