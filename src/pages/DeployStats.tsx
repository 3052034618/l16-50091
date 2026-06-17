import { useEffect, useState } from 'react'
import { Calendar, Filter } from 'lucide-react'
import { useDeployStatsStore } from '@/stores/deploy-stats'
import { useDashboardStore } from '@/stores/dashboard'
import DeployChart from '@/components/DeployChart'

export default function DeployStats() {
  const repos = useDashboardStore((s) => s.repos)
  const fetchRepos = useDashboardStore((s) => s.fetchRepos)
  const stats = useDeployStatsStore((s) => s.stats)
  const loading = useDeployStatsStore((s) => s.loading)
  const fetchStats = useDeployStatsStore((s) => s.fetchStats)

  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(new Set())
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false)

  useEffect(() => {
    if (repos.length === 0) fetchRepos()
  }, [repos.length, fetchRepos])

  useEffect(() => {
    if (repos.length > 0 && selectedRepoIds.size === 0) {
      setSelectedRepoIds(new Set(repos.map((r) => r.id)))
    }
  }, [repos, selectedRepoIds.size])

  useEffect(() => {
    if (selectedRepoIds.size > 0) {
      fetchStats(Array.from(selectedRepoIds), from, to, granularity)
    }
  }, [selectedRepoIds, from, to, granularity, fetchStats])

  const toggleRepo = (repoId: string) => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev)
      if (next.has(repoId)) next.delete(repoId)
      else next.add(repoId)
      return next
    })
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Deploy Statistics</h1>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative">
          <button
            onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
          >
            <Filter size={14} />
            <span>Repos ({selectedRepoIds.size})</span>
          </button>
          {repoDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-10 py-2">
              {repos.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--border)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRepoIds.has(r.id)}
                    onChange={() => toggleRepo(r.id)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{r.full_name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--text-secondary)]" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
          <span className="text-[var(--text-secondary)]">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <select
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as 'day' | 'week' | 'month')}
          className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
      </div>

      <DeployChart data={stats} loading={loading} />
    </div>
  )
}
