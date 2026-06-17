import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.json(db.repos)
})

router.get('/:repoId/pull-requests', (req: Request, res: Response) => {
  const repoId = parseInt(req.params.repoId)
  const prs = db.pullRequests
    .filter((pr) => pr.repo_id === repoId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map(({ reviewers, ...rest }) => ({
      ...rest,
      reviewers: reviewers.map((r) => ({ login: r.login, avatar_url: r.avatar_url, state: r.state })),
    }))
  res.json(prs)
})

export default router
