import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let nextId = 1000
function genId(): number {
  return nextId++
}

const now = new Date()
function daysAgo(d: number): string {
  const dt = new Date(now.getTime() - d * 86400000)
  return dt.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
}

export interface Repo {
  id: number
  name: string
  full_name: string
  avatar_url: string
  webhook_id: number | null
  created_at: string
}

export interface Reviewer {
  id: number
  pr_id: number
  login: string
  avatar_url: string
  state: string
}

export interface PR {
  id: number
  repo_id: number
  number: number
  title: string
  author_login: string
  author_avatar_url: string
  status: string
  ci_status: string
  head_branch: string
  base_branch: string
  created_at: string
  updated_at: string
  reviewers: Reviewer[]
}

export interface PipelineJob {
  id: number
  run_id: number
  name: string
  stage: string
  status: string
  conclusion: string | null
  started_at: string | null
  completed_at: string | null
}

export interface PipelineRun {
  id: number
  repo_id: number
  run_number: number
  event: string
  branch: string
  commit_sha: string
  status: string
  conclusion: string | null
  created_at: string
  updated_at: string
  jobs?: PipelineJob[]
}

export interface CoverageRecord {
  id: number
  repo_id: number
  branch: string
  line_coverage: number
  branch_coverage: number
  recorded_at: string
}

export interface DeployRecord {
  id: number
  repo_id: number
  environment: string
  status: string
  triggered_by: string
  workflow_run_id: number | null
  started_at: string
  completed_at: string | null
}

export interface Workflow {
  id: number
  repo_id: number
  github_id: number
  name: string
  state: string
  path: string
}

const repos: Repo[] = [
  { id: 1, name: 'frontend-app', full_name: 'acme/frontend-app', avatar_url: 'https://avatars.githubusercontent.com/u/1001?v=4', webhook_id: 50001, created_at: daysAgo(60) },
  { id: 2, name: 'api-server', full_name: 'acme/api-server', avatar_url: 'https://avatars.githubusercontent.com/u/1002?v=4', webhook_id: 50002, created_at: daysAgo(55) },
  { id: 3, name: 'infra-config', full_name: 'acme/infra-config', avatar_url: 'https://avatars.githubusercontent.com/u/1003?v=4', webhook_id: 50003, created_at: daysAgo(45) },
]

