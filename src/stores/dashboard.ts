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
}

interface DashboardState {
  repos: Repo[]
  pullRequests: Record<string, PullRequest[]>
  loading: boolean
  error: string | null
  fetchRepos: () => Promise<void>
  fetchPullRequests: (repoId: string) => Promise<void>
  handleRealtimeEvent: (event: { type: string; payload: unknown }) => void
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  repos: [],
  pullRequests: {},
  loading: false,
  error: null,
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
        pullRequests: { ...state.pullRequests, [repoId]: prs },
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },
  handleRealtimeEvent: (event) => {
    if (event.type === 'pr_updated' || event.type === 'pr_created') {
      const payload = event.payload as PullRequest
      const repoId = payload.repo_id
      const existing = get().pullRequests[repoId] || []
      const idx = existing.findIndex((pr) => pr.id === payload.id)
      const updated =
        idx >= 0
          ? [...existing.slice(0, idx), payload, ...existing.slice(idx + 1)]
          : [payload, ...existing]
      set((state) => ({
        pullRequests: { ...state.pullRequests, [repoId]: updated },
      }))
    }
  },
}))
