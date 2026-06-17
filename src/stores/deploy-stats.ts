import { create } from 'zustand'

export interface DeployStat {
  date: string
  total: number
  successful: number
  failed: number
  success_rate: number
}

export interface RepoDeployStats {
  repo_id: string
  repo_name: string
  stats: DeployStat[]
  overall: {
    total_deploys: number
    successful: number
    failed: number
    success_rate: number
    avg_duration_minutes: number
  }
}

export interface OverallStats {
  total_deploys: number
  successful: number
  failed: number
  success_rate: number
  avg_duration_minutes: number
}

interface DeployStatsState {
  stats: DeployStat[]
  byRepo: RepoDeployStats[]
  overallStats: OverallStats | null
  loading: boolean
  fetchStats: (repoIds: string[], from: string, to: string, granularity: 'day' | 'week' | 'month') => Promise<void>
}

const mergeFrequencyAndRate = (
  frequency: Array<{ period: string; count: number }>,
  successRate: Array<{ period: string; total: number; successes: number; rate: number }>
): DeployStat[] => {
  const stats = frequency.map((f) => ({
    date: f.period,
    total: f.count,
    successful: 0,
    failed: 0,
    success_rate: 0,
  }))
  const rateMap: Record<string, any> = {}
  for (const sr of successRate) {
    rateMap[sr.period] = sr
  }
  return stats.map((s) => {
    const rate = rateMap[s.date]
    return rate
      ? {
          date: s.date,
          total: rate.total || s.total,
          successful: rate.successes || 0,
          failed: (rate.total || s.total) - (rate.successes || 0),
          success_rate: rate.rate || 0,
        }
      : s
  })
}

export const useDeployStatsStore = create<DeployStatsState>((set) => ({
  stats: [],
  byRepo: [],
  overallStats: null,
  loading: false,
  fetchStats: async (repoIds: string[], from: string, to: string, granularity: 'day' | 'week' | 'month') => {
    set({ loading: true })
    try {
      const params = new URLSearchParams({
        repoIds: repoIds.join(','),
        from,
        to,
        granularity,
      })
      const res = await fetch(`/api/deploy-stats?${params}`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      const raw = await res.json()

      const stats = mergeFrequencyAndRate(raw.frequency || [], raw.success_rate || [])

      const byRepo: RepoDeployStats[] = (raw.by_repo || []).map((repo: any) => ({
        repo_id: String(repo.repo_id),
        repo_name: repo.repo_name,
        stats: mergeFrequencyAndRate(repo.frequency || [], repo.success_rate || []),
        overall: {
          total_deploys: repo.overall.total_deploys,
          successful: repo.overall.successful,
          failed: repo.overall.failed,
          success_rate: repo.overall.success_rate,
          avg_duration_minutes: repo.overall.avg_duration_minutes,
        },
      }))

      const overallStats: OverallStats | null = raw.overall
        ? {
            total_deploys: raw.overall.total_deploys,
            successful: raw.overall.successful,
            failed: raw.overall.failed,
            success_rate: raw.overall.success_rate,
            avg_duration_minutes: raw.overall.avg_duration_minutes,
          }
        : null

      set({ stats, byRepo, overallStats, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
