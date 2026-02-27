import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const REGIONS = [
  { code: 'CH', flag: '🇨🇭', name: 'Switzerland', sub: 'NCSC / ISG / KISG' },
  { code: 'UK', flag: '🇬🇧', name: 'United Kingdom', sub: 'NCSC / ICO / CE+' },
  { code: 'EU', flag: '🇪🇺', name: 'European Union', sub: 'NIS2 / ENISA' },
]

const PILLARS = [
  { icon: '🪪', name: 'Identity', desc: 'MFA, conditional access, identity governance' },
  { icon: '💻', name: 'Devices', desc: 'MDM, EDR, endpoint compliance' },
  { icon: '🌐', name: 'Network', desc: 'Segmentation, ZTNA, secure remote access' },
  { icon: '⚙️', name: 'Applications', desc: 'Modern auth, privileged access, SSO' },
  { icon: '🗄️', name: 'Data', desc: 'Classification, backup, data protection' },
]

export default function Landing() {
  const [region, setRegion] = useState('CH')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function startScan() {
    setLoading(true)
    try {
      const res = await axios.post('/api/sessions', { region })
      navigate(`/scan?session=${res.data.session_id}&region=${region}`)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-violet-600/10 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-blue-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            Zero Trust Maturity Assessment Platform
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 leading-tight">
            Know your{' '}
            <span className="gradient-text">Zero Trust score</span>
            <br />in 15 minutes
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            10 targeted questions across 5 security pillars. Get an instant maturity dashboard,
            a Gemini-powered 90-day roadmap, and region-specific compliance guidance.
          </p>

          {/* Region selector */}
          <div className="max-w-xl mx-auto mb-8">
            <p className="text-slate-400 text-sm mb-3 font-medium uppercase tracking-wide">Select your region</p>
            <div className="grid grid-cols-3 gap-3">
              {REGIONS.map(r => (
                <button
                  key={r.code}
                  onClick={() => setRegion(r.code)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    region === r.code
                      ? 'border-blue-500 bg-blue-600/20 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <div className="text-3xl mb-1">{r.flag}</div>
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{r.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startScan}
            disabled={loading}
            className="inline-flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-900/50 hover:shadow-blue-700/50 hover:-translate-y-0.5"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <span>Start QuickScan</span>
                <span>→</span>
              </>
            )}
          </button>
          <p className="text-slate-600 text-sm mt-4">No account required • 10 questions • 15 minutes</p>
        </div>
      </div>

      {/* 5 Pillars */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <p className="text-center text-slate-400 text-sm font-medium uppercase tracking-wide mb-8">Assessment covers 5 Zero Trust pillars</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {PILLARS.map(p => (
            <div key={p.name} className="glass rounded-xl p-4 text-center hover:border-blue-500/30 transition-all">
              <div className="text-3xl mb-2">{p.icon}</div>
              <div className="font-semibold text-sm text-white">{p.name}</div>
              <div className="text-xs text-slate-500 mt-1">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-slate-800 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">How ZT Compass works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Answer 10 questions', desc: 'Yes / No / Partial / Unknown. Add evidence notes for each answer.' },
              { step: '02', title: 'Get instant dashboard', desc: 'Pillar scores, maturity levels, top risks and quick wins.' },
              { step: '03', title: 'AI-powered roadmap', desc: 'Gemini generates a 30/60/90-day plan tailored to your gaps and region.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 font-mono font-bold text-sm mb-4">{s.step}</div>
                <h3 className="font-bold mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-800 py-8 text-center text-slate-600 text-sm">
        <p>🧭 ZT Compass — Zero Trust Maturity Platform by AlpenNova Ventures</p>
      </footer>
    </div>
  )
}