const pullRequests: PR[] = [
  { id: 1, repo_id: 1, number: 142, title: 'feat: add dark mode toggle to settings page', author_login: 'sarah-chen', author_avatar_url: 'https://avatars.githubusercontent.com/sarah-chen?v=4', status: 'open', ci_status: 'success', head_branch: 'feature/dark-mode', base_branch: 'main', created_at: daysAgo(3), updated_at: daysAgo(1), reviewers: [
    { id: 1, pr_id: 1, login: 'jen-liu', avatar_url: 'https://avatars.githubusercontent.com/jen-liu?v=4', state: 'APPROVED' },
    { id: 2, pr_id: 1, login: 'mike-ross', avatar_url: 'https://avatars.githubusercontent.com/mike-ross?v=4', state: 'PENDING' },
  ]},
  { id: 2, repo_id: 1, number: 141, title: 'fix: resolve memory leak in WebSocket handler', author_login: 'mike-ross', author_avatar_url: 'https://avatars.githubusercontent.com/mike-ross?v=4', status: 'merged', ci_status: 'success', head_branch: 'fix/ws-memory-leak', base_branch: 'main', created_at: daysAgo(5), updated_at: daysAgo(2), reviewers: [
    { id: 3, pr_id: 2, login: 'sarah-chen', avatar_url: 'https://avatars.githubusercontent.com/sarah-chen?v=4', state: 'APPROVED' },
    { id: 4, pr_id: 2, login: 'alex-kim', avatar_url: 'https://avatars.githubusercontent.com/alex-kim?v=4', state: 'APPROVED' },
  ]},
  { id: 3, repo_id: 1, number: 140, title: 'chore: upgrade React to v19', author_login: 'jen-liu', author_avatar_url: 'https://avatars.githubusercontent.com/jen-liu?v=4', status: 'closed', ci_status: 'failure', head_branch: 'chore/react-19', base_branch: 'main', created_at: daysAgo(7), updated_at: daysAgo(4), reviewers: [] },
  { id: 4, repo_id: 2, number: 89, title: 'feat: implement rate limiting middleware', author_login: 'alex-kim', author_avatar_url: 'https://avatars.githubusercontent.com/alex-kim?v=4', status: 'open', ci_status: 'running', head_branch: 'feature/rate-limit', base_branch: 'develop', created_at: daysAgo(2), updated_at: daysAgo(0), reviewers: [
    { id: 5, pr_id: 4, login: 'priya-patel', avatar_url: 'https://avatars.githubusercontent.com/priya-patel?v=4', state: 'CHANGES_REQUESTED' },
    { id: 6, pr_id: 4, login: 'dave-wilson', avatar_url: 'https://avatars.githubusercontent.com/dave-wilson?v=4', state: 'PENDING' },
  ]},
  { id: 5, repo_id: 2, number: 88, title: 'fix: correct JWT token expiration logic', author_login: 'priya-patel', author_avatar_url: 'https://avatars.githubusercontent.com/priya-patel?v=4', status: 'merged', ci_status: 'success', head_branch: 'fix/jwt-expiry', base_branch: 'develop', created_at: daysAgo(6), updated_at: daysAgo(3), reviewers: [
    { id: 7, pr_id: 5, login: 'alex-kim', avatar_url: 'https://avatars.githubusercontent.com/alex-kim?v=4', state: 'APPROVED' },
  ]},
  { id: 6, repo_id: 2, number: 87, title: 'feat: add PostgreSQL connection pooling', author_login: 'sarah-chen', author_avatar_url: 'https://avatars.githubusercontent.com/sarah-chen?v=4', status: 'open', ci_status: 'pending', head_branch: 'feature/pg-pool', base_branch: 'develop', created_at: daysAgo(1), updated_at: daysAgo(0), reviewers: [] },
  { id: 7, repo_id: 3, number: 34, title: 'feat: add Terraform module for EKS cluster', author_login: 'dave-wilson', author_avatar_url: 'https://avatars.githubusercontent.com/dave-wilson?v=4', status: 'merged', ci_status: 'success', head_branch: 'feature/eks-tf', base_branch: 'main', created_at: daysAgo(8), updated_at: daysAgo(5), reviewers: [
    { id: 8, pr_id: 7, login: 'lisa-nguyen', avatar_url: 'https://avatars.githubusercontent.com/lisa-nguyen?v=4', state: 'APPROVED' },
  ]},
  { id: 8, repo_id: 3, number: 33, title: 'fix: update S3 bucket policies for compliance', author_login: 'lisa-nguyen', author_avatar_url: 'https://avatars.githubusercontent.com/lisa-nguyen?v=4', status: 'open', ci_status: 'success', head_branch: 'fix/s3-policies', base_branch: 'main', created_at: daysAgo(4), updated_at: daysAgo(1), reviewers: [
    { id: 9, pr_id: 8, login: 'dave-wilson', avatar_url: 'https://avatars.githubusercontent.com/dave-wilson?v=4', state: 'PENDING' },
  ]},
]

