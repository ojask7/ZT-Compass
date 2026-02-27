import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

const REGIONS = [
  { code: 'CH', flag: '🇨🇭', name: 'Switzerland' },
  { code: 'UK', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'EU', flag: '🇪🇺', name: 'European Union' },
]

export default function RegionOverlay() {
  const { region } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)
    axios.get(`/api/regions/${region}`)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [region])

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        {/* Region tabs */}
        <div className="flex gap-2 mb-8">
          {REGIONS.map(r => (
            <Link
              key={r.code}
              to={`/regions/${r.code}`}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                region === r.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>{r.flag}</span> {r.name}
            </Link>
          ))}
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading region guide...</p>
          </div>
        )}

        {data && (
          <div>
            <h1 className="text-3xl font-extrabold mb-8">{data.title}</h1>
            <div className="space-y-6">
              {data.sections.map((section, i) => (
                <div key={i} className="glass rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-3 text-blue-300">{section.heading}</h2>
                  <p className="text-slate-400 text-sm mb-4 leading-relaxed">{section.content}</p>
                  <ul className="space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-blue-400 mt-1 flex-shrink-0">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
