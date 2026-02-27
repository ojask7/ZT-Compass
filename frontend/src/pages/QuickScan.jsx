import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const ANSWER_OPTIONS = [
  { value: 'yes',     label: 'Yes',     color: 'border-emerald-500 bg-emerald-600/20 text-emerald-300' },
  { value: 'partial', label: 'Partial', color: 'border-amber-500 bg-amber-600/20 text-amber-300' },
  { value: 'no',      label: 'No',      color: 'border-red-500 bg-red-600/20 text-red-300' },
  { value: 'unknown', label: 'Unknown', color: 'border-slate-500 bg-slate-700/50 text-slate-400' },
]

const PILLAR_ICONS = { Identity: '🪪', Devices: '💻', Network: '🌐', Applications: '⚙️', Data: '🗄️' }

export default function QuickScan() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = params.get('session')

  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    // Store session id in localStorage for persistence
    localStorage.setItem('ztcompass_session_id', sessionId)

    // Fetch existing session (includes questions + any saved answers)
    axios.get(`/api/sessions/${sessionId}`)
      .then(res => {
        setQuestions(res.data.questions || [])
        if (res.data.answers && Object.keys(res.data.answers).length > 0) {
          setAnswers(res.data.answers)
        }
      })
      .catch(() => {
        setLoadError('Session not found. Please start a new assessment.')
      })
  }, [sessionId])

  const q = questions[current]
  const answered = Object.keys(answers).filter(k => answers[k]?.answer).length

  function setAnswer(qid, field, value) {
    setAnswers(prev => ({ ...prev, [qid]: { ...prev[qid], [field]: value } }))
  }

  function canProceed() {
    return q && answers[q.id]?.answer
  }

  function next() {
    if (current < questions.length - 1) setCurrent(c => c + 1)
  }

  function prev() {
    if (current > 0) setCurrent(c => c - 1)
  }

  async function finish() {
    setSubmitting(true)
    try {
      await axios.post(`/api/sessions/${sessionId}/answers`, { session_id: sessionId, answers })
      navigate(`/dashboard/${sessionId}`)
    } catch (e) {
      console.error(e)
      alert('Failed to submit answers. Please try again.')
      setSubmitting(false)
    }
  }

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center glass rounded-xl p-8 max-w-sm">
        <p className="text-red-400 mb-4">{loadError}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
          Start New Assessment
        </button>
      </div>
    </div>
  )

  if (!questions.length) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading assessment...</p>
      </div>
    </div>
  )

  const isLast = current === questions.length - 1
  const allAnswered = questions.every(q => answers[q.id]?.answer)

  // Group questions by pillar for sidebar
  const pillars = [...new Set(questions.map(q => q.pillar))]

  return (
    <div className="min-h-screen pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Question {current + 1} of {questions.length}</span>
            <span className="text-slate-400 text-sm">{answered} answered</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-violet-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((current + (answers[q?.id]?.answer ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
          {/* Pillar progress dots */}
          <div className="flex items-center gap-2 mt-3">
            {questions.map((ques, i) => (
              <button
                key={ques.id}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === current ? 'bg-blue-400 w-5' :
                  answers[ques.id]?.answer ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar — pillar progress */}
          <div className="hidden lg:block">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-4">Pillars</p>
              {pillars.map(pillar => {
                const pqs = questions.filter(q => q.pillar === pillar)
                const pAnswered = pqs.filter(q => answers[q.id]?.answer).length
                const isCurrent = q?.pillar === pillar
                return (
                  <div key={pillar} className={`mb-3 p-2 rounded-lg transition-all ${isCurrent ? 'bg-blue-600/15 border border-blue-500/30' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{PILLAR_ICONS[pillar]}</span>
                      <span className={`text-sm font-medium ${isCurrent ? 'text-blue-300' : 'text-slate-400'}`}>{pillar}</span>
                    </div>
                    <div className="flex gap-1">
                      {pqs.map(q => (
                        <div key={q.id} className={`flex-1 h-1 rounded-full ${answers[q.id]?.answer ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{pAnswered}/{pqs.length}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Main question card */}
          <div className="lg:col-span-3">
            {q && (
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-2xl">{PILLAR_ICONS[q.pillar]}</span>
                  <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-semibold rounded-full uppercase tracking-wide">
                    {q.pillar}
                  </span>
                </div>

                <h2 className="text-xl font-bold mb-3 leading-snug">{q.text}</h2>
                <p className="text-slate-400 text-sm mb-8 flex items-start gap-2">
                  <span className="mt-0.5 text-blue-400">💡</span>
                  {q.hint}
                </p>

                {/* Answer buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {ANSWER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAnswer(q.id, 'answer', opt.value)}
                      className={`p-4 rounded-xl border-2 font-semibold transition-all text-left ${
                        answers[q.id]?.answer === opt.value
                          ? opt.color + ' scale-[1.02]'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          answers[q.id]?.answer === opt.value ? 'border-current' : 'border-slate-600'
                        }`}>
                          {answers[q.id]?.answer === opt.value && <span className="w-2 h-2 rounded-full bg-current" />}
                        </span>
                        {opt.label}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Evidence note */}
                <div className="mb-8">
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">
                    Evidence note <span className="normal-case">(optional — helps generate better roadmap)</span>
                  </label>
                  <textarea
                    value={answers[q.id]?.note || ''}
                    onChange={e => setAnswer(q.id, 'note', e.target.value)}
                    placeholder="e.g. 'MFA enabled in Entra ID but not enforced for all guests'"
                    rows={2}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={prev}
                    disabled={current === 0}
                    className="px-5 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    ← Back
                  </button>

                  {isLast ? (
                    <button
                      onClick={finish}
                      disabled={!allAnswered || submitting}
                      className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                      {submitting ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing...</>
                      ) : allAnswered ? 'View My Dashboard →' : `Answer all questions (${answered}/${questions.length})`}
                    </button>
                  ) : (
                    <button
                      onClick={next}
                      disabled={!canProceed()}
                      className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-all"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
