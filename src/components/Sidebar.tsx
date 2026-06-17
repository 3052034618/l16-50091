import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, GitBranch, BarChart3, Play, TrendingUp, Menu, X } from 'lucide-react'
import { useWebSocketStore } from '@/stores/websocket'
import { useState } from 'react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/coverage', label: 'Coverage', icon: BarChart3 },
  { to: '/workflows', label: 'Workflows', icon: Play },
  { to: '/deploy-stats', label: 'Deploy Stats', icon: TrendingUp },
]

export default function Sidebar() {
  const connected = useWebSocketStore((s) => s.connected)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const navContent = (
    <nav className="flex flex-col gap-1 px-3 mt-6 flex-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.to
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]'
            }`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 h-screen w-60 bg-[var(--bg-card)] border-r border-[var(--border)] z-40 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <GitBranch size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-[var(--text-primary)]">DevOps Hub</span>
        </div>

        {navContent}

        <div className="px-5 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-[var(--success)]' : 'bg-[var(--error)]'
              } ${connected ? 'status-pulse' : ''}`}
            />
            <span>{connected ? 'WebSocket Connected' : 'WebSocket Disconnected'}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
