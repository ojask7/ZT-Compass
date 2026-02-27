import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import QuickScan from './pages/QuickScan'
import Dashboard from './pages/Dashboard'
import Roadmap from './pages/Roadmap'
import Playbooks from './pages/Playbooks'
import RegionOverlay from './pages/RegionOverlay'

function NavBar() {
  const location = useLocation()
  const isLanding = location.pathname === '/'
  if (isLanding) return null
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-blue-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🧭</span>
            <span className="font-bold text-lg gradient-text">ZT Compass</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-4">
            <NavLink to="/playbooks">Playbooks</NavLink>
            <NavLink to="/regions/CH">Region Guide</NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ to, children }) {
  const location = useLocation()
  const active = location.pathname.startsWith(to)
  return (
    <Link to={to} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
      {children}
    </Link>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/scan" element={<QuickScan />} />
        <Route path="/dashboard/:sessionId" element={<Dashboard />} />
        <Route path="/roadmap/:sessionId" element={<Roadmap />} />
        <Route path="/playbooks" element={<Playbooks />} />
        <Route path="/playbooks/:id" element={<Playbooks />} />
        <Route path="/regions/:region" element={<RegionOverlay />} />
      </Routes>
    </div>
  )
}
