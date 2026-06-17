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

  const repoIds = [...new Set(records.map((r) => r.repo_id))]

  const byRepo: Array<{
    repo_id: number
    repo_name: string
    frequency: Array<{ period: string; count: number }>
    success_rate: Array<{ period: string; total: number; successes: number; rate: number }>
    overall: {
      total_deploys: number
      successful: number
      failed: number
      success_rate: number
      avg_duration_minutes: number
    }
  }> = []

  for (const repoId of repoIds) {
    const repoRecords = records.filter((r) => r.repo_id === repoId)
    const repo = db.repos.find((r) => r.id === repoId)
    const repoName = repo?.full_name || `repo_${repoId}`

    const freqMap = new Map<string, number>()
    for (const r of repoRecords) {
      const key = getPeriodKey(r.started_at)
      freqMap.set(key, (freqMap.get(key) || 0) + 1)
    }

    const frequency = Array.from(freqMap.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period))

    const rateMap = new Map<string, { total: number; successes: number }>()
    for (const r of repoRecords) {
      const key = getPeriodKey(r.started_at)
      if (!rateMap.has(key)) {
        rateMap.set(key, { total: 0, successes: 0 })
      }
      const entry = rateMap.get(key)!
      entry.total++
      if (r.status === 'success') entry.successes++
    }

    const successRate = Array.from(rateMap.entries())
      .map(([period, val]) => ({
        period,
        total: val.total,
        successes: val.successes,
        rate: val.total > 0 ? Math.round((100.0 * val.successes / val.total) * 10) / 10 : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    const totalDeploys = repoRecords.length
    const successful = repoRecords.filter((r) => r.status === 'success').length
    const failed = repoRecords.filter((r) => r.status === 'failed').length
    const successRateOverall = totalDeploys > 0
      ? Math.round((100.0 * successful / totalDeploys) * 10) / 10
      : 0

    byRepo.push({
      repo_id: repoId,
      repo_name: repoName,
      frequency,
      success_rate: successRate,
      overall: {
        total_deploys: totalDeploys,
        successful,
        failed,
        success_rate: successRateOverall,
        avg_duration_minutes: 0,
      },
    })
  }

  const aggFreqMap = new Map<string, number>()
  for (const r of records) {
    const key = getPeriodKey(r.started_at)
    aggFreqMap.set(key, (aggFreqMap.get(key) || 0) + 1)
  }

  const frequency = Array.from(aggFreqMap.entries())
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period))

  const aggRateMap = new Map<string, { total: number; successes: number }>()
  for (const r of records) {
    const key = getPeriodKey(r.started_at)
    if (!aggRateMap.has(key)) {
      aggRateMap.set(key, { total: 0, successes: 0 })
    }
    const entry = aggRateMap.get(key)!
    entry.total++
    if (r.status === 'success') entry.successes++
  }

  const successRate = Array.from(aggRateMap.entries())
    .map(([period, val]) => ({
      period,
      total: val.total,
      successes: val.successes,
      rate: val.total > 0 ? Math.round((100.0 * val.successes / val.total) * 10) / 10 : 0,
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

  res.json({ frequency, success_rate: successRate, overall, by_repo: byRepo })
})

export default router
