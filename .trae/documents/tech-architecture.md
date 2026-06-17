## 1. 架构设计

```mermaid
graph TB
    subgraph "前端"
        "React SPA" --> "Zustand状态管理"
        "Zustand状态管理" --> "WebSocket客户端"
        "Zustand状态管理" --> "页面组件"
    end

    subgraph "后端"
        "Express服务器" --> "Webhook控制器"
        "Express服务器" --> "API路由"
        "Express服务器" --> "WebSocket服务"
        "Webhook控制器" --> "事件处理服务"
        "API路由" --> "GitHub API代理"
        "事件处理服务" --> "数据存储"
        "GitHub API代理" --> "GitHub REST API"
    end

    subgraph "数据层"
        "SQLite数据库" --> "事件表"
        "SQLite数据库" --> "PR表"
        "SQLite数据库" --> "工作流运行表"
        "SQLite数据库" --> "部署记录表"
        "SQLite数据库" --> "覆盖率记录表"
    end

    "GitHub" -->|"Webhook"| "Webhook控制器"
    "WebSocket服务" -->|"实时推送"| "WebSocket客户端"
    "前端" -->|"REST API"| "API路由"
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + Tailwind CSS@3 + Vite
- **状态管理**：Zustand
- **图表库**：Recharts
- **初始化工具**：vite-init（react-express-ts 模板）
- **后端**：Express@4 + TypeScript（ESM）
- **数据库**：SQLite（better-sqlite3）
- **实时通信**：ws（WebSocket 库）
- **GitHub 集成**：Octokit REST API 客户端

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 看板主页，按仓库分组展示 PR 列表 |
| `/pipeline/:repo/:runId` | 流水线详情视图，按阶段展示步骤 |
| `/coverage` | 测试覆盖率历史趋势图 |
| `/workflows` | 工作流触发与管理 |
| `/deploy-stats` | 部署频率与成功率统计 |

## 4. API 定义

### 4.1 Webhook 接收

```typescript
POST /api/webhook/github
Headers: { "X-GitHub-Event": string, "X-Hub-Signature-256": string }
Body: GitHub Webhook Payload
Response: { received: boolean }
```

### 4.2 仓库与 PR

```typescript
GET /api/repos
Response: Array<{ id: number; name: string; full_name: string; avatar_url: string }>

GET /api/repos/:repoId/pull-requests?status=open&limit=20
Response: Array<{
  id: number;
  number: number;
  title: string;
  author: { login: string; avatar_url: string };
  status: "open" | "closed" | "merged";
  ci_status: "pending" | "success" | "failure" | "running";
  reviewers: Array<{ login: string; avatar_url: string; state: "APPROVED" | "CHANGES_REQUESTED" | "PENDING" }>;
  created_at: string;
  updated_at: string;
}>
```

### 4.3 流水线

```typescript
GET /api/repos/:repoId/pipeline-runs?limit=10
Response: Array<{
  id: number;
  run_number: number;
  event: string;
  branch: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | null;
  created_at: string;
  updated_at: string;
  jobs: Array<{
    id: number;
    name: string;
    stage: "build" | "test" | "deploy";
    status: string;
    conclusion: string;
    started_at: string;
    completed_at: string;
    steps: Array<{
      name: string;
      status: string;
      conclusion: string;
      number: number;
      started_at: string;
      completed_at: string;
    }>;
  }>;
}>
```

### 4.4 测试覆盖率

```typescript
GET /api/repos/:repoId/coverage?branch=main&days=30
Response: Array<{
  date: string;
  branch: string;
  line_coverage: number;
  branch_coverage: number;
}>

GET /api/repos/:repoId/coverage/branches
Response: Array<{
  branch: string;
  latest_line_coverage: number;
  latest_branch_coverage: number;
  trend: "up" | "down" | "stable";
  change: number;
}>
```

### 4.5 工作流触发

```typescript
GET /api/repos/:repoId/workflows
Response: Array<{
  id: number;
  name: string;
  state: "active" | "disabled";
  path: string;
}>

