import { useEffect, useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useDashboardStore } from '@/stores/dashboard'
import { useWebSocket } from '@/hooks/useWebSocket'
import PRCard from '@/components/PRCard'

export default function Dashboard() {
  const repos = useDashboardStore((s) => s.repos)
  const pullRequests = useDashboardStore((s) => s.pullRequests)
  const loading = useDashboardStore((s) => s.loading)
  const flashAddedPRs = useDashboardStore((s) => s.flashAddedPRs)
  const flashUpdatedPRs = useDashboardStore((s) => s.flashUpdatedPRs)
  const fetchRepos = useDashboardStore((s) => s.fetchRepos)
  const fetchPullRequests = useDashboardStore((s) => s.fetchPullRequests)
  const handleRealtimeEvent = useDashboardStore((s) => s.handleRealtimeEvent)
  const clearFlashAdded = useDashboardStore((s) => s.clearFlashAdded)
  const clearFlashUpdated = useDashboardStore((s) => s.clearFlashUpdated)
  const { lastEvent } = useWebSocket()

  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const prevEventRef = useRef<number>(0)

  useEffect(() => {
    fetchRepos()
  }, [fetchRepos])

  useEffect(() => {
    if (repos.length > 0 && selectedRepos.size === 0) {
      const allIds = new Set(repos.map((r) => r.id))
      setSelectedRepos(allIds)
      repos.forEach((r) => fetchPullRequests(r.id))
    }
  }, [repos, selectedRepos.size, fetchPullRequests])

  useEffect(() => {
    if (lastEvent && lastEvent.timestamp !== prevEventRef.current) {
      prevEventRef.current = lastEvent.timestamp
      handleRealtimeEvent(lastEvent)
    }
  }, [lastEvent, handleRealtimeEvent])

  useEffect(() => {
    flashAddedPRs.forEach((prId) => {
      setTimeout(() => {
        clearFlashAdded(prId)
      }, 1500)
    })
  }, [flashAddedPRs, clearFlashAdded])

  useEffect(() => {
    flashUpdatedPRs.forEach((prId) => {
      setTimeout(() => {
        clearFlashUpdated(prId)
      }, 700)
    })
  }, [flashUpdatedPRs, clearFlashUpdated])

  const toggleRepo = (repoId: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev)
      if (next.has(repoId)) {
        next.delete(repoId)
      } else {
        next.add(repoId)
        if (!pullRequests[repoId]) {
          fetchPullRequests(repoId)
        }
      }
      return next
    })
  }

  const filteredRepos = repos.filter((r) => selectedRepos.has(r.id))

  const allPRs = filteredRepos.flatMap((r) =>
    (pullRequests[r.id] || [])
      .filter((pr) =>
        search
          ? pr.title.toLowerCase().includes(search.toLowerCase()) ||
            pr.author.login.toLowerCase().includes(search.toLowerCase())
          : true
      )
      .map((pr) => ({ ...pr, repo_id: r.id }))
  )

  const groupedPRs = filteredRepos
    .map((repo) => ({
      repo,
      prs: (pullRequests[repo.id] || []).filter((pr) =>
        search
          ? pr.title.toLowerCase().includes(search.toLowerCase()) ||
            pr.author.login.toLowerCase().includes(search.toLowerCase())
          : true
      ),
    }))
    .filter((g) => g.prs.length > 0)

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search PRs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {repos.map((repo) => (
          <button
            key={repo.id}
            onClick={() => toggleRepo(repo.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedRepos.has(repo.id)
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]'
            }`}
          >
            {repo.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="skeleton h-6 w-40 mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="card p-4">
                    <div className="skeleton h-4 w-3/4 mb-3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : groupedPRs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-secondary)]">
            {search ? 'No PRs match your search' : 'No pull requests found'}
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {groupedPRs.map(({ repo, prs }) => (
            <div key={repo.id}>
              <div className="flex items-center gap-2 mb-3">
                <img src={repo.avatar_url} alt={repo.name} className="w-5 h-5 rounded" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{repo.full_name}</h2>
                <span className="text-xs text-[var(--text-secondary)]">({prs.length} PRs)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {prs.map((pr) => (
                  <PRCard
                    key={pr.id}
                    pr={pr}
                    flashNew={flashAddedPRs.has(pr.id)}
                    flashUpdate={flashUpdatedPRs.has(pr.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
