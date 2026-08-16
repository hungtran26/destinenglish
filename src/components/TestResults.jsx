import { useState, useEffect } from 'react'
import ExerciseRenderer from './ExerciseRenderer'
import { scoreTest } from '../lib/answerChecker'
import heroImg from '../assets/hero.png'

/**
 * TestResults — displays results after a test is submitted
 *
 * Shows:
 * - Overall score with animated circle
 * - Grade
 * - Per-exercise breakdown
 * - Option to review answers
 */
export default function TestResults({ testData, answers, onHome, onRetake }) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [showReview, setShowReview] = useState(false)

  const results = scoreTest(testData, answers)

  const getGrade = (pct) => {
    if (pct >= 90) return { grade: "A+", color: "#00C9A7", message: "Outstanding! You are a kangaroo champion! 🏆" }
    if (pct >= 80) return { grade: "A", color: "#00C9A7", message: "Excellent work! Keep hopping forward! 🌟" }
    if (pct >= 70) return { grade: "B", color: "#7C5CFC", message: "Great job! Almost there! 💪" }
    if (pct >= 60) return { grade: "C", color: "#FF8C42", message: "Good effort! Practice makes perfect! 📖" }
    return { grade: "D", color: "#FF4757", message: "Keep practicing! You will bounce back! 🦘" }
  }

  const gradeInfo = getGrade(results.overall_pct)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (showReview) {
    return (
      <div className="test-results">
        <div className="results-review">
          <div className="tt-header">
            <button className="back-btn" onClick={() => setShowReview(false)}>← Back to Results</button>
            <div className="tt-header-center">
              <h2 className="tt-title">Answer Review</h2>
            </div>
            <div />
          </div>
          <div className="results-review-content">
            {testData.test.exercises.map((exercise) => {
              const exResult = results.exercises.find(r => r.id === exercise.id)
              return (
                <div key={exercise.id} className="review-exercise">
                  <div className="review-exercise-header">
                    <span className="review-exercise-id">{exercise.id}</span>
                    <span className="review-exercise-score" style={{ color: gradeInfo.color }}>
                      {exResult.correct}/{exResult.total}
                    </span>
                  </div>
                  <ExerciseRenderer
                    exercise={exercise}
                    answers={answers}
                    onAnswer={() => {}}
                    showResult={true}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="test-results">
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 60 }, (_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: ["#FF6B9D", "#7C5CFC", "#00C9A7", "#FF8C42", "#FFD93D", "#FF4757"][Math.floor(Math.random() * 6)],
                width: `${6 + Math.random() * 10}px`,
                height: `${(6 + Math.random() * 10) * 0.6}px`,
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            />
          ))}
        </div>
      )}

      <div className="results-content">
        <div className="results-hero">
          <img src={heroImg} alt="Kangaroo" className="results-kangaroo-img" />
          <h2 className="results-title">Test Complete!</h2>
          <p className="results-message">{gradeInfo.message}</p>
        </div>

        {/* Score Circle */}
        <div className="score-circle-container">
          <div className="score-circle" style={{ "--score-color": gradeInfo.color }}>
            <svg viewBox="0 0 120 120" className="score-svg">
              <circle cx="60" cy="60" r="54" className="score-bg-circle" />
              <circle
                cx="60" cy="60" r="54"
                className="score-fill-circle"
                style={{ strokeDashoffset: 339.292 - (339.292 * results.overall_pct) / 100 }}
              />
            </svg>
            <div className="score-inner">
              <span className="score-pct">{results.overall_pct}%</span>
              <span className="score-grade" style={{ color: gradeInfo.color }}>{gradeInfo.grade}</span>
            </div>
          </div>
          <p className="score-detail">{results.total_correct}/{results.total_questions} Correct</p>
        </div>

        {/* Exercise Breakdown */}
        <div className="results-breakdown">
          <h3 className="results-breakdown-title">Exercise Breakdown</h3>
          {results.exercises.map((ex) => (
            <div key={ex.id} className="results-exercise-row">
              <span className="results-exercise-id">{ex.id}</span>
              <div className="results-exercise-bar-container">
                <div
                  className="results-exercise-bar"
                  style={{
                    width: `${ex.pct}%`,
                    backgroundColor: gradeInfo.color
                  }}
                />
              </div>
              <span className="results-exercise-score" style={{ color: gradeInfo.color }}>
                {ex.correct}/{ex.total}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button className="result-btn result-btn-review" onClick={() => setShowReview(true)}>
            📝 Review Answers
          </button>
          <button className="result-btn result-btn-retake" onClick={onRetake}>
            🔄 Retake
          </button>
          <button className="result-btn result-btn-home" onClick={onHome}>
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  )
}
