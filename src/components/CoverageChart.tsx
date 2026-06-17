import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { CoveragePoint } from '@/stores/coverage'

interface CoverageChartProps {
  data: CoveragePoint[]
  loading: boolean
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 shadow-lg">
      <p className="text-xs text-[var(--text-secondary)] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

export default function CoverageChart({ data, loading }: CoverageChartProps) {
  if (loading) {
    return (
      <div className="card p-6">
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="card p-6 text-center text-[var(--text-secondary)]">
        No coverage data available
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
        Coverage Trend
      </h3>
      <ResponsiveContainer width="100%" height={320}>
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
          <Legend
            wrapperStyle={{ color: 'var(--text-secondary)' }}
          />
          <Line
            type="monotone"
            dataKey="line_coverage"
            name="Line Coverage"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={{ fill: '#8B5CF6', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="branch_coverage"
            name="Branch Coverage"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
