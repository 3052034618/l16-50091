import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/:repoId/runs', (req: Request, res: Response) => {
  const repoId = parseInt(req.params.repoId)
  const runs = db.pipelineRuns
    .filter((r) => r.repo_id === repoId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((run) => ({
      ...run,
      jobs: db.pipelineJobs
        .filter((j) => j.run_id === run.id)
        .sort((a, b) => {
          const stageOrder: Record<string, number> = { build: 0, test: 1, deploy: 2 }
          return (stageOrder[a.stage] ?? 3) - (stageOrder[b.stage] ?? 3)
        }),
    }))
  res.json(runs)
})

export default router
