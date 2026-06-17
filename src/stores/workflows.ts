import { create } from 'zustand'

export interface Workflow {
  id: string
  name: string
  path: string
  state: 'active' | 'disabled_manually' | 'disabled_inactivity'
  last_run_status: 'success' | 'failure' | 'running' | 'pending' | 'queued' | null
  last_run_at: string | null
}

interface WorkflowsState {
  workflows: Workflow[]
  dispatching: boolean
  lastDispatchResult: { success: boolean; message: string } | null
  fetchWorkflows: (repoId: string) => Promise<void>
  dispatchWorkflow: (repoId: string, workflowId: string, ref: string, inputs?: Record<string, string>) => Promise<void>
}

export const useWorkflowsStore = create<WorkflowsState>((set) => ({
  workflows: [],
  dispatching: false,
  lastDispatchResult: null,
  fetchWorkflows: async (repoId: string) => {
    try {
      const res = await fetch(`/api/workflows/${repoId}`)
      if (!res.ok) throw new Error('Failed to fetch workflows')
      const raw = await res.json()
      const workflows = raw.map((w: any) => ({
        id: String(w.id),
        name: w.name,
        path: w.path || '',
        state: w.state === 'active' ? 'active' : 'disabled_manually',
        last_run_status: null,
        last_run_at: null,
      }))
      set({ workflows })
    } catch {
      // silently fail
    }
  },
  dispatchWorkflow: async (repoId: string, workflowId: string, ref: string, inputs?: Record<string, string>) => {
    set({ dispatching: true, lastDispatchResult: null })
    try {
      const res = await fetch(`/api/workflows/${repoId}/${workflowId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, inputs }),
      })
      if (!res.ok) throw new Error('Dispatch failed')
      set({ dispatching: false, lastDispatchResult: { success: true, message: 'Workflow dispatched successfully' } })
    } catch (e) {
      set({ dispatching: false, lastDispatchResult: { success: false, message: (e as Error).message } })
    }
  },
}))
