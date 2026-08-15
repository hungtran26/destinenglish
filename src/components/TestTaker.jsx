import { useState, useEffect, useRef } from 'react'
import ExerciseRenderer from './ExerciseRenderer'
import { scoreTest } from '../lib/answerChecker'

/**
 * TestTaker — the main student-facing test component
 *
 * Renders exercises one at a time with navigation, timer, and progress.
 */
export default function TestTaker({ testData, onComplete, onBack }) {
  const exercises = testData.test.exercises
  const totalTime = (testData.test.time_limit_minutes || 45) * 60

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(totalTime)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const answersRef = useRef(answers)

  // Keep ref in sync
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onComplete(answersRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const exercise = exercises[currentExerciseIndex]
  const isLast = currentExerciseIndex === exercises.length - 1

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (isLast) {
      setShowSubmitConfirm(true)
    } else {
      setCurrentExerciseIndex(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handlePrev = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleSubmit = () => {
    setShowSubmitConfirm(false)
    onComplete(answers)
  }

  const handleBackClick = () => {
    const hasAnswers = Object.keys(answers).length > 0
    if (hasAnswers) {
      setShowBackConfirm(true)
    } else {
      onBack()
    }
  }

  const answeredCount = Object.keys(answers).length
  const totalCount = exercises.reduce((sum, ex) => sum + ex.questions.length, 0)
  const isWarning = timeLeft < 300

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div className="test-taker">
      {/* Header */}
      <div className="tt-header">
        <button className="back-btn" onClick={handleBackClick}>← Back</button>
        <div className="tt-header-center">
          <h2 className="tt-title">{testData.test.title}</h2>
        </div>
        <div className={`tt-timer ${isWarning ? "tt-timer-warning" : ""}`}>
          <span className="tt-timer-icon">⏱️</span>
          <span className="tt-timer-text">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="tt-progress">
        <div className="tt-progress-bar">
          <div
            className="tt-progress-fill"
            style={{ width: `${(answeredCount / totalCount) * 100}%` }}
          />
        </div>
        <span className="tt-progress-text">{answeredCount}/{totalCount} answered</span>
      </div>

      {/* Exercise Navigation Tabs */}
      <div className="tt-exercise-tabs">
        {exercises.map((ex, i) => {
          const exAnswered = ex.questions.every(q => answers[`${ex.id}-${q.id}`] !== undefined)
          const exHasAny = ex.questions.some(q => answers[`${ex.id}-${q.id}`] !== undefined)
          return (
            <button
              key={ex.id}
              className={`tt-exercise-tab ${i === currentExerciseIndex ? "tt-tab-active" : ""} ${exAnswered ? "tt-tab-done" : ""} ${exHasAny && !exAnswered ? "tt-tab-partial" : ""}`}
              onClick={() => {
                setCurrentExerciseIndex(i)
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
            >
              {ex.id}
            </button>
          )
        })}
      </div>

      {/* Current Exercise */}
      <div className="tt-exercise-container" key={exercise.id}>
        <ExerciseRenderer
          exercise={exercise}
          answers={answers}
          onAnswer={handleAnswer}
          showResult={false}
        />
      </div>

      {/* Bottom Navigation */}
      <div className="tt-bottom-nav">
        <button
          className="nav-btn nav-prev"
          onClick={handlePrev}
          disabled={currentExerciseIndex === 0}
        >
          ← Previous
        </button>
        <button className="nav-btn nav-next" onClick={handleNext}>
          {isLast ? "Submit ✓" : "Next →"}
        </button>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-kangaroo">🦘</div>
            <h3>Ready to submit?</h3>
            <p>
              You've answered <strong>{answeredCount}</strong> out of{" "}
              <strong>{totalCount}</strong> questions.
            </p>
            {answeredCount < totalCount && (
              <p className="modal-warning">
                ⚠️ You have {totalCount - answeredCount} unanswered question(s).
              </p>
            )}
            <div className="modal-actions">
              <button className="modal-btn modal-cancel" onClick={() => setShowSubmitConfirm(false)}>
                Go Back
              </button>
              <button className="modal-btn modal-submit" onClick={handleSubmit}>
                Submit Test 🎉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Confirmation Modal */}
      {showBackConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-kangaroo">⚠️</div>
            <h3>Leave test?</h3>
            <p>Your answers for this test will be lost if you go back.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-cancel" onClick={() => setShowBackConfirm(false)}>
                Stay
              </button>
              <button className="modal-btn modal-submit" onClick={onBack}>
                Leave Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
