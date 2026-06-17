import { create } from 'zustand'

export interface Repo {
  id: string
  name: string
  full_name: string
  avatar_url: string
  default_branch: string
}

export interface PullRequest {
  id: string
  number: number
  title: string
  author: {
    login: string
    avatar_url: string
  }
  ci_status: 'success' | 'failure' | 'running' | 'pending' | 'queued'
  reviewers: Array<{
    login: string
    avatar_url: string
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'PENDING'
  }>
  mergeable: boolean | null
  merged: boolean
  created_at: string
  updated_at: string
  repo_id: string
  html_url: string
  head_branch: string
  base_branch: string
  status: 'open' | 'closed' | 'merged'
}

interface DashboardState {
  repos: Repo[]
  pullRequests: Record<string, PullRequest[]>
  loading: boolean
  error: string | null
  flashAddedPRs: Set<string>
  flashUpdatedPRs: Set<string>
  fetchRepos: () => Promise<void>
  fetchPullRequests: (repoId: string) => Promise<void>
  handleRealtimeEvent: (event: { type: string; payload: unknown }) => void
  clearFlashAdded: (prId: string) => void
  clearFlashUpdated: (prId: string) => void
}

function mapPayloadToPR(payload: any): PullRequest {
  const id = String(payload.id ?? payload.pr_id ?? '')
  const repoId = String(payload.repo_id ?? '')
  const authorLogin = payload.author_login ?? payload.user?.login ?? ''
  const authorAvatar = payload.author_avatar_url ?? payload.user?.avatar_url ?? ''
  const isMerged = payload.status === 'merged' || payload.merged === true
  const ciStatus = (payload.ci_status || 'pending') as PullRequest['ci_status']
  const reviewers = (payload.reviewers || []).map((r: any) => ({
    login: r.login,
    avatar_url: r.avatar_url,
    state: r.state as 'APPROVED' | 'CHANGES_REQUESTED' | 'PENDING',
  }))

  return {
    id,
    number: payload.number ?? 0,
    title: payload.title ?? '',
    author: {
      login: authorLogin,
      avatar_url: authorAvatar,
    },
    ci_status: ciStatus,
    reviewers,
    mergeable: null,
    merged: isMerged,
    created_at: payload.created_at ?? new Date().toISOString(),
    updated_at: payload.updated_at ?? new Date().toISOString(),
    repo_id: repoId,
    html_url: payload.html_url ?? '',
    head_branch: payload.head_branch ?? payload.head?.ref ?? '',
    base_branch: payload.base_branch ?? payload.base?.ref ?? '',
    status: (payload.status as 'open' | 'closed' | 'merged') ?? (isMerged ? 'merged' : 'open'),
  }
}

