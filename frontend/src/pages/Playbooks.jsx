import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

const PILLAR_COLORS = {
  Identity:     'text-blue-400 bg-blue-900/30 border-blue-500/30',
  Devices:      'text-violet-400 bg-violet-900/30 border-violet-500/30',
  Network:      'text-cyan-400 bg-cyan-900/30 border-cyan-500/30',
  Applications: 'text-amber-400 bg-amber-900/30 border-amber-500/30',
  Data:         'text-emerald-400 bg-emerald-900/30 border-emerald-500/30',
}

function PlaybookDetail({ pb }) {
  const [expanded, setExpanded] = useState(null)
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{pb.icon}</span>
        <div>
          <h2 className="text-2xl font-bold">{pb.title}</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PILLAR_COLORS[pb.pillar]}`}>{pb.pillar}</span>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {pb.steps.map((step, i) => (
          <div key={i} className="glass rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-all">
            <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full p-4 text-left">
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                  {step.step}
                </span>
                <span className="font-semibold flex-1">{step.title}</span>
                <span className="text-xs text-slate-500 mr-2">{step.owner}</span>
                <span className="text-slate-500">{expanded === i ? '▲' : '▼'}</span>
              </div>
            </button>
            {expanded === i && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-700/50">
                <p className="text-slate-300 text-sm mb-3 leading-relaxed">{step.description}</p>
                <div className="flex items-start gap-2 bg-slate-800/60 rounded-lg p-3">
                  <span className="text-blue-400">📋</span>
                  <div>
                    <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Evidence</p>
                    <p className="text-sm text-slate-400">{step.evidence}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">✅ Definition of Done</p>
        <p className="text-sm text-slate-300">{pb.definition_of_done}</p>
      </div>
    </div>
  )
}

export default function Playbooks() {
  const { id } = useParams()
  const [list, setList] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    axios.get('/api/playbooks').then(res => {
      setList(res.data)
      const initId = id || res.data[0]?.id
      if (initId) loadPlaybook(initId)
    })
  }, [])

  useEffect(() => {
    if (id) loadPlaybook(id)
  }, [id])

  async function loadPlaybook(pbId) {
    const res = await axios.get(`/api/playbooks/${pbId}`)
    setSelected(res.data)
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold mb-2">Security Playbooks</h1>
          <p className="text-slate-400">Step-by-step implementation guides for your Zero Trust journey</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="space-y-2">
            {list.map(pb => (
              <button
                key={pb.id}
                onClick={() => loadPlaybook(pb.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selected?.id === pb.id
                    ? 'border-blue-500/50 bg-blue-600/15 text-white'
                    : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{pb.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{pb.title}</p>
                    <p className={`text-xs ${PILLAR_COLORS[pb.pillar].split(' ')[0]}`}>{pb.pillar}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="glass rounded-2xl p-6">
                <PlaybookDetail pb={selected} />
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center text-slate-500">
                Select a playbook to get started
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
