import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'
import { broadcastEvent } from '../websocket.js'

const router = Router()

function buildRunPayload(runId: number) {
  const run = db.pipelineRuns.find((r) => r.id === runId)
  if (!run) return null
  const jobs = db.pipelineJobs
    .filter((j) => j.run_id === runId)
    .sort((a, b) => {
      const stageOrder: Record<string, number> = { build: 0, test: 1, deploy: 2 }
      return (stageOrder[a.stage] ?? 3) - (stageOrder[b.stage] ?? 3)
    })
    .map((job) => ({
      ...job,
      steps: db.pipelineSteps
        .filter((s) => s.job_id === job.id)
        .map((step) => ({
          id: step.id,
          number: step.number,
          name: step.name,
          status: step.status,
          conclusion: step.conclusion,
          started_at: step.started_at,
          completed_at: step.completed_at,
        }))
        .sort((a, b) => a.number - b.number),
    }))
  return { ...run, jobs }
}

function handlePush(payload: any) {
  const repoFullName = payload.repository?.full_name
  if (!repoFullName) return

  const repo = db.repos.find((r) => r.full_name === repoFullName)
  if (!repo) return

  const branch = (payload.ref as string || '').replace('refs/heads/', '')
  const commitSha = payload.after || ''
  const maxRun = db.pipelineRuns
    .filter((r) => r.repo_id === repo.id)
    .reduce((max, r) => Math.max(max, r.run_number), 0)

  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  const newRun: typeof db.pipelineRuns[0] = {
    id: db.genId(),
    repo_id: repo.id,
    run_number: maxRun + 1,
    event: 'push',
    branch,
    commit_sha: commitSha,
    status: 'queued',
    conclusion: null,
    created_at: now,
    updated_at: now,
    jobs: [],
  }
  db.pipelineRuns.push(newRun)

  const runPayload = buildRunPayload(newRun.id)
  broadcastEvent('pipeline_run_created', runPayload || { repo_id: repo.id, run_id: newRun.id, branch })
}

function buildPRPayload(pr: typeof db.pullRequests[0]) {
  return {
    id: pr.id,
    repo_id: pr.repo_id,
    number: pr.number,
    title: pr.title,
    author_login: pr.author_login,
    author_avatar_url: pr.author_avatar_url,
    status: pr.status,
    ci_status: pr.ci_status,
    head_branch: pr.head_branch,
    base_branch: pr.base_branch,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    reviewers: pr.reviewers.map((r) => ({
      login: r.login,
      avatar_url: r.avatar_url,
      state: r.state,
    })),
  }
}

function handlePullRequest(payload: any) {
  const repoFullName = payload.repository?.full_name
  const action = payload.action
  const pr = payload.pull_request
  if (!repoFullName || !pr) return

  const repo = db.repos.find((r) => r.full_name === repoFullName)
  if (!repo) return

  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')

  if (action === 'opened' || action === 'synchronize') {
    const existing = db.pullRequests.find((p) => p.repo_id === repo.id && p.number === pr.number)

    if (existing) {
      existing.title = pr.title
      existing.author_login = pr.user?.login
      existing.author_avatar_url = pr.user?.avatar_url
      existing.ci_status = 'pending'
      existing.updated_at = now
      broadcastEvent('pull_request_updated', buildPRPayload(existing))
    } else {
      const newPR: typeof db.pullRequests[0] = {
        id: db.genId(),
        repo_id: repo.id,
        number: pr.number,
        title: pr.title,
        author_login: pr.user?.login,
        author_avatar_url: pr.user?.avatar_url,
        status: 'open',
        ci_status: 'pending',
        head_branch: pr.head?.ref,
        base_branch: pr.base?.ref,
        created_at: now,
        updated_at: now,
        reviewers: [],
      }
      db.pullRequests.push(newPR)
      broadcastEvent('pull_request_opened', buildPRPayload(newPR))
    }
  } else if (action === 'closed') {
    const merged = pr.merged === true
    const existing = db.pullRequests.find((p) => p.repo_id === repo.id && p.number === pr.number)
    if (existing) {
      existing.status = merged ? 'merged' : 'closed'
      existing.ci_status = merged ? 'success' : 'pending'
      existing.updated_at = now
      broadcastEvent('pull_request_closed', buildPRPayload(existing))
    }
  }
}

