import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { getUserResults, deleteResult } from '../lib/resultsStorage'
import { getTest } from '../lib/testStorage'
import ExerciseRenderer from './ExerciseRenderer'
import { scoreTest } from '../lib/answerChecker'
import heroImg from '../assets/hero.png'

export default function MyResults({ onBack }) {
  const { user } = useAuth()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null) // result record
  const [testData, setTestData] = useState(null)
  const [loadingTest, setLoadingTest] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getUserResults(user.id).then(data => {
      setResults(data)
      setLoading(false)
    })
  }, [user])

  const handleView = async (record) => {
    setViewing(record)
    setLoadingTest(true)
    try {
      const blob = await getTest(record.test_title)
      setTestData(blob)
    } catch (e) {
      console.error('Failed to load test:', e)
    } finally {
      setLoadingTest(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this result?')) {
      await deleteResult(id)
      setResults(prev => prev.filter(r => r.id !== id))
      if (viewing?.id === id) {
        setViewing(null)
        setTestData(null)
      }
    }
  }

  const getGrade = (pct) => {
    if (pct >= 90) return { grade: 'A+', color: '#00C9A7' }
    if (pct >= 80) return { grade: 'A', color: '#00C9A7' }
    if (pct >= 70) return { grade: 'B', color: '#7C5CFC' }
    if (pct >= 60) return { grade: 'C', color: '#FF8C42' }
    return { grade: 'D', color: '#FF4757' }
  }

  // Detail view — same as TestResults review
  if (viewing) {
    const score = getGrade(viewing.overall_pct)

    if (loadingTest) {
      return (
        <div className="my-results">
          <div className="my-results-header">
            <button className="back-btn" onClick={() => { setViewing(null); setTestData(null) }}>← Back to Results</button>
            <h2 className="my-results-title">Loading test...</h2>
          </div>
        </div>
      )
    }

    if (!testData) {
      return (
        <div className="my-results">
          <div className="my-results-header">
            <button className="back-btn" onClick={() => { setViewing(null); setTestData(null) }}>← Back to Results</button>
            <h2 className="my-results-title">Test not available</h2>
            <p>The original test may have been deleted.</p>
          </div>
        </div>
      )
    }

    const resultsData = scoreTest(testData, viewing.answers)

    return (
      <div className="my-results">
        <div className="my-results-header">
          <button className="back-btn" onClick={() => { setViewing(null); setTestData(null) }}>← Back to Results</button>
          <div className="my-results-header-center">
            <h2 className="my-results-title">{viewing.test_title}</h2>
            <p className="my-results-score" style={{ color: score.color }}>
              {score.grade} — {viewing.overall_pct}% ({viewing.total_correct}/{viewing.total_questions})
            </p>
          </div>
          <div />
        </div>
        <div className="my-results-review-content">
          {testData.test.exercises.map((exercise) => {
            const exResult = resultsData.exercises.find(r => r.id === exercise.id)
            return (
              <div key={exercise.id} className="review-exercise">
                <div className="review-exercise-header">
                  <span className="review-exercise-id">{exercise.id}</span>
                  <span className="review-exercise-score" style={{ color: score.color }}>
                    {exResult.correct}/{exResult.total}
                  </span>
                </div>
                <ExerciseRenderer
                  exercise={exercise}
                  answers={viewing.answers}
                  onAnswer={() => {}}
                  showResult={true}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="my-results">
      <div className="my-results-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="my-results-title">My Results</h2>
      </div>

      {loading ? (
        <div className="my-results-empty">
          <p>Loading...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="my-results-empty">
          <img src={heroImg} alt="Kangaroo" className="empty-kangaroo-img" />
          <h3>No results yet</h3>
          <p>Complete a test and your results will appear here.</p>
        </div>
      ) : (
        <div className="my-results-list">
          {results.map((record) => {
            const score = getGrade(record.overall_pct)
            const date = new Date(record.created_at)
            return (
              <div key={record.id} className="my-results-card">
                <div className="my-results-card-left">
                  <h3 className="my-results-card-title">{record.test_title}</h3>
                  <p className="my-results-card-date">
                    {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="my-results-card-center">
                  <span className="my-results-card-grade" style={{ color: score.color }}>{score.grade}</span>
                  <span className="my-results-card-pct">{record.overall_pct}%</span>
                  <span className="my-results-card-detail">{record.total_correct}/{record.total_questions}</span>
                </div>
                <div className="my-results-card-right">
                  <button className="my-results-card-btn my-results-view" onClick={() => handleView(record)}>
                    Review
                  </button>
                  <button className="my-results-card-btn my-results-delete" onClick={() => handleDelete(record.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