const pipelineJobs: PipelineJob[] = [
  { id: 1, run_id: 1, name: 'lint', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(5), completed_at: daysAgo(5) },
  { id: 2, run_id: 1, name: 'build', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(5), completed_at: daysAgo(5) },
  { id: 3, run_id: 1, name: 'test', stage: 'test', status: 'completed', conclusion: 'success', started_at: daysAgo(5), completed_at: daysAgo(5) },
  { id: 4, run_id: 2, name: 'lint', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(4), completed_at: daysAgo(4) },
  { id: 5, run_id: 2, name: 'build', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(4), completed_at: daysAgo(4) },
  { id: 6, run_id: 2, name: 'test', stage: 'test', status: 'completed', conclusion: 'success', started_at: daysAgo(4), completed_at: daysAgo(4) },
  { id: 7, run_id: 2, name: 'e2e', stage: 'test', status: 'completed', conclusion: 'success', started_at: daysAgo(4), completed_at: daysAgo(4) },
  { id: 8, run_id: 3, name: 'lint', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(3), completed_at: daysAgo(3) },
  { id: 9, run_id: 3, name: 'build', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(3), completed_at: daysAgo(3) },
  { id: 10, run_id: 3, name: 'test', stage: 'test', status: 'completed', conclusion: 'success', started_at: daysAgo(3), completed_at: daysAgo(3) },
  { id: 11, run_id: 4, name: 'lint', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(3), completed_at: daysAgo(3) },
  { id: 12, run_id: 4, name: 'build', stage: 'build', status: 'completed', conclusion: 'failure', started_at: daysAgo(3), completed_at: daysAgo(3) },
  { id: 13, run_id: 4, name: 'test', stage: 'test', status: 'queued', conclusion: null, started_at: null, completed_at: null },
  { id: 14, run_id: 5, name: 'lint', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(1), completed_at: daysAgo(1) },
  { id: 15, run_id: 5, name: 'build', stage: 'build', status: 'in_progress', conclusion: null, started_at: daysAgo(1), completed_at: null },
  { id: 16, run_id: 6, name: 'lint', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(2), completed_at: daysAgo(2) },
  { id: 17, run_id: 6, name: 'build', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(2), completed_at: daysAgo(2) },
  { id: 18, run_id: 6, name: 'test', stage: 'test', status: 'completed', conclusion: 'success', started_at: daysAgo(2), completed_at: daysAgo(2) },
  { id: 19, run_id: 6, name: 'deploy-staging', stage: 'deploy', status: 'completed', conclusion: 'success', started_at: daysAgo(2), completed_at: daysAgo(2) },
  { id: 20, run_id: 7, name: 'lint', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(1), completed_at: daysAgo(1) },
  { id: 21, run_id: 7, name: 'build', stage: 'build', status: 'in_progress', conclusion: null, started_at: daysAgo(0), completed_at: null },
  { id: 22, run_id: 8, name: 'lint', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(4), completed_at: daysAgo(4) },
  { id: 23, run_id: 8, name: 'build', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(4), completed_at: daysAgo(4) },
  { id: 24, run_id: 8, name: 'test', stage: 'test', status: 'completed', conclusion: 'success', started_at: daysAgo(4), completed_at: daysAgo(4) },
  { id: 25, run_id: 9, name: 'lint', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(2), completed_at: daysAgo(2) },
  { id: 26, run_id: 9, name: 'build', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(2), completed_at: daysAgo(2) },
  { id: 27, run_id: 9, name: 'test', stage: 'test', status: 'completed', conclusion: 'success', started_at: daysAgo(2), completed_at: daysAgo(2) },
  { id: 28, run_id: 9, name: 'deploy-staging', stage: 'deploy', status: 'completed', conclusion: 'success', started_at: daysAgo(2), completed_at: daysAgo(2) },
  { id: 29, run_id: 10, name: 'validate', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(5), completed_at: daysAgo(5) },
  { id: 30, run_id: 10, name: 'plan', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(5), completed_at: daysAgo(5) },
  { id: 31, run_id: 10, name: 'apply', stage: 'deploy', status: 'completed', conclusion: 'success', started_at: daysAgo(5), completed_at: daysAgo(5) },
  { id: 32, run_id: 11, name: 'validate', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(3), completed_at: daysAgo(3) },
  { id: 33, run_id: 11, name: 'plan', stage: 'build', status: 'completed', conclusion: 'success', started_at: daysAgo(3), completed_at: daysAgo(3) },
  { id: 34, run_id: 11, name: 'apply', stage: 'deploy', status: 'completed', conclusion: 'success', started_at: daysAgo(3), completed_at: daysAgo(3) },
  { id: 35, run_id: 12, name: 'validate', stage: 'build', status: 'queued', conclusion: null, started_at: null, completed_at: null },
  { id: 36, run_id: 12, name: 'plan', stage: 'build', status: 'queued', conclusion: null, started_at: null, completed_at: null },
]