POST /api/repos/:repoId/workflows/:workflowId/dispatch
Body: { ref: string; inputs?: Record<string, string> }
Response: { dispatched: boolean; message: string }
```

### 4.6 部署统计

```typescript
GET /api/deploy-stats?repoIds=1,2&from=2024-01-01&to=2024-12-31&granularity=week
Response: {
  frequency: Array<{ period: string; count: number }>;
  success_rate: Array<{ period: string; rate: number; total: number; success: number }>;
  overall: { total_deploys: number; success_rate: number; avg_daily: number };
}
```

### 4.7 Webhook 注册

```typescript
POST /api/webhook/register
Body: { repo_full_name: string; events: string[] }
Response: { registered: boolean; webhook_id: number }
```

## 5. 服务端架构图

```mermaid
graph LR
    "Webhook控制器" --> "事件处理服务"
    "API路由" --> "仓库服务"
    "API路由" --> "工作流服务"
    "API路由" --> "统计服务"
    "仓库服务" --> "数据存储层"
    "工作流服务" --> "GitHub API客户端"
    "工作流服务" --> "数据存储层"
    "统计服务" --> "数据存储层"
    "事件处理服务" --> "数据存储层"
    "事件处理服务" --> "WebSocket推送"
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erdiag
    "Repository" {
        int id PK
        string name
        string full_name
        string avatar_url
        string webhook_id
    }
    "PullRequest" {
        int id PK
        int repo_id FK
        int number
        string title
        string author_login
        string status
        string ci_status
        datetime created_at
        datetime updated_at
    }
    "Reviewer" {
        int id PK
        int pr_id FK
        string login
        string avatar_url
        string state
    }
    "PipelineRun" {
        int id PK
        int repo_id FK
        int run_number
        string event
        string branch
        string status
        string conclusion
        datetime created_at
        datetime updated_at
    }
    "PipelineJob" {
        int id PK
        int run_id FK
        string name
        string stage
        string status
        string conclusion
        datetime started_at
        datetime completed_at
    }
    "CoverageRecord" {
        int id PK
        int repo_id FK
        string branch
        float line_coverage
        float branch_coverage
        date recorded_at
    }
    "DeployRecord" {
        int id PK
        int repo_id FK
        string environment
        string status
        string triggered_by
        datetime started_at
        datetime completed_at
    }
    "Workflow" {
        int id PK
        int repo_id FK
        string name
        string state
        string path
    }

    "Repository" ||--o{ "PullRequest" : "has"
    "PullRequest" ||--o{ "Reviewer" : "has"
    "Repository" ||--o{ "PipelineRun" : "has"
    "PipelineRun" ||--o{ "PipelineJob" : "has"
    "Repository" ||--o{ "CoverageRecord" : "has"
    "Repository" ||--o{ "DeployRecord" : "has"
    "Repository" ||--o{ "Workflow" : "has"
```

### 6.2 数据定义语言

```sql
CREATE TABLE repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  webhook_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pull_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  author_login TEXT NOT NULL,
  author_avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  ci_status TEXT NOT NULL DEFAULT 'pending',
  head_branch TEXT,
  base_branch TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE(repo_id, number)
);

CREATE TABLE reviewers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pr_id INTEGER NOT NULL REFERENCES pull_requests(id),
  login TEXT NOT NULL,
  avatar_url TEXT,
  state TEXT NOT NULL DEFAULT 'PENDING',
  UNIQUE(pr_id, login)
);

CREATE TABLE pipeline_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id),
  run_number INTEGER NOT NULL,
  event TEXT,
  branch TEXT,
  commit_sha TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  conclusion TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE(repo_id, run_number)
);

CREATE TABLE pipeline_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES pipeline_runs(id),
  name TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  conclusion TEXT,
  started_at DATETIME,
  completed_at DATETIME
);

CREATE TABLE coverage_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id),
  branch TEXT NOT NULL,
  line_coverage REAL NOT NULL,
  branch_coverage REAL NOT NULL,
  recorded_at DATE NOT NULL,
  UNIQUE(repo_id, branch, recorded_at)
);

CREATE TABLE deploy_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id),
  environment TEXT NOT NULL,
  status TEXT NOT NULL,
  triggered_by TEXT,
  workflow_run_id INTEGER,
  started_at DATETIME NOT NULL,
  completed_at DATETIME
);

CREATE TABLE workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id),
  github_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',
  path TEXT,
  UNIQUE(repo_id, github_id)
);

CREATE INDEX idx_pr_repo ON pull_requests(repo_id, status);
CREATE INDEX idx_pr_ci ON pull_requests(ci_status);
CREATE INDEX idx_pipeline_runs_repo ON pipeline_runs(repo_id, status);
CREATE INDEX idx_coverage_repo_branch ON coverage_records(repo_id, branch);
CREATE INDEX idx_deploy_repo ON deploy_records(repo_id, started_at);
```
