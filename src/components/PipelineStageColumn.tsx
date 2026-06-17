import { Hammer, FlaskConical, Rocket } from 'lucide-react'
import StatusBadge from './StatusBadge'
import type { PipelineJob } from '@/stores/pipeline'

type Stage = 'build' | 'test' | 'deploy'

const stageConfig: Record<Stage, { icon: typeof Hammer; color: string; label: string }> = {
  build: { icon: Hammer, color: 'var(--build)', label: 'Build' },
  test: { icon: FlaskConical, color: 'var(--test)', label: 'Test' },
  deploy: { icon: Rocket, color: 'var(--deploy)', label: 'Deploy' },
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

interface PipelineStageColumnProps {
  stage: Stage
  jobs: PipelineJob[]
  expandedJobId: string | null
  onToggleJob: (jobId: string) => void
}

export default function PipelineStageColumn({
  stage,
  jobs,
  expandedJobId,
  onToggleJob,
}: PipelineStageColumnProps) {
  const config = stageConfig[stage]
  const Icon = config.icon

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4 px-1">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon size={14} style={{ color: config.color }} />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{config.label}</h3>
        <span className="text-xs text-[var(--text-secondary)]">({jobs.length})</span>
      </div>

      <div className="flex flex-col gap-2">
        {jobs.map((job) => {
          const isExpanded = expandedJobId === job.id
          return (
            <div
              key={job.id}
              className="card p-3 cursor-pointer hover:border-[var(--accent)] transition-colors"
              onClick={() => onToggleJob(job.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {job.name}
                </span>
                <StatusBadge status={job.status} />
              </div>

              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                {job.duration_seconds != null && (
                  <span>{formatDuration(job.duration_seconds)}</span>
                )}
                {job.started_at && (
                  <span>{new Date(job.started_at).toLocaleTimeString()}</span>
                )}
              </div>

              {isExpanded && job.steps.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                  {job.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            step.status === 'success'
                              ? 'bg-[var(--success)]'
                              : step.status === 'failure'
                              ? 'bg-[var(--error)]'
                              : step.status === 'running'
                              ? 'bg-[var(--accent)] status-pulse'
                              : 'bg-[var(--text-secondary)]'
                          }`}
                        />
                        <span className="text-[var(--text-secondary)]">{step.name}</span>
                      </div>
                      <span className="text-[var(--text-secondary)]">
                        {formatDuration(step.duration_seconds)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {jobs.length === 0 && (
          <div className="card p-6 text-center text-sm text-[var(--text-secondary)]">
            No jobs in this stage
          </div>
        )}
      </div>
    </div>
  )
}
