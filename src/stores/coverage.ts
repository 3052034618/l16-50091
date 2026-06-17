import { create } from 'zustand'

export interface CoveragePoint {
  date: string
  line_coverage: number
  branch_coverage: number
}

export interface BranchCoverage {
  branch: string
  line_coverage: number
  branch_coverage: number
  last_updated: string
}

interface CoverageState {
  coverageData: CoveragePoint[]
  branches: BranchCoverage[]
  selectedBranch: string
  loading: boolean
  fetchCoverage: (repoId: string, branch: string, days: number) => Promise<void>
  fetchBranches: (repoId: string) => Promise<void>
  setBranch: (branch: string) => void
}

export const useCoverageStore = create<CoverageState>((set) => ({
  coverageData: [],
  branches: [],
  selectedBranch: 'main',
  loading: false,
  fetchCoverage: async (repoId: string, branch: string, days: number) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/coverage/${repoId}?branch=${branch}&days=${days}`)
      if (!res.ok) throw new Error('Failed to fetch coverage')
      const raw = await res.json()
      const data = raw.map((r: any) => ({
        date: r.recorded_at,
        line_coverage: r.line_coverage,
        branch_coverage: r.branch_coverage,
      }))
      set({ coverageData: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  fetchBranches: async (repoId: string) => {
    try {
      const res = await fetch(`/api/coverage/${repoId}/branches`)
      if (!res.ok) throw new Error('Failed to fetch branches')
      const raw = await res.json()
      const branches = raw.map((b: any) => ({
        branch: b.branch,
        line_coverage: b.max_line_coverage || b.avg_line_coverage || 0,
        branch_coverage: b.avg_branch_coverage || 0,
        last_updated: b.latest || '',
      }))
      set({ branches })
    } catch {
      // silently fail
    }
  },
  setBranch: (branch: string) => set({ selectedBranch: branch }),
}))
