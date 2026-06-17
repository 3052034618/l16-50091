import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'
import { broadcastEvent } from '../websocket.js'
import { Octokit } from 'octokit'

const router = Router()

function getGitHubToken(): string | undefined {
  return process.env.GITHUB_TOKEN
}

async function triggerWorkflowViaGitHub(
  repoFullName: string,
  workflowId: number | string,
  ref: string,
  inputs?: Record<string, string>
): Promise<{ success: boolean; error_code?: string; error_detail?: string; run_id?: number }> {
  const token = getGitHubToken()
  if (!token) {
    return { success: false, error_code: 'NO_GITHUB_TOKEN', error_detail: 'No GitHub token configured. Set GITHUB_TOKEN environment variable to enable real GitHub Actions triggers.' }
  }

  try {
    const octokit = new Octokit({ auth: token })
    const [owner, repo] = repoFullName.split('/')

    if (!owner || !repo) {
      return { success: false, error_code: 'INVALID_REPO_NAME', error_detail: `Invalid repository name: ${repoFullName}` }
    }

    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowId,
      ref,
      inputs,
    })

    return { success: true }
  } catch (err: any) {
    const status = err.status || err.response?.status
    const message = err.message || 'Unknown error'

    if (status === 404) {
      return { success: false, error_code: 'WORKFLOW_NOT_FOUND', error_detail: `Workflow ${workflowId} not found in ${repoFullName}. Check that the workflow file exists and the token has repo permissions.` }
    }
    if (status === 401) {
      return { success: false, error_code: 'UNAUTHORIZED', error_detail: 'Invalid or expired GitHub token. Please check your GITHUB_TOKEN.' }
    }
    if (status === 403) {
      return { success: false, error_code: 'FORBIDDEN', error_detail: 'Token does not have permission to trigger this workflow. Ensure the token has "repo" scope and write access to Actions.' }
    }
    if (status === 422) {
      return { success: false, error_code: 'INVALID_REF', error_detail: `Invalid ref "${ref}". The branch or tag does not exist in this repository.` }
    }
    return { success: false, error_code: `GITHUB_API_ERROR_${status || 'UNKNOWN'}`, error_detail: `GitHub API error: ${message}` }
  }
}

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

router.get('/:repoId', (req: Request, res: Response) => {
  const repoId = parseInt(req.params.repoId)
  const result = db.workflows.filter((w) => w.repo_id === repoId)
  res.json(result)
})

function generateStepsForJob(jobId: number, jobName: string) {
  const steps = []
  if (jobName === 'lint') {
    const names = ['Set up job', 'Checkout', 'Install dependencies', 'Run linter']
    for (let i = 0; i < names.length; i++) {
      steps.push({ id: db.genId(), job_id: jobId, number: i + 1, name: names[i], status: 'queued', conclusion: null, started_at: null, completed_at: null })
    }
  } else if (jobName === 'build') {
    const names = ['Set up job', 'Checkout', 'Install dependencies', 'Build', 'Upload artifacts']
    for (let i = 0; i < names.length; i++) {
      steps.push({ id: db.genId(), job_id: jobId, number: i + 1, name: names[i], status: 'queued', conclusion: null, started_at: null, completed_at: null })
    }
  } else if (jobName === 'test' || jobName === 'e2e') {
    const names = ['Set up job', 'Checkout', 'Install dependencies', 'Unit tests', 'Integration tests', 'Coverage report']
    for (let i = 0; i < names.length; i++) {
      steps.push({ id: db.genId(), job_id: jobId, number: i + 1, name: names[i], status: 'queued', conclusion: null, started_at: null, completed_at: null })
    }
  } else if (jobName.includes('deploy') || jobName === 'apply') {
    const names = ['Set up job', 'Checkout', 'Configure environment', 'Deploy', 'Verify deployment', 'Cleanup']
    for (let i = 0; i < names.length; i++) {
      steps.push({ id: db.genId(), job_id: jobId, number: i + 1, name: names[i], status: 'queued', conclusion: null, started_at: null, completed_at: null })
    }
  } else if (jobName === 'validate') {
    const names = ['Set up job', 'Checkout', 'Validate config']
    for (let i = 0; i < names.length; i++) {
      steps.push({ id: db.genId(), job_id: jobId, number: i + 1, name: names[i], status: 'queued', conclusion: null, started_at: null, completed_at: null })
    }
  } else if (jobName === 'plan') {
    const names = ['Set up job', 'Checkout', 'Initialize', 'Plan changes', 'Save plan artifact']
    for (let i = 0; i < names.length; i++) {
      steps.push({ id: db.genId(), job_id: jobId, number: i + 1, name: names[i], status: 'queued', conclusion: null, started_at: null, completed_at: null })
    }
  } else {
    const names = ['Set up job', 'Checkout', 'Run']
    for (let i = 0; i < names.length; i++) {
      steps.push({ id: db.genId(), job_id: jobId, number: i + 1, name: names[i], status: 'queued', conclusion: null, started_at: null, completed_at: null })
    }
  }
  return steps
}

