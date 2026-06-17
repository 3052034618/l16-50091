import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/:repoId', (req: Request, res: Response) => {
  const repoId = parseInt(req.params.repoId)
  const branch = req.query.branch as string | undefined
  const days = parseInt(req.query.days as string) || 30

  const cutoff = new Date(Date.now() - days * 86400000)
  let records = db.coverageRecords.filter(
    (r) => r.repo_id === repoId && new Date(r.recorded_at) >= cutoff
  )
  if (branch) {
    records = records.filter((r) => r.branch === branch)
  }
  records.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
  res.json(records)
})

router.get('/:repoId/branches', (req: Request, res: Response) => {
  const repoId = parseInt(req.params.repoId)

  const branchMap = new Map<string, { records: typeof db.coverageRecords }>()
  for (const r of db.coverageRecords) {
    if (r.repo_id !== repoId) continue
    if (!branchMap.has(r.branch)) {
      branchMap.set(r.branch, { records: [] })
    }
    branchMap.get(r.branch)!.records.push(r)
  }

  const result = Array.from(branchMap.entries()).map(([branch, data]) => {
    const sorted = data.records.sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )
    const latest = sorted[sorted.length - 1]
    const earliest = sorted[0]
    return {
      branch,
      record_count: sorted.length,
      avg_line_coverage: sorted.reduce((s, r) => s + r.line_coverage, 0) / sorted.length,
      avg_branch_coverage: sorted.reduce((s, r) => s + r.branch_coverage, 0) / sorted.length,
      min_line_coverage: Math.min(...sorted.map((r) => r.line_coverage)),
      max_line_coverage: Math.max(...sorted.map((r) => r.line_coverage)),
      earliest: earliest?.recorded_at,
      latest: latest?.recorded_at,
    }
  })

  result.sort((a, b) => new Date(b.latest!).getTime() - new Date(a.latest!).getTime())
  res.json(result)
})

export default router
