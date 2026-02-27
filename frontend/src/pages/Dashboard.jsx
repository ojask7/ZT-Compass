import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const PILLAR_ICONS = { Identity: '🪪', Devices: '💻', Network: '🌐', Applications: '⚙️', Data: '🗄️' }
const LEVEL_COLORS = {
  Traditional: 'text-red-400 border-red-500/40 bg-red-900/20',
  Initial:     'text-amber-400 border-amber-500/40 bg-amber-900/20',
  Advanced:    'text-emerald-400 border-emerald-500/40 bg-emerald-900/20',
  Optimal:     'text-blue-400 border-blue-500/40 bg-blue-900/20',
}
const SCORE_COLOR = (s) => s >= 80 ? 'text-emerald-400' : s >= 55 ? 'text-amber-400' : s >= 30 ? 'text-orange-400' : 'text-red-400'
const SCORE_BAR_COLOR = (s) => s >= 80 ? 'bg-emerald-500' : s >= 55 ? 'bg-amber-500' : s >= 30 ? 'bg-orange-500' : 'bg-red-500'

function ScoreRing({ score, size = 120 }) {
  const r = 45
  const c = 2 * Math.PI * r
  const fill = (score / 100) * c
  const color = score >= 80 ? '#10b981' : score >= 55 ? '#f59e0b' : score >= 30 ? '#f97316' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${fill} ${c}`} strokeLinecap="round" className="transition-all duration-1000" />
      <text x="50" y="50" textAnchor="middle" dy="0.35em" className="rotate-90 origin-center"
        style={{ fill: 'white', fontSize: '18px', fontWeight: 'bold', transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>
        {score}
      </text>
    </svg>
  )
}

function EmailCaptureForm({ sessionId }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await axios.post(`/api/sessions/${sessionId}/email`, { email: email.trim() })
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return (
    <div className="text-center py-4">
      <div className="text-3xl mb-2">✅</div>
      <p className="text-emerald-400 font-semibold">You're on the list!</p>
      <p className="text-slate-400 text-sm mt-1">We'll send your full Zero Trust report shortly.</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <p className="text-slate-300 text-sm mb-3 font-medium">📧 Get your full report — enter your work email</p>
      <div className="flex gap-3 flex-wrap sm:flex-nowrap">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-2 text-sm"
        >
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
          Get Full Report →
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </form>
  )
}

export default function Dashboard() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    axios.get(`/api/sessions/${sessionId}/dashboard`)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
      })
  }, [sessionId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-lg">Analysing your Zero Trust posture...</p>
      </div>
    </div>
  )

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <div className="text-center glass rounded-xl p-8 max-w-sm">
        <p className="text-red-400 mb-4">Could not load your dashboard. The session may have expired.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
          Start New Assessment
        </button>
      </div>
    </div>
  )

  const { overall_score, pillar_scores, top_risks, quick_wins, region_banner, region } = data

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">

        {/* Region banner */}
        {region_banner && (
          <div className="mb-6 p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <p>{region_banner}</p>
            <Link to={`/regions/${region}`} className="ml-auto text-blue-400 hover:text-blue-300 whitespace-nowrap text-xs font-medium underline">
              Full guide →
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold">Zero Trust Dashboard</h1>
            <p className="text-slate-400 mt-1">Your maturity assessment results</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <ScoreRing score={overall_score} size={80} />
              <p className="text-xs text-slate-500 mt-1">Overall</p>
            </div>
            <button
              onClick={() => navigate(`/roadmap/${sessionId}`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2"
            >
              <span>🗺️</span> Generate My Roadmap
            </button>
          </div>
        </div>

        {/* Pillar tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {Object.entries(pillar_scores).map(([pillar, data]) => (
            <div key={pillar} className={`glass rounded-xl p-4 border-2 ${LEVEL_COLORS[data.level]}`}>
              <div className="text-2xl mb-2">{PILLAR_ICONS[pillar]}</div>
              <div className="font-bold text-sm mb-1">{pillar}</div>
              <div className={`text-2xl font-extrabold ${SCORE_COLOR(data.score)}`}>{data.score}</div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 mb-2">
                <div className={`${SCORE_BAR_COLOR(data.score)} h-1.5 rounded-full transition-all`} style={{ width: `${data.score}%` }} />
              </div>
              <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${LEVEL_COLORS[data.level]}`}>
                {data.level}
              </div>
            </div>
          ))}
        </div>

        {/* Maturity legend */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[['Traditional', 'text-red-400', '0–29'], ['Initial', 'text-amber-400', '30–54'], ['Advanced', 'text-emerald-400', '55–79'], ['Optimal', 'text-blue-400', '80–100']].map(([l, c, r]) => (
            <div key={l} className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${c.replace('text-', 'bg-')}`} />
              <span className={c}>{l}</span>
              <span className="text-slate-600">({r})</span>
            </div>
          ))}
        </div>

        {/* Risks + Wins */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Top Risks */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span>🔴</span> Top 5 Risks
            </h2>
            <div className="space-y-3">
              {top_risks.map((r, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-900/40 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-400">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-red-400 uppercase">{r.pillar}</span>
                      <span className="text-xs text-slate-600">Score: {r.score}</span>
                    </div>
                    <p className="text-sm text-slate-300">{r.risk}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Wins */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span>⚡</span> Top 5 Quick Wins
            </h2>
            <div className="space-y-3">
              {quick_wins.map((w, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                    {i + 1}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase block mb-0.5">{w.pillar}</span>
                    <p className="text-sm text-slate-300">{w.win}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Email capture CTA */}
        <div className="glass rounded-2xl p-8 border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-violet-600/10 mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">Get your full report</h2>
                <p className="text-slate-400 text-sm">Receive a detailed PDF with your scores, risks, and the full 90-day roadmap.</p>
              </div>
              <button
                onClick={() => navigate(`/roadmap/${sessionId}`)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:-translate-y-0.5 whitespace-nowrap"
              >
                🗺️ View Roadmap →
              </button>
            </div>
            <EmailCaptureForm sessionId={sessionId} />
          </div>
        </div>

        {/* Playbooks link */}
        <div className="text-center">
          <Link to="/playbooks" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
            📋 View implementation playbooks →
          </Link>
        </div>
      </div>
    </div>
  )
}
