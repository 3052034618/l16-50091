import { create } from 'zustand'

export interface DeployStat {
  date: string
  total: number
  successful: number
  failed: number
  success_rate: number
}

interface DeployStatsState {
  stats: DeployStat[]
  loading: boolean
  fetchStats: (repoIds: string[], from: string, to: string, granularity: 'day' | 'week' | 'month') => Promise<void>
}

export const useDeployStatsStore = create<DeployStatsState>((set) => ({
  stats: [],
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
      const stats = (raw.frequency || []).map((f: any) => ({
        date: f.period,
        total: f.count,
        successful: 0,
        failed: 0,
        success_rate: 0,
      }))
      const rateMap: Record<string, any> = {}
      for (const sr of raw.success_rate || []) {
        rateMap[sr.period] = sr
      }
      const merged = stats.map((s: any) => {
        const rate = rateMap[s.date]
        return rate ? {
          date: s.date,
          total: rate.total || s.total,
          successful: rate.successes || 0,
          failed: (rate.total || s.total) - (rate.successes || 0),
          success_rate: rate.rate || 0,
        } : s
      })
      set({ stats: merged, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
