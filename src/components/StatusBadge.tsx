type Status = 'success' | 'failure' | 'running' | 'pending' | 'queued' | 'in_progress' | 'completed' | 'skipped' | 'open' | 'merged' | 'closed'

interface StatusBadgeProps {
  status: Status
}

const normalizedStatus = (s: Status): 'success' | 'failure' | 'running' | 'pending' | 'queued' => {
  if (s === 'in_progress') return 'running'
  if (s === 'completed') return 'success'
  if (s === 'skipped') return 'queued'
  if (s === 'merged') return 'success'
  if (s === 'closed') return 'failure'
  if (s === 'open') return 'pending'
  return s
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  success: { color: 'var(--success)', bg: 'rgba(16,185,129,0.15)', label: 'Success' },
  failure: { color: 'var(--error)', bg: 'rgba(239,68,68,0.15)', label: 'Failure' },
  running: { color: 'var(--accent)', bg: 'rgba(139,92,246,0.15)', label: 'Running' },
  pending: { color: 'var(--warning)', bg: 'rgba(245,158,11,0.15)', label: 'Pending' },
  queued: { color: 'var(--text-secondary)', bg: 'rgba(148,163,184,0.15)', label: 'Queued' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = normalizedStatus(status)
  const config = statusConfig[normalized]

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${normalized === 'running' ? 'status-pulse' : ''}`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  )
}