function createJobsForRun(runId: number, workflowName: string) {
  const jobs = []
  const lower = workflowName.toLowerCase()
  if (lower.includes('deploy') || lower.includes('production') || lower.includes('staging')) {
    const buildJobId = db.genId()
    const testJobId = db.genId()
    const deployJobId = db.genId()
    jobs.push(
      { id: buildJobId, run_id: runId, name: 'build', stage: 'build', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: testJobId, run_id: runId, name: 'test', stage: 'test', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: deployJobId, run_id: runId, name: 'deploy', stage: 'deploy', status: 'queued', conclusion: null, started_at: null, completed_at: null },
    )
    const steps = [
      ...generateStepsForJob(buildJobId, 'build'),
      ...generateStepsForJob(testJobId, 'test'),
      ...generateStepsForJob(deployJobId, 'deploy'),
    ]
    db.pipelineJobs.push(...jobs)
    db.pipelineSteps.push(...steps)
  } else if (lower.includes('ci') || lower === 'test') {
    const lintJobId = db.genId()
    const buildJobId = db.genId()
    const testJobId = db.genId()
    jobs.push(
      { id: lintJobId, run_id: runId, name: 'lint', stage: 'build', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: buildJobId, run_id: runId, name: 'build', stage: 'build', status: 'queued', conclusion: null, started_at: null, completed_at: null },
      { id: testJobId, run_id: runId, name: 'test', stage: 'test', status: 'queued', conclusion: null, started_at: null, completed_at: null },
    )
    const steps = [
      ...generateStepsForJob(lintJobId, 'lint'),
      ...generateStepsForJob(buildJobId, 'build'),
      ...generateStepsForJob(testJobId, 'test'),
    ]
    db.pipelineJobs.push(...jobs)
    db.pipelineSteps.push(...steps)
  } else {
    const buildJobId = db.genId()
    jobs.push(
      { id: buildJobId, run_id: runId, name: 'build', stage: 'build', status: 'queued', conclusion: null, started_at: null, completed_at: null },
    )
    const steps = generateStepsForJob(buildJobId, 'build')
    db.pipelineJobs.push(...jobs)
    db.pipelineSteps.push(...steps)
  }
  return jobs
}

function advanceJobSteps(jobId: number, progress: number, success: boolean = true) {
  const steps = db.pipelineSteps.filter((s) => s.job_id === jobId).sort((a, b) => a.number - b.number)
  if (steps.length === 0) return
  const completedCount = Math.floor(progress * steps.length)
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  for (let i = 0; i < steps.length; i++) {
    if (i < completedCount) {
      steps[i].status = 'completed'
      steps[i].conclusion = success ? 'success' : 'failure'
      if (!steps[i].started_at) steps[i].started_at = now
      if (!steps[i].completed_at) steps[i].completed_at = now
    } else if (i === completedCount && progress < 1) {
      steps[i].status = 'in_progress'
      if (!steps[i].started_at) steps[i].started_at = now
    } else {
      steps[i].status = 'queued'
      steps[i].conclusion = null
      steps[i].started_at = null
      steps[i].completed_at = null
    }
  }
}

