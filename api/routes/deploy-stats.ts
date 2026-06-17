import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const repoIdsParam = req.query.repoIds as string | undefined
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined
  const granularity = (req.query.granularity as string) || 'day'

  let records = [...db.deployRecords]

  if (repoIdsParam) {
    const ids = repoIdsParam.split(',').map(Number)
    records = records.filter((r) => ids.includes(r.repo_id))
  }

  if (from) {
    const fromDate = new Date(from)
    records = records.filter((r) => new Date(r.started_at) >= fromDate)
  }

  if (to) {
    const toDate = new Date(to)
    records = records.filter((r) => new Date(r.started_at) <= toDate)
  }

  const getPeriodKey = (dateStr: string): string => {
    const d = new Date(dateStr)
    if (granularity === 'week') {
      const startOfWeek = new Date(d)
      startOfWeek.setDate(d.getDate() - d.getDay())
      return startOfWeek.toISOString().split('T')[0]
    }
    if (granularity === 'month') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    return d.toISOString().split('T')[0]
  }

  const freqMap = new Map<string, { count: number; repo_id: number }>()
  for (const r of records) {
    const key = getPeriodKey(r.started_at)
    const composite = `${key}::${r.repo_id}`
    if (!freqMap.has(composite)) {
      freqMap.set(composite, { count: 0, repo_id: r.repo_id })
    }
    freqMap.get(composite)!.count++
  }

  const frequency = Array.from(freqMap.entries())
    .map(([key, val]) => ({
      period: key.split('::')[0],
      count: val.count,
      repo_id: val.repo_id,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))

  const rateMap = new Map<string, { total: number; successes: number; repo_id: number }>()
  for (const r of records) {
    const key = getPeriodKey(r.started_at)
    const composite = `${key}::${r.repo_id}`
    if (!rateMap.has(composite)) {
      rateMap.set(composite, { total: 0, successes: 0, repo_id: r.repo_id })
    }
    const entry = rateMap.get(composite)!
    entry.total++
    if (r.status === 'success') entry.successes++
  }

  const successRate = Array.from(rateMap.entries())
    .map(([key, val]) => ({
      period: key.split('::')[0],
      total: val.total,
      successes: val.successes,
      rate: val.total > 0 ? Math.round((100.0 * val.successes / val.total) * 10) / 10 : 0,
      repo_id: val.repo_id,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))

  const totalDeploys = records.length
  const successful = records.filter((r) => r.status === 'success').length
  const failed = records.filter((r) => r.status === 'failed').length
  const successRateOverall = totalDeploys > 0
    ? Math.round((100.0 * successful / totalDeploys) * 10) / 10
    : 0

  const overall = {
    total_deploys: totalDeploys,
    successful,
    failed,
    success_rate: successRateOverall,
    avg_duration_minutes: 0,
  }

  res.json({ frequency, success_rate: successRate, overall })
})

export default router
