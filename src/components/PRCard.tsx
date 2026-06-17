import { useNavigate } from 'react-router-dom'
import { Clock, GitMerge, GitPullRequest } from 'lucide-react'
import StatusBadge from './StatusBadge'
import type { PullRequest } from '@/stores/dashboard'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const reviewerStateColor: Record<string, string> = {
  APPROVED: 'ring-[var(--success)]',
  CHANGES_REQUESTED: 'ring-[var(--error)]',
  PENDING: 'ring-[var(--warning)]',
}

interface PRCardProps {
  pr: PullRequest
  flashNew?: boolean
  flashUpdate?: boolean
}

export default function PRCard({ pr, flashNew, flashUpdate }: PRCardProps) {
  const navigate = useNavigate()

  const flashClass = flashNew ? 'flash-new' : flashUpdate ? 'flash-update' : ''

  return (
    <div
      className={`card-hover p-4 ${flashClass}`}
      onClick={() => navigate('/pipeline')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <GitPullRequest size={14} className="text-[var(--accent)] shrink-0" />
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              #{pr.number} {pr.title}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <img
                src={pr.author.avatar_url}
                alt={pr.author.login}
                className="w-4 h-4 rounded-full"
              />
              <span>{pr.author.login}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{timeAgo(pr.updated_at)}</span>
            </div>
            {pr.merged && (
              <div className="flex items-center gap-1 text-[var(--accent)]">
                <GitMerge size={12} />
                <span>Merged</span>
              </div>
            )}
          </div>
        </div>

        <StatusBadge status={pr.ci_status} />
      </div>

      {pr.reviewers.length > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-[var(--border)]">
          <span className="text-xs text-[var(--text-secondary)] mr-1">Reviewers:</span>
          {pr.reviewers.map((r) => (
            <img
              key={r.login}
              src={r.avatar_url}
              alt={r.login}
              title={`${r.login} — ${r.state}`}
              className={`w-5 h-5 rounded-full ring-1 ${reviewerStateColor[r.state] || 'ring-[var(--border)]'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
