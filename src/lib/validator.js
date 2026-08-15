/**
 * Kangaroo CBT — Import Blob Validator v1.1
 *
 * Validates a JSON blob against the canonical schema.
 * Returns { valid: boolean, errors: string[] }
 */

const VALID_QUESTION_TYPES = ["fill-blank", "multiple-choice", "rewrite", "error-correction", "circle"]
const VALID_CONTENT_TYPES = ["text", "image", "example", "word_bank", "table"]

/**
 * Check if a value is a valid FormattedText (string or segments array).
 */
function isFormattedText(val) {
  if (typeof val === "string") return true
  if (Array.isArray(val)) {
    return val.every(seg =>
      seg && typeof seg === "object" &&
      typeof seg.text === "string"
    )
  }
  // Wrapped format: { segments: [...] }
  if (val && typeof val === "object" && Array.isArray(val.segments)) {
    return val.segments.every(seg =>
      seg && typeof seg === "object" &&
      typeof seg.text === "string"
    )
  }
  return false
}

/**
 * Get the plain-text string from a FormattedText value.
 */
function toPlainText(ft) {
  if (typeof ft === "string") return ft
  if (Array.isArray(ft)) return ft.map(s => s.text).join("")
  if (ft && ft.segments && Array.isArray(ft.segments)) return ft.segments.map(s => s.text).join("")
  return ""
}

export function validateImportBlob(blob) {
  const errors = []

  if (!blob || typeof blob !== "object") {
    return { valid: false, errors: ["Input is not a valid object."] }
  }

  // Schema version
  if (blob.schema_version !== "1.0") {
    errors.push(`Invalid schema_version: "${blob.schema_version}". Expected "1.0".`)
  }

  // Test
  if (!blob.test || typeof blob.test !== "object") {
    errors.push("Missing or invalid 'test' object.")
    return { valid: false, errors }
  }

  const test = blob.test

  // Test title
  if (!test.title || typeof test.title !== "string" || test.title.trim() === "") {
    errors.push("test.title is required and must be a non-empty string.")
  }

  // Test description (optional, accepts formatted text)
  if (test.description !== undefined && !isFormattedText(test.description)) {
    errors.push("test.description must be a string or formatted text segments array.")
  }

  // Test time limit
  if (test.time_limit_minutes !== undefined) {
    if (typeof test.time_limit_minutes !== "number" || test.time_limit_minutes <= 0) {
      errors.push("test.time_limit_minutes must be a positive number.")
    }
  }

  // Exercises
  if (!Array.isArray(test.exercises) || test.exercises.length === 0) {
    errors.push("test.exercises must be a non-empty array.")
    return { valid: false, errors }
  }

  const exerciseIds = new Set()

  test.exercises.forEach((exercise, exIndex) => {
    const exPrefix = `Exercise ${exIndex + 1} (id="${exercise.id || "?"}")`

    if (!exercise.id || typeof exercise.id !== "string") {
      errors.push(`${exPrefix}: 'id' is required and must be a string.`)
    } else if (exerciseIds.has(exercise.id)) {
      errors.push(`${exPrefix}: Duplicate exercise id "${exercise.id}".`)
    } else {
      exerciseIds.add(exercise.id)
    }

    // Instruction (accepts formatted text)
    if (!exercise.instruction) {
      errors.push(`${exPrefix}: 'instruction' is required.`)
    } else if (!isFormattedText(exercise.instruction)) {
      errors.push(`${exPrefix}: 'instruction' must be a string or formatted text segments array.`)
    }

    // Content blocks
    if (exercise.content !== undefined) {
      if (!Array.isArray(exercise.content)) {
        errors.push(`${exPrefix}: 'content' must be an array.`)
      } else {
        exercise.content.forEach((block, bIndex) => {
          validateContentBlock(block, `${exPrefix} → Content ${bIndex + 1}`, errors)
        })
      }
    }

    // Questions
    if (!Array.isArray(exercise.questions) || exercise.questions.length === 0) {
      errors.push(`${exPrefix}: 'questions' must be a non-empty array.`)
    } else {
      const questionIds = new Set()
      exercise.questions.forEach((q, qIndex) => {
        const qPrefix = `${exPrefix} → Q${qIndex + 1}`
        validateQuestion(q, qPrefix, errors)

        if (q.id !== undefined && q.id !== null) {
          if (questionIds.has(q.id)) {
            errors.push(`${qPrefix}: Duplicate question id ${q.id} within exercise "${exercise.id}".`)
          } else {
            questionIds.add(q.id)
          }
        }
      })
    }
  })

  return { valid: errors.length === 0, errors }
}

function validateContentBlock(block, prefix, errors) {
  if (!block || typeof block !== "object") {
    errors.push(`${prefix}: Must be an object.`)
    return
  }

  if (!VALID_CONTENT_TYPES.includes(block.type)) {
    errors.push(`${prefix}: Invalid content type "${block.type}". Valid: ${VALID_CONTENT_TYPES.join(", ")}`)
    return
  }

  switch (block.type) {
    case "text":
      if (!isFormattedText(block.value)) {
        errors.push(`${prefix}: 'value' is required and must be a string or formatted text segments array.`)
      }
      break
    case "image":
      if (!block.src || typeof block.src !== "string") {
        errors.push(`${prefix}: 'src' is required and must be a string URL/path.`)
      }
      break
    case "example":
      if (!isFormattedText(block.value)) {
        errors.push(`${prefix}: 'value' is required and must be a string or formatted text segments array.`)
      }
      break
    case "word_bank":
      if (!Array.isArray(block.words) || block.words.length === 0) {
        errors.push(`${prefix}: 'words' must be a non-empty array of strings.`)
      } else if (!block.words.every(w => typeof w === "string" && w.trim() !== "")) {
        errors.push(`${prefix}: All words must be non-empty strings.`)
      }
      break
    case "table":
      if (!Array.isArray(block.rows)) {
        errors.push(`${prefix}: 'rows' must be an array of arrays.`)
      }
      break
  }
}

