import { useState, useRef, useCallback, useEffect } from 'react'

// ─────────────────────────────────────────
// FormattedText Renderer
// ─────────────────────────────────────────

/**
 * Renders a FormattedText value (string or segments array).
 */
function FormattedTextDisplay({ value, className }) {
  if (!value) return null

  // Plain string
  if (typeof value === "string") {
    return <span className={className}>{value}</span>
  }

  // Direct segments array
  if (Array.isArray(value)) {
    return (
      <span className={className}>
        {value.map((seg, i) => {
          let text = seg.text || ""
          if (seg.bold) text = <strong key={i}>{text}</strong>
          if (seg.italic) text = <em key={i}>{text}</em>
          if (seg.underline) text = <u key={i}>{text}</u>
          return <span key={i}>{text}</span>
        })}
      </span>
    )
  }

  // Wrapped format: { segments: [...] }
  if (value.segments && Array.isArray(value.segments)) {
    return (
      <span className={className}>
        {value.segments.map((seg, i) => {
          let text = seg.text || ""
          if (seg.bold) text = <strong key={i}>{text}</strong>
          if (seg.italic) text = <em key={i}>{text}</em>
          if (seg.underline) text = <u key={i}>{text}</u>
          return <span key={i}>{text}</span>
        })}
      </span>
    )
  }

  return <span className={className}>{String(value)}</span>
}

/**
 * Get plain text from a FormattedText value.
 */
function toPlainText(ft) {
  if (typeof ft === "string") return ft
  if (Array.isArray(ft)) return ft.map(s => s.text || "").join("")
  if (ft && ft.segments && Array.isArray(ft.segments)) return ft.segments.map(s => s.text || "").join("")
  return String(ft || "")
}

// ─────────────────────────────────────────
// ContentBlock
// ─────────────────────────────────────────

