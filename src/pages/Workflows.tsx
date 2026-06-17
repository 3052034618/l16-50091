import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, X, CheckCircle2, AlertCircle, Loader2, ExternalLink, Zap } from 'lucide-react'
import { useWorkflowsStore } from '@/stores/workflows'
import { useDashboardStore } from '@/stores/dashboard'
import { useWebSocketListener } from '@/hooks/useWebSocket'
import StatusBadge from '@/components/StatusBadge'

export default function Workflows() {
  const navigate = useNavigate()
  const repos = useDashboardStore((s) => s.repos)
  const fetchRepos = useDashboardStore((s) => s.fetchRepos)
  const workflows = useWorkflowsStore((s) => s.workflows)
  const dispatching = useWorkflowsStore((s) => s.dispatching)
  const lastDispatchResult = useWorkflowsStore((s) => s.lastDispatchResult)
  const currentRunId = useWorkflowsStore((s) => s.currentRunId)
  const currentWorkflowId = useWorkflowsStore((s) => s.currentWorkflowId)
  const fetchWorkflows = useWorkflowsStore((s) => s.fetchWorkflows)
  const dispatchWorkflow = useWorkflowsStore((s) => s.dispatchWorkflow)
  const handleRealtimeEvent = useWorkflowsStore((s) => s.handleRealtimeEvent)

  const [selectedRepoId, setSelectedRepoId] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogWorkflow, setDialogWorkflow] = useState<string>('')
  const [dialogRef, setDialogRef] = useState('main')
  const [dialogInputs, setDialogInputs] = useState<Record<string, string>>({})
  const [demoMode, setDemoMode] = useState<boolean>(false)

  useWebSocketListener(
    ['pipeline_run_created', 'pipeline_run_updated', 'pipeline_run_completed', 'workflow_status_updated'],
    (event) => {
      handleRealtimeEvent(event)
    }
  )

  useEffect(() => {
    if (repos.length === 0) fetchRepos()
  }, [repos.length, fetchRepos])

  useEffect(() => {
    if (repos.length > 0 && !selectedRepoId) {
      setSelectedRepoId(repos[0].id)
    }
  }, [repos, selectedRepoId])

  useEffect(() => {
    if (selectedRepoId) fetchWorkflows(selectedRepoId)
  }, [selectedRepoId, fetchWorkflows])

  const openDialog = (workflowId: string) => {
    setDialogWorkflow(workflowId)
    setDialogRef('main')
    setDialogInputs({})
    setDemoMode(false)
    setDialogOpen(true)
  }

  const handleDispatch = async () => {
    await dispatchWorkflow(selectedRepoId, dialogWorkflow, dialogRef, dialogInputs, demoMode)
    if (!lastDispatchResult || lastDispatchResult.success) {
      setDialogOpen(false)
    }
  }

  const handleRetryAsDemo = async () => {
    await dispatchWorkflow(selectedRepoId, dialogWorkflow, dialogRef, dialogInputs, true)
    setDialogOpen(false)
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Workflows</h1>

      <div className="mb-6">
        <select
          value={selectedRepoId}
          onChange={(e) => setSelectedRepoId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>
      </div>

      {lastDispatchResult && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm ${
            lastDispatchResult.success
              ? 'bg-[rgba(16,185,129,0.15)] text-[var(--success)]'
              : 'bg-[rgba(239,68,68,0.15)] text-[var(--error)]'
          }`}
        >
          {lastDispatchResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {lastDispatchResult.message}
        </div>
      )}

      {workflows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-secondary)]">No workflows found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
          {workflows.map((wf) => (
            <div key={wf.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {wf.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono truncate">
                    {wf.path}
                  </p>
                </div>
                <button
                  onClick={() => openDialog(wf.id)}
                  disabled={wf.state !== 'active'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Play size={12} />
                  Trigger
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                {wf.last_run_status && <StatusBadge status={wf.last_run_status} />}
                {wf.last_run_at && (
                  <span className="text-xs text-[var(--text-secondary)]">
                    {new Date(wf.last_run_at).toLocaleDateString()}
                  </span>
                )}
                {currentRunId && currentWorkflowId === wf.id && (
                  <button
                    onClick={() => navigate(`/pipeline?repo=${selectedRepoId}&run=${currentRunId}`)}
                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 ml-auto"
                  >
                    <ExternalLink size={12} />
                    View Run
                  </button>
                )}
              </div>
              <div className="flex items-center mt-2">
                <span
                  className={`text-xs ${
                    wf.state === 'active' ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {wf.state === 'active' ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Trigger Workflow</h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Branch / Tag
                </label>
                <input
                  type="text"
                  value={dialogRef}
                  onChange={(e) => setDialogRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  placeholder="main"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Inputs (JSON)
                </label>
                <textarea
                  value={Object.keys(dialogInputs).length > 0 ? JSON.stringify(dialogInputs, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      setDialogInputs(parsed)
                    } catch {
                      // invalid json, keep inputs as-is
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono h-24 resize-none"
                  placeholder='{"key": "value"}'
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="demoMode"
                  checked={demoMode}
                  onChange={(e) => setDemoMode(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-primary)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <label htmlFor="demoMode" className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Zap size={14} />
                  Demo Mode (local simulation, no GitHub API call)
                </label>
              </div>

              {lastDispatchResult && !lastDispatchResult.success && dialogOpen && (
                <div className="bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-[var(--error)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--error)]">{lastDispatchResult.message}</p>
                      {lastDispatchResult.error_detail && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{lastDispatchResult.error_detail}</p>
                      )}
                      {lastDispatchResult.error_code && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
                          Code: {lastDispatchResult.error_code}
                        </p>
                      )}
                      {lastDispatchResult.error_code === 'NO_GITHUB_TOKEN' && (
                        <button
                          onClick={handleRetryAsDemo}
                          disabled={dispatching}
                          className="mt-2 w-full px-3 py-1.5 rounded-md bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium hover:bg-[var(--accent)]/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Zap size={12} />
                          Retry in Demo Mode
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispatch}
                  disabled={dispatching || !dialogRef}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {dispatching && <Loader2 size={14} className="animate-spin" />}
                  {dispatching ? 'Dispatching...' : demoMode ? 'Trigger (Demo)' : 'Trigger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
