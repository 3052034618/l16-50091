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
import type { DeployStat, OverallStats } from '@/stores/deploy-stats'

export interface ChartSeries {
  name: string
  data: DeployStat[]
  color: string
}

interface DeployChartProps {
  data?: DeployStat[]
  series?: ChartSeries[]
  overallStats?: OverallStats | null
  loading: boolean
}

const REPO_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#F97316']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 shadow-lg">
      <p className="text-xs text-[var(--text-secondary)] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && (entry.dataKey === 'success_rate' || entry.name?.includes('Rate')) ? `${entry.value.toFixed(1)}%` : entry.value}
        </p>
      ))}
    </div>
  )
}

function SummaryCards({ data, overallStats }: { data?: DeployStat[]; overallStats?: OverallStats | null }) {
  const totalDeploys = overallStats?.total_deploys ?? data?.reduce((sum, d) => sum + d.total, 0) ?? 0
  const avgSuccessRate = overallStats
    ? overallStats.success_rate
    : data && data.length > 0
      ? data.reduce((sum, d) => sum + d.success_rate, 0) / data.length
      : 0
  const avgDaily = data && data.length > 0 ? totalDeploys / data.length : 0

  const cards = [
    { label: 'Total Deploys', value: totalDeploys.toString(), icon: Zap, color: 'var(--accent)' },
    { label: 'Success Rate', value: `${avgSuccessRate.toFixed(1)}%`, icon: Activity, color: 'var(--success)' },
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

function buildMultiSeriesBarData(series: ChartSeries[]) {
  const dateMap = new Map<string, Record<string, any>>()
  for (const s of series) {
    for (const d of s.data) {
      if (!dateMap.has(d.date)) {
        dateMap.set(d.date, { date: d.date })
      }
      const entry = dateMap.get(d.date)!
      entry[`${s.name}_successful`] = d.successful
      entry[`${s.name}_failed`] = d.failed
      entry[`${s.name}_total`] = d.total
    }
  }
  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function buildMultiSeriesLineData(series: ChartSeries[]) {
  const dateMap = new Map<string, Record<string, any>>()
  for (const s of series) {
    for (const d of s.data) {
      if (!dateMap.has(d.date)) {
        dateMap.set(d.date, { date: d.date })
      }
      const entry = dateMap.get(d.date)!
      entry[`${s.name}_rate`] = d.success_rate
    }
  }
  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export default function DeployChart({ data, series, overallStats, loading }: DeployChartProps) {
  const isMultiSeries = series && series.length > 0
  const chartData = isMultiSeries ? buildMultiSeriesBarData(series) : data || []
  const lineData = isMultiSeries ? buildMultiSeriesLineData(series) : data || []

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

  if (chartData.length === 0) {
    return (
      <div className="card p-6 text-center text-[var(--text-secondary)]">
        No deploy statistics available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards data={data} overallStats={overallStats} />

      <div className="card p-6">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Deploy Frequency</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
            {isMultiSeries ? (
              series!.map((s, idx) => (
                <Bar
                  key={s.name}
                  dataKey={`${s.name}_total`}
                  name={s.name}
                  fill={s.color || REPO_COLORS[idx % REPO_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))
            ) : (
              <>
                <Bar dataKey="successful" name="Successful" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Success Rate</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={lineData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
            <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
            {isMultiSeries ? (
              series!.map((s, idx) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={`${s.name}_rate`}
                  name={s.name}
                  stroke={s.color || REPO_COLORS[idx % REPO_COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: s.color || REPO_COLORS[idx % REPO_COLORS.length], r: 3 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="success_rate"
                name="Success Rate"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ fill: '#8B5CF6', r: 3 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
