import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'
import { broadcastEvent } from '../websocket.js'

const router = Router()

router.get('/:repoId', (req: Request, res: Response) => {
  const repoId = parseInt(req.params.repoId)
  const result = db.workflows.filter((w) => w.repo_id === repoId)
  res.json(result)
})

router.post('/:repoId/:workflowId/dispatch', (req: Request, res: Response) => {
  const repoId = parseInt(req.params.repoId)
  const workflowId = parseInt(req.params.workflowId)
  const { ref, inputs } = req.body

  const workflow = db.workflows.find((w) => w.id === workflowId && w.repo_id === repoId)
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const environment = inputs?.environment || 'staging'
  const triggeredBy = inputs?.triggered_by || 'manual-dispatch'

  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  const newDeploy = {
    id: db.genId(),
    repo_id: repoId,
    environment,
    status: 'in_progress',
    triggered_by: triggeredBy,
    workflow_run_id: null,
    started_at: now,
    completed_at: null,
  }
  db.deployRecords.push(newDeploy)

  broadcastEvent('workflow_dispatched', {
    repo_id: repoId,
    workflow_id: workflowId,
    deploy_id: newDeploy.id,
    environment,
    triggered_by: triggeredBy,
  })

  res.json({ dispatched: true, deploy_id: newDeploy.id, workflow: workflow.name, environment })
})

export default router
