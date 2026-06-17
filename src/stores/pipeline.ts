import { create } from 'zustand'

export interface PipelineStep {
  name: string
  status: 'success' | 'failure' | 'running' | 'pending' | 'queued'
  duration_seconds: number | null
  started_at: string | null
  completed_at: string | null
}

export interface PipelineJob {
  id: string
  name: string
  stage: 'build' | 'test' | 'deploy'
  status: 'success' | 'failure' | 'running' | 'pending' | 'queued'
  duration_seconds: number | null
  started_at: string | null
  completed_at: string | null
  steps: PipelineStep[]
}

export interface PipelineRun {
  id: string
  run_number: number
  status: 'success' | 'failure' | 'running' | 'pending' | 'queued'
  branch: string
  commit: string
  commit_message: string
  author: string
  triggered_at: string
  completed_at: string | null
  jobs: PipelineJob[]
  repo_id: string
}

interface PipelineState {
  runs: PipelineRun[]
  selectedRun: PipelineRun | null
  loading: boolean
  fetchRuns: (repoId: string) => Promise<void>
  selectRun: (runId: string) => void
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  runs: [],
  selectedRun: null,
  loading: false,
  fetchRuns: async (repoId: string) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/pipeline/${repoId}/runs`)
      if (!res.ok) throw new Error('Failed to fetch runs')
      const raw = await res.json()
      const runs = raw.map((run: any) => {
        let runStatus: PipelineRun['status'] = 'pending'
        if (run.status === 'completed') {
          runStatus = run.conclusion === 'success' ? 'success' : 'failure'
        } else if (run.status === 'in_progress') {
          runStatus = 'running'
        } else if (run.status === 'queued') {
          runStatus = 'queued'
        }
        return {
          id: String(run.id),
          run_number: run.run_number,
          status: runStatus,
          branch: run.branch,
          commit: run.commit_sha,
          commit_message: run.event,
          author: '',
          triggered_at: run.created_at,
          completed_at: run.updated_at,
          repo_id: String(run.repo_id),
          jobs: (run.jobs || []).map((job: any) => {
            let jobStatus: PipelineJob['status'] = 'pending'
            if (job.status === 'completed') {
              jobStatus = job.conclusion === 'success' ? 'success' : 'failure'
            } else if (job.status === 'in_progress') {
              jobStatus = 'running'
            } else if (job.status === 'queued') {
              jobStatus = 'queued'
            } else if (job.status === 'skipped') {
              jobStatus = 'queued'
            }
            return {
              id: String(job.id),
              name: job.name,
              stage: job.stage,
              status: jobStatus,
              duration_seconds: job.started_at && job.completed_at
                ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                : null,
              started_at: job.started_at,
              completed_at: job.completed_at,
              steps: [],
            }
          }),
        }
      })
      set({ runs, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  selectRun: (runId: string) => {
    const run = get().runs.find((r) => r.id === runId) || null
    set({ selectedRun: run })
  },
}))
