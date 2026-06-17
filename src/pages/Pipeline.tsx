import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, GitBranch } from 'lucide-react'
import { usePipelineStore } from '@/stores/pipeline'
import { useDashboardStore } from '@/stores/dashboard'
import PipelineStageColumn from '@/components/PipelineStageColumn'
import StatusBadge from '@/components/StatusBadge'

export default function Pipeline() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const repoIdParam = params.get('repo')

  const repos = useDashboardStore((s) => s.repos)
  const fetchRepos = useDashboardStore((s) => s.fetchRepos)
  const runs = usePipelineStore((s) => s.runs)
  const selectedRun = usePipelineStore((s) => s.selectedRun)
  const loading = usePipelineStore((s) => s.loading)
  const fetchRuns = usePipelineStore((s) => s.fetchRuns)
  const selectRun = usePipelineStore((s) => s.selectRun)

  const [selectedRepoId, setSelectedRepoId] = useState<string>('')
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)

  useEffect(() => {
    if (repos.length === 0) fetchRepos()
  }, [repos.length, fetchRepos])

  useEffect(() => {
    if (repos.length > 0 && !selectedRepoId) {
      const id = repoIdParam || repos[0].id
      setSelectedRepoId(id)
    }
  }, [repos, selectedRepoId, repoIdParam])

  useEffect(() => {
    if (selectedRepoId) {
      fetchRuns(selectedRepoId)
    }
  }, [selectedRepoId, fetchRuns])

  useEffect(() => {
    if (runs.length > 0 && !selectedRun) {
      selectRun(runs[0].id)
    }
  }, [runs, selectedRun, selectRun])

  const buildJobs = (selectedRun?.jobs || []).filter((j) => j.stage === 'build')
  const testJobs = (selectedRun?.jobs || []).filter((j) => j.stage === 'test')
  const deployJobs = (selectedRun?.jobs || []).filter((j) => j.stage === 'deploy')

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pipeline</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          value={selectedRepoId}
          onChange={(e) => {
            setSelectedRepoId(e.target.value)
            selectRun(runs[0]?.id || '')
          }}
          className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>

        {selectedRun && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
            <GitBranch size={14} className="text-[var(--accent)]" />
            <span className="text-sm text-[var(--text-primary)]">
              Run #{selectedRun.run_number}
            </span>
            <StatusBadge status={selectedRun.status} />
            <span className="text-xs text-[var(--text-secondary)] ml-2">
              {selectedRun.branch}
            </span>
          </div>
        )}
      </div>

      {runs.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => selectRun(run.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedRun?.id === run.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
              }`}
            >
              #{run.run_number}
              <StatusBadge status={run.status} />
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton h-8 w-24" />
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-24 w-full" />
            </div>
          ))}
        </div>
      ) : selectedRun ? (
        <>
          <div className="card p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {selectedRun.commit_message?.split('\n')[0]}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
                  {selectedRun.commit?.slice(0, 7)} · {selectedRun.author} · {selectedRun.branch}
                </p>
              </div>
              <StatusBadge status={selectedRun.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PipelineStageColumn
              stage="build"
              jobs={buildJobs}
              expandedJobId={expandedJobId}
              onToggleJob={setExpandedJobId}
            />
            <PipelineStageColumn
              stage="test"
              jobs={testJobs}
              expandedJobId={expandedJobId}
              onToggleJob={setExpandedJobId}
            />
            <PipelineStageColumn
              stage="deploy"
              jobs={deployJobs}
              expandedJobId={expandedJobId}
              onToggleJob={setExpandedJobId}
            />
          </div>
        </>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-secondary)]">No pipeline runs found</p>
        </div>
      )}
    </div>
  )
}
