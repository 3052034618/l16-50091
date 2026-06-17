import { create } from 'zustand'

export interface Workflow {
  id: string
  name: string
  path: string
  state: 'active' | 'disabled_manually' | 'disabled_inactivity'
  last_run_status: 'success' | 'failure' | 'running' | 'pending' | 'queued' | null
  last_run_at: string | null
}

interface DispatchResult {
  success: boolean
  message: string
  error_code?: string
  error_detail?: string
  mode?: string
  run_id?: string
  deploy_id?: string
}

interface WorkflowsState {
  workflows: Workflow[]
  dispatching: boolean
  lastDispatchResult: DispatchResult | null
  currentRunId: string | null
  currentWorkflowId: string | null
  fetchWorkflows: (repoId: string) => Promise<void>
  dispatchWorkflow: (repoId: string, workflowId: string, ref: string, inputs?: Record<string, string>, forceDemo?: boolean) => Promise<DispatchResult>
  handleRealtimeEvent: (event: { type: string; payload: any }) => void
  clearCurrentRun: () => void
}

const mapStatusToRunStatus = (status: string, conclusion: string | null): 'success' | 'failure' | 'running' | 'pending' | 'queued' | null => {
  if (status === 'queued') return 'queued'
  if (status === 'in_progress') return 'running'
  if (status === 'completed') {
    return conclusion === 'success' ? 'success' : 'failure'
  }
  if (status === 'pending') return 'pending'
  return null
}

export const useWorkflowsStore = create<WorkflowsState>((set, get) => ({
  workflows: [],
  dispatching: false,
  lastDispatchResult: null,
  currentRunId: null,
  currentWorkflowId: null,
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
  dispatchWorkflow: async (repoId: string, workflowId: string, ref: string, inputs?: Record<string, string>, forceDemo?: boolean) => {
    set({ dispatching: true, lastDispatchResult: null })
    try {
      const res = await fetch(`/api/workflows/${repoId}/${workflowId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, inputs, force_demo: forceDemo }),
      })
      let data: any
      try {
        data = await res.json()
      } catch {
        data = { error: 'Dispatch failed' }
      }
      if (!res.ok) {
        const result: DispatchResult = {
          success: false,
          message: data.error || 'Dispatch failed',
          error_code: data.error_code,
          error_detail: data.error_detail,
          mode: data.mode,
        }
        set({
          dispatching: false,
          lastDispatchResult: result,
        })
        return result
      }
      const successResult: DispatchResult = {
        success: true,
        message: data.message || (data.mode === 'demo' ? 'Workflow dispatched in Demo Mode' : 'Workflow dispatched successfully'),
        run_id: String(data.run_id),
        deploy_id: String(data.deploy_id),
        mode: data.mode,
      }
      set((state) => {
        const updatedWorkflows = state.workflows.map((wf) => {
          if (wf.id === workflowId) {
            return {
              ...wf,
              last_run_status: 'queued' as const,
              last_run_at: new Date().toISOString(),
            }
          }
          return wf
        })
        return {
          dispatching: false,
          lastDispatchResult: successResult,
          currentRunId: String(data.run_id),
          currentWorkflowId: workflowId,
          workflows: updatedWorkflows,
        }
      })
      return successResult
    } catch (e) {
      const result: DispatchResult = {
        success: false,
        message: (e as Error).message,
      }
      set({
        dispatching: false,
        lastDispatchResult: result,
      })
      return result
    }
  },
  handleRealtimeEvent: (event) => {
    const { currentRunId, currentWorkflowId } = get()
    if (!currentRunId || !currentWorkflowId) return

    const eventTypes = ['pipeline_run_created', 'pipeline_run_updated', 'pipeline_run_completed']
    if (!eventTypes.includes(event.type)) return

    const payload = event.payload
    if (String(payload.id) !== currentRunId) return

    const runStatus = mapStatusToRunStatus(payload.status, payload.conclusion)
    if (runStatus) {
      set((state) => ({
        workflows: state.workflows.map((wf) => {
          if (wf.id === currentWorkflowId) {
            return {
              ...wf,
              last_run_status: runStatus,
              last_run_at: payload.updated_at || wf.last_run_at,
            }
          }
          return wf
        }),
      }))
    }
  },
  clearCurrentRun: () => {
    set({ currentRunId: null, currentWorkflowId: null })
  },
}))
