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

  const maxRunNumber = db.pipelineRuns
    .filter((r) => r.repo_id === repoId)
    .reduce((max, r) => Math.max(max, r.run_number), 0)

  const newRun = {
    id: db.genId(),
    repo_id: repoId,
    run_number: maxRunNumber + 1,
    event: 'workflow_dispatch',
    branch: ref || 'main',
    commit_sha: '',
    status: 'queued',
    conclusion: null,
    created_at: now,
    updated_at: now,
    jobs: [],
  }
  db.pipelineRuns.unshift(newRun)

  const newDeploy = {
    id: db.genId(),
    repo_id: repoId,
    environment,
    status: 'queued',
    triggered_by: triggeredBy,
    workflow_run_id: newRun.id,
    started_at: now,
    completed_at: null,
  }
  db.deployRecords.push(newDeploy)

  broadcastEvent('pipeline_run_created', {
    id: newRun.id,
    repo_id: newRun.repo_id,
    run_number: newRun.run_number,
    status: newRun.status,
    conclusion: null,
    branch: newRun.branch,
    created_at: newRun.created_at,
    updated_at: newRun.updated_at,
  })

  setTimeout(() => {
    const run = db.pipelineRuns.find((r) => r.id === newRun.id)
    const deploy = db.deployRecords.find((d) => d.id === newDeploy.id)
    if (run) {
      run.status = 'in_progress'
      run.updated_at = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
    }
    if (deploy) {
      deploy.status = 'in_progress'
    }
    broadcastEvent('pipeline_run_updated', {
      id: newRun.id,
      repo_id: newRun.repo_id,
      run_number: newRun.run_number,
      status: 'in_progress',
      conclusion: null,
      branch: newRun.branch,
      updated_at: run?.updated_at,
    })
  }, 2000)

  setTimeout(() => {
    const run = db.pipelineRuns.find((r) => r.id === newRun.id)
    const deploy = db.deployRecords.find((d) => d.id === newDeploy.id)
    const completedAt = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
    if (run) {
      run.status = 'completed'
      run.conclusion = 'success'
      run.updated_at = completedAt
    }
    if (deploy) {
      deploy.status = 'success'
      deploy.completed_at = completedAt
    }
    broadcastEvent('pipeline_run_completed', {
      id: newRun.id,
      repo_id: newRun.repo_id,
      run_number: newRun.run_number,
      status: 'completed',
      conclusion: 'success',
      branch: newRun.branch,
      updated_at: completedAt,
    })
  }, 7000)

  res.json({
    dispatched: true,
    deploy_id: newDeploy.id,
    run_id: newRun.id,
    workflow: workflow.name,
    environment,
    status: 'queued',
  })
})

export default router