function validateQuestion(q, prefix, errors) {
  if (!q || typeof q !== "object") {
    errors.push(`${prefix}: Must be an object.`)
    return
  }

  if (q.id === undefined || q.id === null) {
    errors.push(`${prefix}: 'id' is required.`)
  }

  // Question number (optional display number, separate from id)
  if (q.number !== undefined && q.number !== null) {
    if (typeof q.number !== "number" && typeof q.number !== "string") {
      errors.push(`${prefix}: 'number' must be a number or string if provided.`)
    }
  }

  if (!q.type || typeof q.type !== "string") {
    errors.push(`${prefix}: 'type' is required and must be a string.`)
    return
  }

  if (!VALID_QUESTION_TYPES.includes(q.type)) {
    errors.push(`${prefix}: Invalid type "${q.type}". Valid: ${VALID_QUESTION_TYPES.join(", ")}`)
    return
  }

  switch (q.type) {
    case "fill-blank":
      if (!isFormattedText(q.prompt)) {
        errors.push(`${prefix}: 'prompt' is required (string or formatted text).`)
      }
      validateAnswerKey(q.answer, "answer", prefix, errors)
      break

    case "multiple-choice":
      if (!isFormattedText(q.prompt)) {
        errors.push(`${prefix}: 'prompt' is required (string or formatted text).`)
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${prefix}: 'options' must be an array with at least 2 options.`)
      } else {
        q.options.forEach((opt, i) => {
          if (!isFormattedText(opt)) {
            errors.push(`${prefix}: option[${i}] must be a string or formatted text.`)
          }
        })
      }
      if (typeof q.answer !== "number" || q.answer < 0 || (q.options && q.answer >= q.options.length)) {
        errors.push(`${prefix}: 'answer' must be a valid index into 'options'.`)
      }
      break

    case "rewrite":
      if (!isFormattedText(q.prompt)) {
        errors.push(`${prefix}: 'prompt' is required (string or formatted text).`)
      }
      validateAnswerKey(q.answer, "answer", prefix, errors)
      break

    case "error-correction":
      // New format: source_paragraph + required_error_count + errors array
      if (q.source_paragraph) {
        // New interactive format
        if (!isFormattedText(q.source_paragraph)) {
          errors.push(`${prefix}: 'source_paragraph' must be a string or formatted text.`)
        }
        if (typeof q.required_error_count !== "number" || q.required_error_count <= 0) {
          errors.push(`${prefix}: 'required_error_count' must be a positive number.`)
        }
        if (!Array.isArray(q.errors) || q.errors.length === 0) {
          errors.push(`${prefix}: 'errors' must be a non-empty array of {wrong, correct} pairs.`)
        } else {
          q.errors.forEach((err, i) => {
            if (!err.wrong || typeof err.wrong !== "string") {
              errors.push(`${prefix}: errors[${i}].wrong is required and must be a string.`)
            }
            if (!err.correct || typeof err.correct !== "string") {
              errors.push(`${prefix}: errors[${i}].correct is required and must be a string.`)
            }
          })
          if (q.required_error_count && q.errors.length !== q.required_error_count) {
            errors.push(`${prefix}: Mismatch — required_error_count is ${q.required_error_count} but ${q.errors.length} error answers provided.`)
          }
        }
      } else {
        // Legacy format (error_text + correction)
        if (!q.error_text || typeof q.error_text !== "string") {
          errors.push(`${prefix}: 'error_text' or 'source_paragraph' is required.`)
        }
        validateAnswerKey(q.correction, "correction", prefix, errors)
      }
      break

    case "circle":
      if (!isFormattedText(q.prompt)) {
        errors.push(`${prefix}: 'prompt' is required (string or formatted text).`)
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${prefix}: 'options' must be an array with at least 2 options.`)
      }
      if (typeof q.answer !== "number" || q.answer < 0 || (q.options && q.answer >= q.options.length)) {
        errors.push(`${prefix}: 'answer' must be a valid index into 'options'.`)
      }
      break
  }
}

function validateAnswerKey(answer, fieldName, prefix, errors) {
  if (!answer) {
    errors.push(`${prefix}: '${fieldName}' is required.`)
    return
  }

  // String shorthand → valid
  if (typeof answer === "string") return

  // Object form
  if (typeof answer === "object") {
    if (!Array.isArray(answer.accepted) || answer.accepted.length === 0) {
      errors.push(`${prefix}: '${fieldName}.accepted' must be a non-empty array of strings.`)
    } else if (!answer.accepted.every(a => typeof a === "string" && a.trim() !== "")) {
      errors.push(`${prefix}: All accepted answers in '${fieldName}' must be non-empty strings.`)
    }
    return
  }

  errors.push(`${prefix}: '${fieldName}' must be a string or an AnswerKey object.`)
}
