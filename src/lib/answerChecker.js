/**
 * Kangaroo CBT — Answer Checker v1.1
 *
 * Checks student answers against answer keys for different question types.
 * Returns { correct: boolean, accepted_answer: string, score: number }
 */

/**
 * Normalize a string for comparison.
 */
function normalize(str, options = {}) {
  if (typeof str !== "string") return ""
  let s = str.trim()
  if (options.strip_punctuation !== false) {
    s = s.replace(/[.,!?;:'"()\-—–]/g, "")
  }
  if (!options.case_sensitive) {
    s = s.toLowerCase()
  }
  return s.replace(/\s+/g, " ").trim()
}

/**
 * Resolve an answer key to an array of accepted strings.
 */
function resolveAccepted(answerKey) {
  if (typeof answerKey === "string") return [answerKey]
  if (answerKey && Array.isArray(answerKey.accepted)) return answerKey.accepted
  return []
}

/**
 * Get answer options for an answer key.
 */
function getOptions(answerKey) {
  if (typeof answerKey === "object" && answerKey !== null) {
    return {
      case_sensitive: answerKey.case_sensitive || false,
      exact_match: answerKey.exact_match || false,
      strip_punctuation: answerKey.strip_punctuation !== false
    }
  }
  return { case_sensitive: false, exact_match: false, strip_punctuation: true }
}

/**
 * Check a fill-blank answer.
 */
export function checkFillBlank(studentAnswer, answerKey) {
  const accepted = resolveAccepted(answerKey)
  const opts = getOptions(answerKey)
  const normalized = normalize(studentAnswer, opts)

  if (!normalized) return { correct: false, accepted_answer: accepted[0] || "" }

  for (const ans of accepted) {
    const normalizedAns = normalize(ans, opts)
    if (normalized === normalizedAns) return { correct: true, accepted_answer: ans }
  }

  return { correct: false, accepted_answer: accepted[0] || "" }
}

/**
 * Check a multiple-choice answer.
 */
export function checkMultipleChoice(studentIndex, correctIndex) {
  return {
    correct: studentIndex === correctIndex,
    accepted_answer: null
  }
}

/**
 * Check a rewrite answer.
 */
export function checkRewrite(studentAnswer, answerKey) {
  return checkFillBlank(studentAnswer, answerKey)
}

/**
 * Check a circle answer.
 */
export function checkCircle(studentIndex, correctIndex) {
  return checkMultipleChoice(studentIndex, correctIndex)
}

/**
 * Check an interactive error-correction answer.
 *
 * The student answer is an object: { selections: [...], corrections: {...} }
 * The question has: { errors: [{wrong, correct}, ...] }
 *
 * Scoring: each error is worth equal points.
 * For each error position i:
 *   - Selection match: did the student select text matching errors[i].wrong?
 *   - Correction match: did the student type the correct correction?
 *   - Full point: both correct
 *   - Partial point: only correction correct (they identified the right fix but wrong selection)
 */
export function checkErrorCorrection(question, studentAnswer) {
  if (!question.source_paragraph) {
    // Legacy format
    if (!studentAnswer || typeof studentAnswer !== "string") {
      return { correct: false, score: 0, details: [] }
    }
    return checkFillBlank(studentAnswer, question.correction)
  }

  // New interactive format
  const expectedErrors = question.errors || []
  const totalErrors = expectedErrors.length

  if (totalErrors === 0) {
    return { correct: true, score: 1, details: [] }
  }

  if (!studentAnswer || !studentAnswer.selections) {
    return {
      correct: false,
      score: 0,
      details: expectedErrors.map(() => ({ selection_correct: false, correction_correct: false }))
    }
  }

  const studentSelections = [...studentAnswer.selections].sort((a, b) => a.start - b.start)
  const studentCorrections = studentAnswer.corrections || {}

  const details = []
  let totalScore = 0

  for (let i = 0; i < totalErrors; i++) {
    const expected = expectedErrors[i]
    const studentSel = studentSelections[i]
    const studentCorr = studentCorrections[i + 1] || "" // 1-indexed

    const selectionCorrect = studentSel
      ? normalize(studentSel.text) === normalize(expected.wrong)
      : false

    const correctionCorrect = normalize(studentCorr) === normalize(expected.correct)

    // Full point for both correct, partial for only correction
    let points = 0
    if (selectionCorrect && correctionCorrect) {
      points = 1
    } else if (correctionCorrect) {
      points = 0.5
    }

    totalScore += points
    details.push({
      expected_error: expected.wrong,
      expected_correction: expected.correct,
      student_selection: studentSel ? studentSel.text : null,
      student_correction: studentCorr,
      selection_correct: selectionCorrect,
      correction_correct: correctionCorrect,
      points
    })
  }

  return {
    correct: totalScore === totalErrors,
    score: totalScore / totalErrors,
    details
  }
}

/**
 * Generic check for any question type.
 */
export function checkAnswer(question, studentAnswer) {
  switch (question.type) {
    case "fill-blank":
      return checkFillBlank(studentAnswer, question.answer)

    case "multiple-choice":
      return checkMultipleChoice(studentAnswer, question.answer)

    case "rewrite":
      return checkRewrite(studentAnswer, question.answer)

    case "circle":
      return checkCircle(studentAnswer, question.answer)

    case "error-correction":
      return checkErrorCorrection(question, studentAnswer)

    default:
      return { correct: false, accepted_answer: "" }
  }
}

/**
 * Score an entire test.
 * Returns per-exercise and overall results.
 */
export function scoreTest(testData, answers) {
  const results = {
    exercises: [],
    total_correct: 0,
    total_questions: 0,
    overall_pct: 0
  }

  for (const exercise of testData.test.exercises) {
    const exResult = {
      id: exercise.id,
      title: exercise.title,
      correct: 0,
      total: exercise.questions.length,
      questions: []
    }

    for (const question of exercise.questions) {
      const studentAnswer = answers[`${exercise.id}-${question.id}`]
      const result = checkAnswer(question, studentAnswer)

      const isCorrect = result.correct === true || result.score === 1

      exResult.questions.push({
        question_id: question.id,
        student_answer: studentAnswer,
        correct: isCorrect,
        score: result.score,
        accepted_answer: result.accepted_answer,
        details: result.details
      })

      if (isCorrect) {
        exResult.correct++
        results.total_correct++
      }
      results.total_questions++
    }

    exResult.pct = exResult.total > 0
      ? Math.round((exResult.correct / exResult.total) * 100)
      : 0

    results.exercises.push(exResult)
  }

  results.overall_pct = results.total_questions > 0
    ? Math.round((results.total_correct / results.total_questions) * 100)
    : 0

  return results
}
