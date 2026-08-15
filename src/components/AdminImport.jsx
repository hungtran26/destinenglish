import { useState } from 'react'
import { validateImportBlob } from '../lib/validator'
import { saveTest } from '../lib/testStorage'
import { CONVERSION_PROMPT } from '../lib/conversionPrompt'
import ExerciseRenderer from './ExerciseRenderer'

const STEPS = {
  PROMPT: "prompt",
  PASTE: "paste",
  VALIDATE: "validate",
  PREVIEW: "preview",
  IMPORT: "import"
}

export default function AdminImport({ onImportComplete, onBack }) {
  const [step, setStep] = useState(STEPS.PROMPT)
  const [blobText, setBlobText] = useState("")
  const [parsedBlob, setParsedBlob] = useState(null)
  const [errors, setErrors] = useState([])
  const [importSuccess, setImportSuccess] = useState(false)
  const [importing, setImporting] = useState(false)
  const [parseError, setParseError] = useState("")

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(CONVERSION_PROMPT)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = CONVERSION_PROMPT
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
      setStep(STEPS.VALIDATE)
    } catch (e) {
      setParseError(`Invalid JSON: ${e.message}`)
    }
  }

  const handleValidate = () => {
    if (!parsedBlob) return
    const result = validateImportBlob(parsedBlob)
    setErrors(result.errors)
    if (result.valid) {
      setStep(STEPS.PREVIEW)
    }
  }

  const handleImport = async () => {
    if (!parsedBlob) return
    setImporting(true)
    try {
      await saveTest(parsedBlob)
      setImportSuccess(true)
      setStep(STEPS.IMPORT)
    } catch (e) {
      setErrors([e.message])
    } finally {
      setImporting(false)
    }
  }

  const handleClear = () => {
    setBlobText("")
    setParsedBlob(null)
    setErrors([])
    setParseError("")
    setImportSuccess(false)
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
            <h2 className="admin-panel-title">📋 Conversion Prompt</h2>
            <p className="admin-panel-desc">
              Copy this prompt, then paste it together with your raw test (and answer key) into an external AI like Gemini, ChatGPT, or Claude.
            </p>
            <div className="prompt-display">
              <textarea
                className="prompt-textarea"
                readOnly
                value={CONVERSION_PROMPT}
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
              Paste the JSON blob that the external AI generated. It should start with <code>{'{"schema_version": "1.1"'}</code>
            </p>
            <textarea
              className="blob-textarea"
              value={blobText}
              onChange={(e) => setBlobText(e.target.value)}
              placeholder='Paste the converted test JSON here...'
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
                <p>Validation passed! The test schema is valid.</p>
                {parsedBlob.test && (
                  <div className="admin-test-summary">
                    <strong>{parsedBlob.test.title}</strong>
                    <span>{parsedBlob.test.exercises.length} exercises</span>
                    <span>
                      {parsedBlob.test.exercises.reduce((s, ex) => s + ex.questions.length, 0)} questions
                    </span>
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
                  Preview Test →
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
              This is how students will see the test. Review carefully before importing.
            </p>
            <div className="admin-preview">
              <div className="admin-preview-header">
                <h3>{parsedBlob.test.title}</h3>
                {parsedBlob.test.description && <p>{parsedBlob.test.description}</p>}
                {parsedBlob.test.time_limit_minutes && (
                  <span className="admin-preview-time">⏱ {parsedBlob.test.time_limit_minutes} minutes</span>
                )}
              </div>
              {parsedBlob.test.exercises.map((exercise) => (
                <ExerciseRenderer
                  key={exercise.id}
                  exercise={exercise}
                  answers={{}}
                  onAnswer={() => {}}
                  showResult={false}
                  compact={false}
                />
              ))}
            </div>
            <div className="admin-actions">
              <button className="admin-btn admin-btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : "🎉 Import Test"}
              </button>
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
              <div className="admin-success-icon">🦘</div>
              <p>Test <strong>{parsedBlob.test.title}</strong> has been imported successfully!</p>
              <p className="admin-success-sub">Students can now take this test.</p>
            </div>
            <div className="admin-actions">
              <button className="admin-btn admin-btn-primary" onClick={onImportComplete}>
                View Test List
              </button>
              <button className="admin-btn admin-btn-ghost" onClick={() => {
                setBlobText("")
                setParsedBlob(null)
                setErrors([])
                setImportSuccess(false)
                setStep(STEPS.PROMPT)
              }}>
                Import Another Test
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