function findPRForBranch(repoId: number, branch: string) {
  return db.pullRequests.find((p) => p.repo_id === repoId && p.head_branch === branch && p.status === 'open')
}

function updatePRCiStatus(repoId: number, branch: string, ciStatus: string) {
  const pr = findPRForBranch(repoId, branch)
  if (pr) {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
    pr.ci_status = ciStatus
    pr.updated_at = now
    return pr
  }
  return null
}

function handleWorkflowRun(payload: any) {
  const repoFullName = payload.repository?.full_name
  const action = payload.action
  const workflowRun = payload.workflow_run
  if (!repoFullName || !workflowRun) return

  const repo = db.repos.find((r) => r.full_name === repoFullName)
  if (!repo) return

  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  const branch = workflowRun.head_branch

  if (action === 'queued') {
    const maxRun = db.pipelineRuns
      .filter((r) => r.repo_id === repo.id)
      .reduce((max, r) => Math.max(max, r.run_number), 0)

    const newRun: typeof db.pipelineRuns[0] = {
      id: db.genId(),
      repo_id: repo.id,
      run_number: maxRun + 1,
      event: 'workflow_run',
      branch: workflowRun.head_branch,
      commit_sha: workflowRun.head_sha,
      status: 'queued',
      conclusion: null,
      created_at: now,
      updated_at: now,
      jobs: [],
    }
    db.pipelineRuns.push(newRun)

    const buildJobId = db.genId()
    const testJobId = db.genId()
    db.pipelineJobs.push(
      { id: buildJobId, run_id: newRun.id, name: 'build', stage: 'build', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: testJobId, run_id: newRun.id, name: 'test', stage: 'test', status: 'queued', conclusion: null, started_at: null, completed_at: null },
    )
    db.pipelineSteps.push(
      { id: db.genId(), job_id: buildJobId, number: 1, name: 'Set up job', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: buildJobId, number: 2, name: 'Checkout', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: buildJobId, number: 3, name: 'Install dependencies', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: buildJobId, number: 4, name: 'Build', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: buildJobId, number: 5, name: 'Upload artifacts', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: testJobId, number: 1, name: 'Set up job', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: testJobId, number: 2, name: 'Checkout', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: testJobId, number: 3, name: 'Install dependencies', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: testJobId, number: 4, name: 'Unit tests', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: testJobId, number: 5, name: 'Integration tests', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: db.genId(), job_id: testJobId, number: 6, name: 'Coverage report', status: 'queued', conclusion: null, started_at: null, completed_at: null },
    )

    const runPayload = buildRunPayload(newRun.id)
    broadcastEvent('pipeline_run_created', runPayload || { repo_id: repo.id, run_id: newRun.id })

    const pr = updatePRCiStatus(repo.id, branch, 'running')
    if (pr) {
      broadcastEvent('workflow_run_started', buildPRPayload(pr))
    }
  } else if (action === 'in_progress') {
    const run = db.pipelineRuns
      .filter((r) => r.repo_id === repo.id && r.commit_sha === workflowRun.head_sha)
      .sort((a, b) => b.id - a.id)[0]
    if (run) {
      run.status = 'in_progress'
      run.updated_at = now
      const buildJob = db.pipelineJobs.find((j) => j.run_id === run.id && j.name === 'build')
      if (buildJob) {
        buildJob.status = 'in_progress'
        buildJob.started_at = now
        const buildSteps = db.pipelineSteps.filter((s) => s.job_id === buildJob.id).sort((a, b) => a.number - b.number)
        if (buildSteps.length >= 3) {
          for (let i = 0; i < 2; i++) {
            buildSteps[i].status = 'completed'
            buildSteps[i].conclusion = 'success'
            buildSteps[i].started_at = now
            buildSteps[i].completed_at = now
          }
          buildSteps[2].status = 'in_progress'
          buildSteps[2].started_at = now
        }
      }
      const runPayload = buildRunPayload(run.id)
      broadcastEvent('pipeline_run_updated', runPayload || { repo_id: repo.id, run_id: run.id, status: 'in_progress' })

      const pr = updatePRCiStatus(repo.id, branch, 'running')
      if (pr) {
        broadcastEvent('pull_request_updated', buildPRPayload(pr))
      }
    }
  } else if (action === 'completed') {
    const run = db.pipelineRuns
      .filter((r) => r.repo_id === repo.id && r.commit_sha === workflowRun.head_sha)
      .sort((a, b) => b.id - a.id)[0]
    if (run) {
      const conclusion = workflowRun.conclusion || 'success'
      run.status = 'completed'
      run.conclusion = conclusion
      run.updated_at = now
      for (const job of db.pipelineJobs.filter((j) => j.run_id === run.id)) {
        job.status = 'completed'
        job.conclusion = conclusion
        job.completed_at = now
        if (!job.started_at) job.started_at = now
        for (const step of db.pipelineSteps.filter((s) => s.job_id === job.id)) {
          step.status = 'completed'
          step.conclusion = conclusion
          if (!step.started_at) step.started_at = now
          if (!step.completed_at) step.completed_at = now
        }
      }
      const runPayload = buildRunPayload(run.id)
      broadcastEvent('pipeline_run_completed', runPayload || { repo_id: repo.id, run_id: run.id, conclusion })

      const ciStatus = conclusion === 'success' ? 'success' : 'failure'
      const pr = updatePRCiStatus(repo.id, branch, ciStatus)
      if (pr) {
        broadcastEvent('pull_request_updated', buildPRPayload(pr))
      }
    }
  }
}

