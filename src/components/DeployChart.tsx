import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { TrendingUp, Activity, Zap } from 'lucide-react'
import type { DeployStat } from '@/stores/deploy-stats'

interface DeployChartProps {
  data: DeployStat[]
  loading: boolean
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 shadow-lg">
      <p className="text-xs text-[var(--text-secondary)] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && entry.dataKey === 'success_rate' ? `${entry.value.toFixed(1)}%` : entry.value}
        </p>
      ))}
    </div>
  )
}

function SummaryCards({ data }: { data: DeployStat[] }) {
  const totalDeploys = data.reduce((sum, d) => sum + d.total, 0)
  const avgSuccessRate =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.success_rate, 0) / data.length
      : 0
  const avgDaily = data.length > 0 ? totalDeploys / data.length : 0

  const cards = [
    { label: 'Total Deploys', value: totalDeploys.toString(), icon: Zap, color: 'var(--accent)' },
    { label: 'Avg Success Rate', value: `${avgSuccessRate.toFixed(1)}%`, icon: Activity, color: 'var(--success)' },
    { label: 'Avg Daily', value: avgDaily.toFixed(1), icon: TrendingUp, color: 'var(--info)' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.label} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-secondary)]">{c.label}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{c.value}</p>
              </div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${c.color}20` }}
              >
                <Icon size={18} style={{ color: c.color }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DeployChart({ data, loading }: DeployChartProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-16 w-full" />
            </div>
          ))}
        </div>
        <div className="card p-6">
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="card p-6 text-center text-[var(--text-secondary)]">
        No deploy statistics available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards data={data} />

      <div className="card p-6">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Deploy Frequency</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <YAxis
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
            <Bar dataKey="successful" name="Successful" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="failed" name="Failed" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Success Rate</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="success_rate"
              name="Success Rate"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{ fill: '#8B5CF6', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
