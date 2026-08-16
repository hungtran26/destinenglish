import { useState, useRef, useCallback, useEffect } from 'react'
import { validateImportBlob } from '../lib/validator'
import { saveTest, testExists, replaceTest } from '../lib/testStorage'
import { CONVERSION_PROMPT } from '../lib/conversionPrompt'
import { detectImagePlaceholders, uploadImage, replacePlaceholders } from '../lib/imageStorage'
import ExerciseRenderer from './ExerciseRenderer'
import heroImg from '../assets/hero.png'

const STEPS = {
  PROMPT: "prompt",
  PASTE: "paste",
  VALIDATE: "validate",
  IMAGES: "images",
  PREVIEW: "preview",
  IMPORT: "import"
}

export default function AdminImport({ onImportComplete, onBack, reimportTitle }) {
  const [step, setStep] = useState(STEPS.PROMPT)
  const [blobText, setBlobText] = useState("")
  const [parsedBlob, setParsedBlob] = useState(null)
  const [errors, setErrors] = useState([])
  const [importSuccess, setImportSuccess] = useState(false)
  const [importing, setImporting] = useState(false)
  const [parseError, setParseError] = useState("")

  // Editable test title
  const [testTitle, setTestTitle] = useState("")

  // Overwrite confirmation
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [pendingOverwriteTitle, setPendingOverwriteTitle] = useState("")

  // Image state
  const [detectedImages, setDetectedImages] = useState([])
  const [imageFiles, setImageFiles] = useState({})
  const [imagePreviews, setImagePreviews] = useState({})
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageError, setImageError] = useState("")
  const fileInputRefs = useRef({})

  // When reimportTitle is set, skip to paste step with title pre-filled
  useEffect(() => {
    if (reimportTitle) {
      setTestTitle(reimportTitle)
      setStep(STEPS.PASTE)
    }
  }, [reimportTitle])

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
      setTestTitle(parsed.test?.title || "")
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
      // Detect image placeholders
      const images = detectImagePlaceholders(parsedBlob)
      setDetectedImages(images)
      if (images.length > 0) {
        setStep(STEPS.IMAGES)
      } else {
        setStep(STEPS.PREVIEW)
      }
    }
  }

  const handleImageSelect = (imageNum, file) => {
    setImageError("")
    const url = URL.createObjectURL(file)
    setImageFiles(prev => ({ ...prev, [imageNum]: file }))
    setImagePreviews(prev => ({ ...prev, [imageNum]: url }))
  }

  const handleImageRemove = (imageNum) => {
    if (imagePreviews[imageNum]) {
      URL.revokeObjectURL(imagePreviews[imageNum])
    }
    setImageFiles(prev => {
      const next = { ...prev }
      delete next[imageNum]
      return next
    })
    setImagePreviews(prev => {
      const next = { ...prev }
      delete next[imageNum]
      return next
    })
  }

  const handlePasteImage = useCallback((imageNum, e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          handleImageSelect(imageNum, file)
          e.preventDefault()
          break
        }
      }
    }
  }, [])

  const handleProceedWithImages = async () => {
    setImageError("")

    // Check all required images are uploaded
    const missing = detectedImages.filter(n => !imageFiles[n])
    if (missing.length > 0) {
      setImageError(`Missing image(s): ${missing.map(n => `IMAGE ${n}`).join(", ")}. Upload all images before proceeding.`)
      return
    }

    setUploadingImages(true)
    try {
      const title = parsedBlob.test.title
      const urlMap = {}

      for (const num of detectedImages) {
        const file = imageFiles[num]
        const url = await uploadImage(file, title, num)
        urlMap[num] = url
      }

      // Replace placeholders in the blob
      const updatedBlob = replacePlaceholders(parsedBlob, urlMap)
      setParsedBlob(updatedBlob)
      setStep(STEPS.PREVIEW)
    } catch (e) {
      setImageError(`Upload failed: ${e.message}`)
    } finally {
      setUploadingImages(false)
    }
  }

  const handleSkipImages = () => {
    setStep(STEPS.PREVIEW)
  }

  const handleImport = async () => {
    if (!parsedBlob) return

    // Apply the edited title
    const updatedBlob = {
      ...parsedBlob,
      test: { ...parsedBlob.test, title: testTitle.trim() || parsedBlob.test.title }
    }
    setParsedBlob(updatedBlob)

    const titleToSave = updatedBlob.test.title

    // Check if test with this title already exists
    const exists = await testExists(titleToSave)
    if (exists) {
      setPendingOverwriteTitle(titleToSave)
      setShowOverwriteConfirm(true)
      return
    }

    setImporting(true)
    try {
      await saveTest(updatedBlob)
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
      await replaceTest(pendingOverwriteTitle, parsedBlob)
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
    setTestTitle("")
    setShowOverwriteConfirm(false)
    setPendingOverwriteTitle("")
    setDetectedImages([])
    setImageFiles({})
    setImagePreviews({})
    setImageError("")
    setStep(STEPS.PASTE)
  }

  const allImagesUploaded = detectedImages.length > 0 && detectedImages.every(n => imageFiles[n])

  return (
    <div className="admin-import">
      {/* Step Indicator */}
      <div className="admin-steps">
        {[
          { key: STEPS.PROMPT, label: "1. Copy Prompt" },
          { key: STEPS.PASTE, label: "2. Paste Blob" },
          { key: STEPS.VALIDATE, label: "3. Validate" },
          ...(detectedImages.length > 0 ? [{ key: STEPS.IMAGES, label: "4. Images" }] : []),
          { key: STEPS.PREVIEW, label: detectedImages.length > 0 ? "5. Preview" : "4. Preview" },
          { key: STEPS.IMPORT, label: detectedImages.length > 0 ? "6. Import" : "5. Import" }
        ].map((s) => {
          const stepOrder = [STEPS.PROMPT, STEPS.PASTE, STEPS.VALIDATE, STEPS.IMAGES, STEPS.PREVIEW, STEPS.IMPORT]
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

            <div className="test-title-edit">
              <label className="test-title-label">Test Name:</label>
              <input
                type="text"
                className="test-title-input"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Enter the name for this test..."
              />
            </div>

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
                <button className="admin-btn admin-btn-primary" onClick={handleValidate}>
                  Continue →
                </button>
              )}
              <button className="admin-btn admin-btn-ghost" onClick={() => setStep(STEPS.PASTE)}>
                ← Edit Blob
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Image Upload */}
        {step === STEPS.IMAGES && (
          <div className="admin-panel">
            <h2 className="admin-panel-title">🖼️ Image Upload</h2>
            <p className="admin-panel-desc">
              {detectedImages.length} image placeholder(s) detected in the blob. Upload an image for each placeholder.
            </p>

            <div className="image-upload-list">
              {detectedImages.map(num => (
                <div key={num} className="image-upload-slot">
                  <div className="image-slot-header">
                    <span className="image-slot-label">IMAGE {num}</span>
                    {imageFiles[num] && (
                      <span className="image-slot-status uploaded">Uploaded</span>
                    )}
                  </div>

                  {imagePreviews[num] ? (
                    <div className="image-preview-container">
                      <img src={imagePreviews[num]} alt={`IMAGE ${num}`} className="image-preview" />
                      <div className="image-preview-actions">
                        <button
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          onClick={() => fileInputRefs.current[num]?.click()}
                        >
                          Replace
                        </button>
                        <button
                          className="admin-btn admin-btn-ghost admin-btn-sm admin-btn-danger"
                          onClick={() => handleImageRemove(num)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="image-dropzone"
                      onClick={() => fileInputRefs.current[num]?.click()}
                      onPaste={(e) => handlePasteImage(num, e)}
                      tabIndex={0}
                    >
                      <div className="dropzone-icon">📷</div>
                      <p className="dropzone-text">Click to upload or paste image</p>
                      <p className="dropzone-hint">PNG, JPG, WebP</p>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={el => fileInputRefs.current[num] = el}
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageSelect(num, file)
                      e.target.value = ""
                    }}
                  />
                </div>
              ))}
            </div>

            {imageError && (
              <div className="admin-error">{imageError}</div>
            )}

            <div className="admin-actions">
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleProceedWithImages}
                disabled={uploadingImages || !allImagesUploaded}
              >
                {uploadingImages ? "Uploading..." : allImagesUploaded ? "Upload & Continue →" : "Upload all images to continue"}
              </button>
              <button className="admin-btn admin-btn-ghost" onClick={handleSkipImages}>
                Skip (no images)
              </button>
              <button className="admin-btn admin-btn-ghost" onClick={() => setStep(STEPS.PASTE)}>
                ← Edit Blob
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Preview */}
        {step === STEPS.PREVIEW && parsedBlob && (
          <div className="admin-panel admin-panel-wide">
            <h2 className="admin-panel-title">👁️ Preview</h2>
            <p className="admin-panel-desc">
              This is how students will see the test. Review carefully before importing.
            </p>

            <div className="test-title-edit">
              <label className="test-title-label">Test Name:</label>
              <input
                type="text"
                className="test-title-input"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Enter test name..."
              />
            </div>

            <div className="admin-preview">
              <div className="admin-preview-header">
                <h3>{testTitle || parsedBlob.test.title}</h3>
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

            {/* Overwrite Confirmation */}
            {showOverwriteConfirm && (
              <div className="admin-overwrite-confirm">
                <p>A test named <strong>"{pendingOverwriteTitle}"</strong> already exists.</p>
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
                <button className="admin-btn admin-btn-primary" onClick={handleImport} disabled={importing || !testTitle.trim()}>
                  {importing ? "Importing..." : "🎉 Import Test"}
                </button>
              )}
              <button className="admin-btn admin-btn-ghost" onClick={() => setStep(STEPS.PASTE)}>
                ← Edit Blob
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Import Complete */}
        {step === STEPS.IMPORT && importSuccess && (
          <div className="admin-panel">
            <h2 className="admin-panel-title">🎉 Import Complete!</h2>
            <div className="admin-success">
              <div className="admin-success-icon"><img src={heroImg} alt="Kangaroo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} /></div>
              <p>Test <strong>{testTitle || parsedBlob.test.title}</strong> has been imported successfully!</p>
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
                setTestTitle("")
                setShowOverwriteConfirm(false)
                setPendingOverwriteTitle("")
                setDetectedImages([])
                setImageFiles({})
                setImagePreviews({})
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