router.post('/:repoId/:workflowId/dispatch', async (req: Request, res: Response) => {
  const repoId = parseInt(req.params.repoId)
  const workflowId = parseInt(req.params.workflowId)
  const { ref, inputs, force_demo } = req.body

  const workflow = db.workflows.find((w) => w.id === workflowId && w.repo_id === repoId)
  const repo = db.repos.find((r) => r.id === repoId)
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found', error_code: 'WORKFLOW_NOT_FOUND', error_detail: `Workflow with id ${workflowId} does not exist in this repository` })
    return
  }

  if (!ref) {
    res.status(400).json({ error: 'Branch/ref is required', error_code: 'REF_REQUIRED', error_detail: 'Please specify a branch or tag to run the workflow on' })
    return
  }

  const hasToken = !!getGitHubToken()
  const useDemoMode = !hasToken || force_demo === true

  if (!hasToken && force_demo !== true) {
    res.status(400).json({
      error: 'No GitHub token configured',
      error_code: 'NO_GITHUB_TOKEN',
      error_detail: 'GITHUB_TOKEN environment variable is not set. Either configure a token or enable "Demo Mode" to simulate the workflow run.',
      mode: 'requires_config',
    })
    return
  }

  let githubResult: { success: boolean; error_code?: string; error_detail?: string } = { success: false }
  if (hasToken && repo && force_demo !== true) {
    githubResult = await triggerWorkflowViaGitHub(repo.full_name, workflow.github_id || workflow.path, ref, inputs)
    if (!githubResult.success) {
      res.status(400).json({
        error: githubResult.error_detail || 'Failed to trigger workflow',
        error_code: githubResult.error_code,
        error_detail: githubResult.error_detail,
        mode: 'github',
      })
      return
    }
  }

  const environment = inputs?.environment || 'staging'
  const triggeredBy = inputs?.triggered_by || 'manual-dispatch'

  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')

  const maxRunNumber = db.pipelineRuns
    .filter((r) => r.repo_id === repoId)
    .reduce((max, r) => Math.max(max, r.run_number), 0)

  const newRun: any = {
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

  createJobsForRun(newRun.id, workflow.name)

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

  const runPayload = buildRunPayload(newRun.id)
  broadcastEvent('pipeline_run_created', runPayload || { id: newRun.id, repo_id: newRun.repo_id })

  const workflowUpdate = {
    workflow_id: workflow.id,
    repo_id: repoId,
    run_id: newRun.id,
    status: 'queued',
    conclusion: null,
    updated_at: now,
  }
  broadcastEvent('workflow_status_updated', workflowUpdate)

  if (useDemoMode) {
    setTimeout(() => {
      const run = db.pipelineRuns.find((r) => r.id === newRun.id)
      const deploy = db.deployRecords.find((d) => d.id === newDeploy.id)
      if (run) {
        run.status = 'in_progress'
        run.updated_at = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
        const buildJob = db.pipelineJobs.find((j) => j.run_id === run.id && j.stage === 'build')
        if (buildJob) {
          buildJob.status = 'in_progress'
          buildJob.started_at = run.updated_at
          advanceJobSteps(buildJob.id, 0.4)
        }
      }
      if (deploy) {
        deploy.status = 'in_progress'
      }
      const updatedPayload = buildRunPayload(newRun.id)
      broadcastEvent('pipeline_run_updated', updatedPayload || { id: newRun.id, status: 'in_progress' })
      broadcastEvent('workflow_status_updated', { workflow_id: workflow.id, repo_id: repoId, run_id: newRun.id, status: 'in_progress', conclusion: null, updated_at: run?.updated_at })
    }, 2000)

    setTimeout(() => {
      const run = db.pipelineRuns.find((r) => r.id === newRun.id)
      const deploy = db.deployRecords.find((d) => d.id === newDeploy.id)
      const completedAt = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
      if (run) {
        run.status = 'in_progress'
        run.updated_at = completedAt
        const buildJob = db.pipelineJobs.find((j) => j.run_id === run.id && j.stage === 'build')
        if (buildJob) {
          buildJob.status = 'completed'
          buildJob.conclusion = 'success'
          buildJob.completed_at = completedAt
          advanceJobSteps(buildJob.id, 1)
        }
        const testJob = db.pipelineJobs.find((j) => j.run_id === run.id && j.stage === 'test')
        if (testJob) {
          testJob.status = 'in_progress'
          testJob.started_at = completedAt
          advanceJobSteps(testJob.id, 0.3)
        }
      }
      const updatedPayload = buildRunPayload(newRun.id)
      broadcastEvent('pipeline_run_updated', updatedPayload || { id: newRun.id, status: 'in_progress' })
      broadcastEvent('workflow_status_updated', { workflow_id: workflow.id, repo_id: repoId, run_id: newRun.id, status: 'in_progress', conclusion: null, updated_at: completedAt })
    }, 4500)

    setTimeout(() => {
      const run = db.pipelineRuns.find((r) => r.id === newRun.id)
      const deploy = db.deployRecords.find((d) => d.id === newDeploy.id)
      const completedAt = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
      if (run) {
        run.status = 'completed'
        run.conclusion = 'success'
        run.updated_at = completedAt
        for (const job of db.pipelineJobs.filter((j) => j.run_id === run.id)) {
          job.status = 'completed'
          job.conclusion = 'success'
          job.completed_at = completedAt
          if (!job.started_at) job.started_at = completedAt
          advanceJobSteps(job.id, 1)
        }
      }
      if (deploy) {
        deploy.status = 'success'
        deploy.completed_at = completedAt
      }
      const finalPayload = buildRunPayload(newRun.id)
      broadcastEvent('pipeline_run_completed', finalPayload || { id: newRun.id, status: 'completed', conclusion: 'success' })
      broadcastEvent('workflow_status_updated', { workflow_id: workflow.id, repo_id: repoId, run_id: newRun.id, status: 'completed', conclusion: 'success', updated_at: completedAt })
    }, 9000)
  }

  res.json({
    dispatched: true,
    deploy_id: newDeploy.id,
    run_id: newRun.id,
    run_number: newRun.run_number,
    workflow: workflow.name,
    environment,
    status: 'queued',
    mode: useDemoMode ? 'demo' : 'github',
    github_triggered: !useDemoMode && githubResult.success,
    message: useDemoMode ? 'Running in Demo Mode (local simulation)' : 'Workflow triggered on GitHub',
  })
})

export default router