function sortPRsByUpdatedDesc(prs: PullRequest[]): PullRequest[] {
  return [...prs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  repos: [],
  pullRequests: {},
  loading: false,
  error: null,
  flashAddedPRs: new Set(),
  flashUpdatedPRs: new Set(),
  fetchRepos: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/repos')
      if (!res.ok) throw new Error('Failed to fetch repos')
      const repos = (await res.json()).map((r: any) => ({
        id: String(r.id),
        name: r.name,
        full_name: r.full_name,
        avatar_url: r.avatar_url || '',
        default_branch: 'main',
      }))
      set({ repos, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },
  fetchPullRequests: async (repoId: string) => {
    try {
      const res = await fetch(`/api/repos/${repoId}/pull-requests`)
      if (!res.ok) throw new Error('Failed to fetch PRs')
      const raw = await res.json()
      const prs = raw.map((pr: any) => ({
        id: String(pr.id),
        number: pr.number,
        title: pr.title,
        author: { login: pr.author_login, avatar_url: pr.author_avatar_url || '' },
        ci_status: pr.ci_status || 'pending',
        reviewers: pr.reviewers || [],
        mergeable: null,
        merged: pr.status === 'merged',
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        repo_id: String(pr.repo_id),
        html_url: '',
      }))
      set((state) => ({
        pullRequests: { ...state.pullRequests, [repoId]: sortPRsByUpdatedDesc(prs) },
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },
  handleRealtimeEvent: (event) => {
    const { type, payload } = event
    const data = payload as any

    const prEvents = [
      'pull_request_opened',
      'pull_request_updated',
      'pull_request_closed',
      'workflow_run_started',
      'check_suite_completed',
      'pr_created',
      'pr_updated',
    ]

    const pipelineEvents = ['pipeline_run_updated', 'pipeline_run_completed']

    if (prEvents.includes(type)) {
      const pr = mapPayloadToPR(data)
      const repoId = pr.repo_id
      if (!repoId || !pr.id) return

      const existing = get().pullRequests[repoId] || []
      const idx = existing.findIndex((p) => p.id === pr.id)
      const isNew = idx === -1

      let updatedPRs: PullRequest[]

      if (type === 'pull_request_opened' || type === 'pr_created') {
        updatedPRs = sortPRsByUpdatedDesc([pr, ...existing])
      } else if (isNew) {
        updatedPRs = sortPRsByUpdatedDesc([pr, ...existing])
      } else {
        const merged = { ...existing[idx], ...pr }
        updatedPRs = sortPRsByUpdatedDesc([
          ...existing.slice(0, idx),
          merged,
          ...existing.slice(idx + 1),
        ])
      }

      set((state) => {
        const nextFlashAdded = new Set(state.flashAddedPRs)
        const nextFlashUpdated = new Set(state.flashUpdatedPRs)

        if (type === 'pull_request_opened' || type === 'pr_created' || isNew) {
          nextFlashAdded.add(pr.id)
        } else {
          nextFlashUpdated.add(pr.id)
        }

        return {
          pullRequests: { ...state.pullRequests, [repoId]: updatedPRs },
          flashAddedPRs: nextFlashAdded,
          flashUpdatedPRs: nextFlashUpdated,
        }
      })
    } else if (pipelineEvents.includes(type)) {
      const runRepoId = String(data.repo_id || '')
      const runBranch = data.branch
      const runConclusion = data.conclusion
      const runStatus = data.status
      if (!runRepoId || !runBranch) return

      let newCiStatus: PullRequest['ci_status'] = 'pending'
      if (runStatus === 'completed') {
        newCiStatus = runConclusion === 'success' ? 'success' : 'failure'
      } else if (runStatus === 'in_progress') {
        newCiStatus = 'running'
      } else if (runStatus === 'queued') {
        newCiStatus = 'pending'
      }

      const existing = get().pullRequests[runRepoId] || []
      const prIdx = existing.findIndex((p) => p.head_branch === runBranch && p.status === 'open')
      if (prIdx === -1) return

      const updatedPR = { ...existing[prIdx], ci_status: newCiStatus, updated_at: new Date().toISOString() }
      const updatedPRs = sortPRsByUpdatedDesc([
        ...existing.slice(0, prIdx),
        updatedPR,
        ...existing.slice(prIdx + 1),
      ])

      set((state) => {
        const nextFlashUpdated = new Set(state.flashUpdatedPRs)
        nextFlashUpdated.add(updatedPR.id)
        return {
          pullRequests: { ...state.pullRequests, [runRepoId]: updatedPRs },
          flashUpdatedPRs: nextFlashUpdated,
        }
      })
    }
  },
  clearFlashAdded: (prId: string) => {
    set((state) => {
      const next = new Set(state.flashAddedPRs)
      next.delete(prId)
      return { flashAddedPRs: next }
    })
  },
  clearFlashUpdated: (prId: string) => {
    set((state) => {
      const next = new Set(state.flashUpdatedPRs)
      next.delete(prId)
      return { flashUpdatedPRs: next }
    })
  },
}))
