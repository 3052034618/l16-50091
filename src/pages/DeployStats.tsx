import { useEffect, useState } from 'react'
import { Calendar, Filter, BarChart3, Layers } from 'lucide-react'
import { useDeployStatsStore } from '@/stores/deploy-stats'
import { useDashboardStore } from '@/stores/dashboard'
import DeployChart, { type ChartSeries } from '@/components/DeployChart'

const REPO_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#F97316']

export default function DeployStats() {
  const repos = useDashboardStore((s) => s.repos)
  const fetchRepos = useDashboardStore((s) => s.fetchRepos)
  const stats = useDeployStatsStore((s) => s.stats)
  const byRepo = useDeployStatsStore((s) => s.byRepo)
  const overallStats = useDeployStatsStore((s) => s.overallStats)
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
  const [viewMode, setViewMode] = useState<'combined' | 'byRepo'>('combined')

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

  const series: ChartSeries[] = byRepo.map((repo, idx) => ({
    name: repo.repo_name,
    data: repo.stats,
    color: REPO_COLORS[idx % REPO_COLORS.length],
  }))

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

        <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-1">
          <button
            onClick={() => setViewMode('combined')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'combined'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers size={14} />
            Combined
          </button>
          <button
            onClick={() => setViewMode('byRepo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'byRepo'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BarChart3 size={14} />
            By Repo
          </button>
        </div>
      </div>

      {viewMode === 'combined' ? (
        <DeployChart data={stats} overallStats={overallStats} loading={loading} />
      ) : (
        <div className="space-y-6">
          <DeployChart series={series} overallStats={overallStats} loading={loading} />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {byRepo.map((repo) => (
              <div key={repo.repo_id} className="card p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  {repo.repo_name}
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      {repo.overall.total_deploys}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[var(--success)]">
                      {repo.overall.successful}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Success</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      {repo.overall.success_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Rate</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