function handleCheckSuite(payload: any) {
  const repoFullName = payload.repository?.full_name
  const action = payload.action
  const checkSuite = payload.check_suite
  if (!repoFullName || !checkSuite) return

  const repo = db.repos.find((r) => r.full_name === repoFullName)
  if (!repo) return

  if (action === 'completed') {
    const conclusion = checkSuite.conclusion || 'success'
    const headSha = checkSuite.head_sha
    const branch = checkSuite.head_branch || ''

    const run = db.pipelineRuns
      .filter((r) => r.repo_id === repo.id && r.commit_sha === headSha)
      .sort((a, b) => b.id - a.id)[0]
    if (run) {
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
      run.status = 'completed'
      run.conclusion = conclusion
      run.updated_at = now
      broadcastEvent('check_suite_completed', { repo_id: repo.id, run_id: run.id, conclusion })
    }

    const ciStatus = conclusion === 'success' ? 'success' : 'failure'
    const pr = updatePRCiStatus(repo.id, branch, ciStatus)
    if (pr) {
      broadcastEvent('check_suite_completed', buildPRPayload(pr))
    }
  }
}

router.post('/github', (req: Request, res: Response) => {
  const eventType = req.headers['x-github-event'] as string
  const payload = req.body

  switch (eventType) {
    case 'push':
      handlePush(payload)
      break
    case 'pull_request':
      handlePullRequest(payload)
      break
    case 'workflow_run':
      handleWorkflowRun(payload)
      break
    case 'check_suite':
      handleCheckSuite(payload)
      break
  }

  res.json({ received: true })
})

router.post('/register', (req: Request, res: Response) => {
  const { repo_id } = req.body
  if (!repo_id) {
    res.status(400).json({ error: 'repo_id is required' })
    return
  }

  const webhookId = Math.floor(Math.random() * 100000) + 1
  const repo = db.repos.find((r) => r.id === parseInt(String(repo_id)))
  if (repo) {
    repo.webhook_id = webhookId
  }

  broadcastEvent('webhook_registered', { repo_id, webhook_id: webhookId })
  res.json({ registered: true, webhook_id: webhookId })
})

export default router
