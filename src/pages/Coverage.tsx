import { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { useCoverageStore } from '@/stores/coverage'
import { useDashboardStore } from '@/stores/dashboard'
import CoverageChart from '@/components/CoverageChart'

function TrendIcon({ current, previous }: { current: number; previous?: number }) {
  if (previous == null) return <Minus size={14} className="text-[var(--text-secondary)]" />
  const diff = current - previous
  if (diff > 0.5) return <ArrowUp size={14} className="text-[var(--success)]" />
  if (diff < -0.5) return <ArrowDown size={14} className="text-[var(--error)]" />
  return <Minus size={14} className="text-[var(--text-secondary)]" />
}

export default function Coverage() {
  const repos = useDashboardStore((s) => s.repos)
  const fetchRepos = useDashboardStore((s) => s.fetchRepos)
  const coverageData = useCoverageStore((s) => s.coverageData)
  const branches = useCoverageStore((s) => s.branches)
  const selectedBranch = useCoverageStore((s) => s.selectedBranch)
  const loading = useCoverageStore((s) => s.loading)
  const fetchCoverage = useCoverageStore((s) => s.fetchCoverage)
  const fetchBranches = useCoverageStore((s) => s.fetchBranches)
  const setBranch = useCoverageStore((s) => s.setBranch)

  const [selectedRepoId, setSelectedRepoId] = useState<string>('')
  const [days, setDays] = useState(30)

  useEffect(() => {
    if (repos.length === 0) fetchRepos()
  }, [repos.length, fetchRepos])

  useEffect(() => {
    if (repos.length > 0 && !selectedRepoId) {
      setSelectedRepoId(repos[0].id)
    }
  }, [repos, selectedRepoId])

  useEffect(() => {
    if (selectedRepoId) {
      fetchBranches(selectedRepoId)
      fetchCoverage(selectedRepoId, selectedBranch, days)
    }
  }, [selectedRepoId, selectedBranch, days, fetchCoverage, fetchBranches])

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Coverage</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          value={selectedRepoId}
          onChange={(e) => setSelectedRepoId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>

        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {branches.map((b) => (
          <button
            key={b.branch}
            onClick={() => setBranch(b.branch)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedBranch === b.branch
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
            }`}
          >
            {b.branch}
          </button>
        ))}
      </div>

      <CoverageChart data={coverageData} loading={loading} />

      <div className="mt-6">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Branch Summary</h3>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Branch</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Line Coverage</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Branch Coverage</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Last Updated</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b, idx) => {
                const prev = idx > 0 ? branches[idx - 1] : undefined
                return (
                  <tr
                    key={b.branch}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)] transition-colors cursor-pointer"
                    onClick={() => setBranch(b.branch)}
                  >
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-medium">
                      {b.branch}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                      {b.line_coverage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                      {b.branch_coverage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {new Date(b.last_updated).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <TrendIcon current={b.line_coverage} previous={prev?.line_coverage} />
                        <span
                          className={`text-xs ${
                            prev && b.line_coverage > prev.line_coverage
                              ? 'text-[var(--success)]'
                              : prev && b.line_coverage < prev.line_coverage
                              ? 'text-[var(--error)]'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {prev ? (b.line_coverage - prev.line_coverage).toFixed(1) : '—'}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