const pipelineRuns: PipelineRun[] = [
  { id: 1, repo_id: 1, run_number: 1101, event: 'push', branch: 'main', commit_sha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', status: 'completed', conclusion: 'success', created_at: daysAgo(6), updated_at: daysAgo(5) },
  { id: 2, repo_id: 1, run_number: 1102, event: 'pull_request', branch: 'feature/dark-mode', commit_sha: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1', status: 'completed', conclusion: 'success', created_at: daysAgo(5), updated_at: daysAgo(4) },
  { id: 3, repo_id: 1, run_number: 1103, event: 'pull_request', branch: 'fix/ws-memory-leak', commit_sha: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2', status: 'completed', conclusion: 'success', created_at: daysAgo(4), updated_at: daysAgo(3) },
  { id: 4, repo_id: 1, run_number: 1104, event: 'push', branch: 'main', commit_sha: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3', status: 'completed', conclusion: 'failure', created_at: daysAgo(3), updated_at: daysAgo(3) },
  { id: 5, repo_id: 1, run_number: 1105, event: 'push', branch: 'develop', commit_sha: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4', status: 'in_progress', conclusion: null, created_at: daysAgo(1), updated_at: daysAgo(0) },
  { id: 6, repo_id: 2, run_number: 891, event: 'push', branch: 'develop', commit_sha: 'f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5', status: 'completed', conclusion: 'success', created_at: daysAgo(3), updated_at: daysAgo(2) },
  { id: 7, repo_id: 2, run_number: 892, event: 'pull_request', branch: 'feature/rate-limit', commit_sha: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6', status: 'in_progress', conclusion: null, created_at: daysAgo(1), updated_at: daysAgo(0) },
  { id: 8, repo_id: 2, run_number: 893, event: 'pull_request', branch: 'fix/jwt-expiry', commit_sha: 'b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7', status: 'completed', conclusion: 'success', created_at: daysAgo(5), updated_at: daysAgo(4) },
  { id: 9, repo_id: 2, run_number: 894, event: 'push', branch: 'develop', commit_sha: 'c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8', status: 'completed', conclusion: 'success', created_at: daysAgo(3), updated_at: daysAgo(2) },
  { id: 10, repo_id: 3, run_number: 312, event: 'push', branch: 'main', commit_sha: 'd0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9', status: 'completed', conclusion: 'success', created_at: daysAgo(7), updated_at: daysAgo(5) },
  { id: 11, repo_id: 3, run_number: 313, event: 'pull_request', branch: 'feature/eks-tf', commit_sha: 'e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0', status: 'completed', conclusion: 'success', created_at: daysAgo(5), updated_at: daysAgo(3) },
  { id: 12, repo_id: 3, run_number: 314, event: 'pull_request', branch: 'fix/s3-policies', commit_sha: 'f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1', status: 'queued', conclusion: null, created_at: daysAgo(0), updated_at: daysAgo(0) },
]

const coverageRecords: CoverageRecord[] = []
for (let day = 29; day >= 0; day--) {
  const bases = [
    { line: 87.2, branch: 88.1 },
    { line: 82.5, branch: 83.8 },
    { line: 91.0, branch: 92.3 },
  ]
  for (let repoIdx = 0; repoIdx < 3; repoIdx++) {
    coverageRecords.push({
      id: genId(),
      repo_id: repos[repoIdx].id,
      branch: 'main',
      line_coverage: bases[repoIdx].line + (29 - day) * 0.12 + (Math.random() - 0.3) * 0.8,
      branch_coverage: bases[repoIdx].branch + (29 - day) * 0.09 + (Math.random() - 0.3) * 0.6,
      recorded_at: daysAgo(day),
    })
  }
}

const deployRecords: DeployRecord[] = [
  { id: 1, repo_id: 1, environment: 'staging', status: 'success', triggered_by: 'sarah-chen', workflow_run_id: null, started_at: daysAgo(5), completed_at: daysAgo(5) },
  { id: 2, repo_id: 1, environment: 'production', status: 'success', triggered_by: 'jen-liu', workflow_run_id: null, started_at: daysAgo(4), completed_at: daysAgo(4) },
  { id: 3, repo_id: 1, environment: 'staging', status: 'success', triggered_by: 'mike-ross', workflow_run_id: null, started_at: daysAgo(2), completed_at: daysAgo(2) },
  { id: 4, repo_id: 1, environment: 'production', status: 'failed', triggered_by: 'sarah-chen', workflow_run_id: null, started_at: daysAgo(1), completed_at: daysAgo(1) },
  { id: 5, repo_id: 2, environment: 'staging', status: 'success', triggered_by: 'alex-kim', workflow_run_id: null, started_at: daysAgo(6), completed_at: daysAgo(6) },
  { id: 6, repo_id: 2, environment: 'production', status: 'success', triggered_by: 'priya-patel', workflow_run_id: null, started_at: daysAgo(3), completed_at: daysAgo(3) },
  { id: 7, repo_id: 2, environment: 'staging', status: 'failed', triggered_by: 'alex-kim', workflow_run_id: null, started_at: daysAgo(1), completed_at: daysAgo(1) },
  { id: 8, repo_id: 3, environment: 'staging', status: 'success', triggered_by: 'dave-wilson', workflow_run_id: null, started_at: daysAgo(7), completed_at: daysAgo(7) },
  { id: 9, repo_id: 3, environment: 'production', status: 'success', triggered_by: 'lisa-nguyen', workflow_run_id: null, started_at: daysAgo(5), completed_at: daysAgo(5) },
  { id: 10, repo_id: 3, environment: 'production', status: 'success', triggered_by: 'dave-wilson', workflow_run_id: null, started_at: daysAgo(2), completed_at: daysAgo(2) },
]

const workflows: Workflow[] = [
  { id: 1, repo_id: 1, github_id: 10001, name: 'CI', state: 'active', path: '.github/workflows/ci.yml' },
  { id: 2, repo_id: 1, github_id: 10002, name: 'Deploy Staging', state: 'active', path: '.github/workflows/deploy-staging.yml' },
  { id: 3, repo_id: 1, github_id: 10003, name: 'Deploy Production', state: 'active', path: '.github/workflows/deploy-production.yml' },
  { id: 4, repo_id: 2, github_id: 20001, name: 'CI', state: 'active', path: '.github/workflows/ci.yml' },
  { id: 5, repo_id: 2, github_id: 20002, name: 'Deploy', state: 'active', path: '.github/workflows/deploy.yml' },
  { id: 6, repo_id: 2, github_id: 20003, name: 'Security Scan', state: 'active', path: '.github/workflows/security-scan.yml' },
  { id: 7, repo_id: 3, github_id: 30001, name: 'Terraform CI', state: 'active', path: '.github/workflows/tf-ci.yml' },
  { id: 8, repo_id: 3, github_id: 30002, name: 'Terraform Deploy', state: 'active', path: '.github/workflows/tf-deploy.yml' },
]

export const db = {
  repos,
  pullRequests,
  pipelineRuns,
  pipelineJobs,
  coverageRecords,
  deployRecords,
  workflows,
  genId,
}
