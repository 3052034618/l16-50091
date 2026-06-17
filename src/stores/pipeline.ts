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
  updateRunFromEvent: (eventData: any) => void
}

function normalizeStepStatus(step: any): PipelineStep['status'] {
  if (step.status === 'completed') {
    return step.conclusion === 'success' ? 'success' : 'failure'
  } else if (step.status === 'in_progress') {
    return 'running'
  } else if (step.status === 'queued') {
    return 'queued'
  }
  return 'pending'
}

function normalizeJobStatus(job: any): PipelineJob['status'] {
  if (job.status === 'completed') {
    return job.conclusion === 'success' ? 'success' : 'failure'
  } else if (job.status === 'in_progress') {
    return 'running'
  } else if (job.status === 'queued') {
    return 'queued'
  } else if (job.status === 'skipped') {
    return 'queued'
  }
  return 'pending'
}

function normalizeRun(run: any): PipelineRun {
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
    jobs: (run.jobs || []).map((job: any) => ({
      id: String(job.id),
      name: job.name,
      stage: job.stage,
      status: normalizeJobStatus(job),
      duration_seconds: job.started_at && job.completed_at
        ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
        : null,
      started_at: job.started_at,
      completed_at: job.completed_at,
      steps: (job.steps || []).map((step: any) => ({
        name: step.name,
        status: normalizeStepStatus(step),
        duration_seconds: step.started_at && step.completed_at
          ? Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000)
          : null,
        started_at: step.started_at,
        completed_at: step.completed_at,
      })),
    })),
  }
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
      const runs = raw.map(normalizeRun)
      set({ runs, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  selectRun: (runId: string) => {
    const run = get().runs.find((r) => r.id === runId) || null
    set({ selectedRun: run })
  },
  updateRunFromEvent: (eventData: any) => {
    if (!eventData || eventData.id === undefined) return
    const normalized = normalizeRun(eventData)
    const existingIndex = get().runs.findIndex((r) => r.id === normalized.id)
    let newRuns: PipelineRun[]
    if (existingIndex >= 0) {
      const existing = get().runs[existingIndex]
      const merged: PipelineRun = {
        ...existing,
        ...normalized,
        jobs: normalized.jobs && normalized.jobs.length > 0
          ? normalized.jobs.map((newJob) => {
            const oldJob = existing.jobs.find((j) => j.id === newJob.id || j.name === newJob.name)
            if (!oldJob) return newJob
            return {
              ...oldJob,
              ...newJob,
              steps: newJob.steps && newJob.steps.length > 0 ? newJob.steps : oldJob.steps,
            }
          })
          : existing.jobs,
      }
      newRuns = [...get().runs]
      newRuns[existingIndex] = merged
    } else {
      newRuns = [normalized, ...get().runs]
    }
    const selectedRun = get().selectedRun
    let newSelectedRun = selectedRun
    if (selectedRun && selectedRun.id === normalized.id) {
      const existingSel = selectedRun
      newSelectedRun = {
        ...existingSel,
        ...normalized,
        jobs: normalized.jobs && normalized.jobs.length > 0
          ? normalized.jobs.map((newJob) => {
            const oldJob = existingSel.jobs.find((j) => j.id === newJob.id || j.name === newJob.name)
            if (!oldJob) return newJob
            return {
              ...oldJob,
              ...newJob,
              steps: newJob.steps && newJob.steps.length > 0 ? newJob.steps : oldJob.steps,
            }
          })
          : existingSel.jobs,
      }
    }
    set({ runs: newRuns, selectedRun: newSelectedRun })
  },
}))