function ContentBlock({ block }) {
  switch (block.type) {
    case "text":
      return <p className="cb-text"><FormattedTextDisplay value={block.value} /></p>

    case "image":
      return (
        <div className="cb-image">
          <img src={block.src} alt={block.alt || ""} />
          {block.alt && <span className="cb-image-caption">{block.alt}</span>}
        </div>
      )

    case "example":
      return (
        <div className="cb-example">
          <span className="cb-example-label">Example:</span>{" "}
          <FormattedTextDisplay value={block.value} />
        </div>
      )

    case "word_bank":
      return (
        <div className="cb-word-bank">
          <span className="cb-word-bank-label">Word Bank:</span>
          <div className="cb-word-bank-words">
            {block.words.map((w, i) => (
              <span key={i} className="cb-word">{w}</span>
            ))}
          </div>
        </div>
      )

    case "table":
      return (
        <div className="cb-table">
          <table>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    default:
      return null
  }
}

// ─────────────────────────────────────────
// Question Number Display
// ─────────────────────────────────────────

/**
 * Get the display number for a question.
 * Uses question.number if set, otherwise falls back to question.id.
 */
function getQuestionNumber(question) {
  if (question.number !== undefined && question.number !== null) {
    return question.number
  }
  return question.id
}

// ─────────────────────────────────────────
// FillBlankQuestion
// ─────────────────────────────────────────

function FillBlankQuestion({ question, exerciseId, answer, onAnswer, showResult }) {
  const answerKey = typeof question.answer === "object" && question.answer !== null
    ? question.answer
    : { accepted: [question.answer] }
  const accepted = answerKey.accepted || []

  const promptText = toPlainText(question.prompt)

  // Split by ___ patterns and render inputs between them
  const parts = promptText.split(/___+/)

  return (
    <div className="q-fill-blank">
      <div className="q-prompt">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                className={`q-blank-input ${showResult
                  ? (answer && accepted.some(a => a.toLowerCase().trim() === String(answer).toLowerCase().trim())
                    ? "blank-correct" : "blank-wrong")
                  : ""}`}
                value={answer || ""}
                onChange={(e) => onAnswer(e.target.value)}
                placeholder="..."
                disabled={showResult}
              />
            )}
          </span>
        ))}
      </div>
      {showResult && !answer && (
        <div className="q-answer-reveal">
          Correct answer: <strong>{accepted[0]}</strong>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// MultipleChoiceQuestion
// ─────────────────────────────────────────

function MultipleChoiceQuestion({ question, exerciseId, answer, onAnswer, showResult }) {
  return (
    <div className="q-multiple-choice">
      <div className="q-prompt"><FormattedTextDisplay value={question.prompt} /></div>
      <div className="q-options">
        {question.options.map((opt, i) => {
          const isSelected = answer === i
          const isCorrect = question.answer === i
          let className = "q-option"
          if (isSelected) className += " q-option-selected"
          if (showResult && isCorrect) className += " q-option-correct"
          if (showResult && isSelected && !isCorrect) className += " q-option-wrong"

          return (
            <button
              key={i}
              className={className}
              onClick={() => !showResult && onAnswer(i)}
              disabled={showResult}
            >
              <span className="q-option-letter">{String.fromCharCode(65 + i)}</span>
              <span className="q-option-text"><FormattedTextDisplay value={opt} /></span>
              {showResult && isCorrect && <span className="q-option-check">✓</span>}
              {showResult && isSelected && !isCorrect && <span className="q-option-x">✗</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// RewriteQuestion
// ─────────────────────────────────────────

function RewriteQuestion({ question, exerciseId, answer, onAnswer, showResult }) {
  const answerKey = typeof question.answer === "object" && question.answer !== null
    ? question.answer
    : { accepted: [question.answer] }
  const accepted = answerKey.accepted || []

  return (
    <div className="q-rewrite">
      <div className="q-prompt q-rewrite-prompt">
        <FormattedTextDisplay value={question.prompt} />
      </div>
      <textarea
        className={`q-rewrite-input ${showResult
          ? (answer && accepted.some(a => a.toLowerCase().trim() === String(answer).toLowerCase().trim())
            ? "rewrite-correct" : "rewrite-wrong")
          : ""}`}
        value={answer || ""}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Write the correct sentence here..."
        rows={3}
        disabled={showResult}
      />
      {showResult && (
        <div className="q-answer-reveal">
          {answer && accepted.some(a => a.toLowerCase().trim() === String(answer).toLowerCase().trim()) ? (
            <span className="q-correct-label">✓ Correct!</span>
          ) : (
            <span>Correct answer: <strong>{accepted[0]}</strong></span>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// CircleQuestion
// ─────────────────────────────────────────

function CircleQuestion({ question, exerciseId, answer, onAnswer, showResult }) {
  return (
    <div className="q-circle">
      <div className="q-prompt"><FormattedTextDisplay value={question.prompt} /></div>
      <div className="q-options">
        {question.options.map((opt, i) => {
          const isSelected = answer === i
          const isCorrect = question.answer === i
          let className = "q-option"
          if (isSelected) className += " q-option-selected"
          if (showResult && isCorrect) className += " q-option-correct"
          if (showResult && isSelected && !isCorrect) className += " q-option-wrong"

          return (
            <button
              key={i}
              className={className}
              onClick={() => !showResult && onAnswer(i)}
              disabled={showResult}
            >
              <span className="q-option-letter">{String.fromCharCode(65 + i)}</span>
              <span className="q-option-text"><FormattedTextDisplay value={opt} /></span>
              {showResult && isCorrect && <span className="q-option-check">✓</span>}
              {showResult && isSelected && !isCorrect && <span className="q-option-x">✗</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// ErrorCorrectionTask — Interactive text selection
// ─────────────────────────────────────────

/**
 * Interactive error-correction component.
 * Student drags to select errors in the paragraph.
 * Corrections are entered in numbered fields below.
 */
function ErrorCorrectionTask({ question, exerciseId, answer, onAnswer, showResult }) {
  const paragraphRef = useRef(null)
  const [selections, setSelections] = useState([])
  const [corrections, setCorrections] = useState({})
  const [warning, setWarning] = useState("")

  const maxErrors = question.required_error_count || 10
  const sourceText = toPlainText(question.source_paragraph)

  // Restore state from answer prop
  useEffect(() => {
    if (answer && answer.selections) {
      setSelections(answer.selections)
      setCorrections(answer.corrections || {})
    }
  }, [])

  // Save state to parent whenever selections or corrections change
  const saveToParent = useCallback((sel, corr) => {
    onAnswer({
      selections: sel,
      corrections: corr
    })
  }, [onAnswer])

  // Sort selections by their position in source text, then renumber
  const sortedSelections = [...selections].sort((a, b) => a.start - b.start)

  // Check if two ranges overlap
  const rangesOverlap = (a, b) => {
    return a.start < b.end && b.start < a.end
  }

  // Handle mouse/touch selection from the paragraph
  const handleSelection = useCallback(() => {
    if (showResult) return

    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return

    const selectedText = sel.toString().trim()
    if (!selectedText || selectedText.length < 1) return

    // Find the position in the source text
    const range = sel.getRangeAt(0)

    // Calculate start offset relative to paragraph text
    const paragraph = paragraphRef.current
    if (!paragraph) return

    // Walk text nodes to find the offset
    let startOffset = 0
    let foundStart = false
    let endOffset = 0

    const walker = document.createTreeWalker(
      paragraph,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    let node
    while (node = walker.nextNode()) {
      const nodeLen = node.textContent.length

      if (!foundStart && node === range.startContainer) {
        startOffset += range.startOffset
        foundStart = true
      }

      if (node === range.endContainer) {
        endOffset = startOffset + (foundStart ? 0 : 0) + range.endOffset
        // Recalculate endOffset properly
        // We need the absolute position
        break
      }

      if (!foundStart) {
        startOffset += nodeLen
      }
    }

    // Simpler approach: use the full paragraph text and find the selection
    const fullText = paragraph.textContent || paragraph.innerText
    const selStart = fullText.indexOf(selectedText)
    if (selStart === -1) return

    const newSelection = {
      start: selStart,
      end: selStart + selectedText.length,
      text: selectedText
    }

    // Check overlap with existing selections
    const hasOverlap = sortedSelections.some(s => rangesOverlap(s, newSelection))
    if (hasOverlap) {
      setWarning("This overlaps with an existing selection.")
      setTimeout(() => setWarning(""), 3000)
      sel.removeAllRanges()
      return
    }

    // Check max limit
    if (selections.length >= maxErrors) {
      setWarning(`You have already selected the ${maxErrors} errors required for this question.`)
      setTimeout(() => setWarning(""), 3000)
      sel.removeAllRanges()
      return
    }

    const newSelections = [...selections, newSelection]
    setSelections(newSelections)
    saveToParent(newSelections, corrections)
    sel.removeAllRanges()
  }, [selections, corrections, maxErrors, showResult, sortedSelections])

  // Remove a selection by index (in sorted order)
  const removeSelection = useCallback((sortedIndex) => {
    if (showResult) return
    const sorted = [...selections].sort((a, b) => a.start - b.start)
    const target = sorted[sortedIndex]
    const newSelections = selections.filter(s => s !== target)

    // Rebuild corrections map based on new sorted order
    const newCorrections = {}
    const newSorted = [...newSelections].sort((a, b) => a.start - b.start)
    newSorted.forEach((sel, i) => {
      const oldIndex = sorted.findIndex(s => s === sel)
      if (oldIndex !== -1 && corrections[oldIndex + 1]) {
        newCorrections[i + 1] = corrections[oldIndex + 1]
      }
    })

    setSelections(newSelections)
    setCorrections(newCorrections)
    saveToParent(newSelections, newCorrections)
  }, [selections, corrections, showResult])

  // Update a correction input
  const updateCorrection = useCallback((number, value) => {
    const newCorrections = { ...corrections, [number]: value }
    setCorrections(newCorrections)
    saveToParent(selections, newCorrections)
  }, [selections, corrections])

  // Render the source paragraph with highlights
  const renderParagraph = () => {
    if (!sourceText) return null

    const sorted = [...selections].sort((a, b) => a.start - b.start)

    if (sorted.length === 0) {
      return <p className="ec-paragraph" ref={paragraphRef}>{sourceText}</p>
    }

    const parts = []
    let lastIndex = 0

    sorted.forEach((sel, i) => {
      // Text before this selection
      if (sel.start > lastIndex) {
        parts.push(
          <span key={`pre-${i}`}>{sourceText.slice(lastIndex, sel.start)}</span>
        )
      }
      // The highlighted selection
      parts.push(
        <span key={`sel-${i}`} className="ec-highlight" data-number={i + 1}>
          <span className="ec-highlight-text">{sourceText.slice(sel.start, sel.end)}</span>
          <span className="ec-highlight-number">{i + 1}</span>
          {!showResult && (
            <button
              className="ec-highlight-remove"
              onClick={(e) => { e.stopPropagation(); removeSelection(i) }}
              title="Remove selection"
            >
              ×
            </button>
          )}
        </span>
      )
      lastIndex = sel.end
    })

    // Remaining text
    if (lastIndex < sourceText.length) {
      parts.push(
        <span key="post">{sourceText.slice(lastIndex)}</span>
      )
    }

    return (
      <p
        className="ec-paragraph"
        ref={paragraphRef}
        onMouseUp={handleSelection}
        onTouchEnd={handleSelection}
      >
        {parts}
      </p>
    )
  }

  const sorted = [...selections].sort((a, b) => a.start - b.start)

  return (
    <div className="q-error-correction-interactive">
      <div
        className={`ec-paragraph-container ${showResult ? "ec-read-only" : ""}`}
        onMouseUp={!showResult ? handleSelection : undefined}
        onTouchEnd={!showResult ? handleSelection : undefined}
      >
        {renderParagraph()}
      </div>

      {!showResult && (
        <p className="ec-instruction-hint">
          Drag to select errors in the text above. {selections.length}/{maxErrors} selected.
        </p>
      )}

      {warning && (
        <div className="ec-warning">{warning}</div>
      )}

      {/* Correction fields */}
      {sorted.length > 0 && (
        <div className="ec-corrections">
          <h4 className="ec-corrections-title">Corrections:</h4>
          {sorted.map((sel, i) => {
            const number = i + 1
            // Check if student's selection matches expected error
            const expectedError = question.errors && question.errors[i]
            let selectionCorrect = false
            if (showResult && expectedError) {
              selectionCorrect = normalizeText(sel.text) === normalizeText(expectedError.wrong)
            }

            return (
              <div key={`${sel.start}-${sel.end}`} className="ec-correction-row">
                <span className="ec-correction-number">{number}.</span>
                <span className="ec-correction-selected-text">
                  {showResult && (
                    <span className={`ec-selection-indicator ${selectionCorrect ? "ec-correct" : "ec-wrong"}`}>
                      {selectionCorrect ? "✓" : "✗"}
                    </span>
                  )}
                  "{sel.text}"
                </span>
                <span className="ec-correction-arrow">→</span>
                <input
                  type="text"
                  className={`ec-correction-input ${
                    showResult && expectedError
                      ? (normalizeText(corrections[number] || "") === normalizeText(expectedError.correct)
                        ? "ec-correct" : "ec-wrong")
                      : ""
                  }`}
                  value={corrections[number] || ""}
                  onChange={(e) => updateCorrection(number, e.target.value)}
                  placeholder="correct form..."
                  disabled={showResult}
                />
                {showResult && expectedError && (
                  <span className="ec-correction-answer">
                    {normalizeText(corrections[number] || "") !== normalizeText(expectedError.correct)
                      ? <span className="ec-correct-answer">Answer: {expectedError.correct}</span>
                      : <span className="ec-correct-label">✓</span>
                    }
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showResult && question.errors && (
        <div className="ec-answer-key">
          <h4>All errors in the text:</h4>
          {question.errors.map((err, i) => (
            <div key={i} className="ec-answer-key-item">
              <span className="ec-ak-wrong">{err.wrong}</span>
              <span className="ec-ak-arrow">→</span>
              <span className="ec-ak-correct">{err.correct}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Simple text normalization for comparison.
 */
function normalizeText(str) {
  if (typeof str !== "string") return ""
  return str.trim().toLowerCase().replace(/[.,!?;:'"()\-—–]/g, "").replace(/\s+/g, " ")
}

// ─────────────────────────────────────────
// Question Dispatcher
// ─────────────────────────────────────────

function QuestionRenderer({ question, exerciseId, answer, onAnswer, showResult }) {
  switch (question.type) {
    case "fill-blank":
      return <FillBlankQuestion question={question} exerciseId={exerciseId} answer={answer} onAnswer={onAnswer} showResult={showResult} />
    case "multiple-choice":
      return <MultipleChoiceQuestion question={question} exerciseId={exerciseId} answer={answer} onAnswer={onAnswer} showResult={showResult} />
    case "rewrite":
      return <RewriteQuestion question={question} exerciseId={exerciseId} answer={answer} onAnswer={onAnswer} showResult={showResult} />
    case "circle":
      return <CircleQuestion question={question} exerciseId={exerciseId} answer={answer} onAnswer={onAnswer} showResult={showResult} />
    case "error-correction":
      // New interactive format with source_paragraph
      if (question.source_paragraph) {
        return <ErrorCorrectionTask question={question} exerciseId={exerciseId} answer={answer} onAnswer={onAnswer} showResult={showResult} />
      }
      // Legacy format (should not be used for new imports)
      return <ErrorCorrectionLegacy question={question} exerciseId={exerciseId} answer={answer} onAnswer={onAnswer} showResult={showResult} />
    default:
      return <div className="q-unsupported">Unsupported question type: {question.type}</div>
  }
}

// Legacy error-correction for backward compatibility
function ErrorCorrectionLegacy({ question, exerciseId, answer, onAnswer, showResult }) {
  const answerKey = typeof question.correction === "object" && question.correction !== null
    ? question.correction
    : { accepted: [question.correction] }
  const accepted = answerKey.accepted || []

  return (
    <div className="q-error-correction">
      {question.context && (
        <div className="q-ec-context">
          <FormattedTextDisplay value={question.context} />
        </div>
      )}
      {!question.context && question.error_text && (
        <div className="q-ec-highlight">{question.error_text}</div>
      )}
      <div className="q-ec-input-row">
        <span className="q-ec-label">Correct form:</span>
        <input
          type="text"
          className={`q-ec-input ${showResult ? (answer && accepted.some(a => a.toLowerCase().trim() === String(answer).toLowerCase().trim()) ? "ec-correct" : "ec-wrong") : ""}`}
          value={answer || ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type the correct word..."
          disabled={showResult}
        />
      </div>
      {showResult && (
        <div className="q-answer-reveal">
          {answer && accepted.some(a => a.toLowerCase().trim() === String(answer).toLowerCase().trim()) ? (
            <span className="q-correct-label">✓ Correct!</span>
          ) : (
            <span>Correct answer: <strong>{accepted[0]}</strong></span>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// ExerciseRenderer (main export)
// ─────────────────────────────────────────

/**
 * Props:
 *   exercise: the exercise object from the schema
 *   answers: object keyed by `${exerciseId}-${questionId}`
 *   onAnswer: (questionId, value) => void
 *   showResult: boolean
 *   compact: boolean — for preview mode
 */
export default function ExerciseRenderer({ exercise, answers, onAnswer, showResult = false, compact = false }) {
  return (
    <div className={`exercise-block ${compact ? "exercise-compact" : ""}`}>
      {exercise.title && (
        <h3 className="exercise-title">{exercise.title}</h3>
      )}

      {exercise.instruction && (
        <p className="exercise-instruction">
          <FormattedTextDisplay value={exercise.instruction} />
        </p>
      )}

      {exercise.content && exercise.content.length > 0 && (
        <div className="exercise-content">
          {exercise.content.map((block, i) => (
            <ContentBlock key={i} block={block} />
          ))}
        </div>
      )}

      <div className="exercise-questions">
        {exercise.questions.map((question) => {
          const displayNumber = getQuestionNumber(question)
          return (
            <div key={question.id} className="exercise-question">
              <span className="question-number">{displayNumber}.</span>
              <QuestionRenderer
                question={question}
                exerciseId={exercise.id}
                answer={answers[`${exercise.id}-${question.id}`]}
                onAnswer={(val) => onAnswer(`${exercise.id}-${question.id}`, val)}
                showResult={showResult}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
