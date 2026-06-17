import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import { useWebSocket } from '@/hooks/useWebSocket'
import Dashboard from '@/pages/Dashboard'
import Pipeline from '@/pages/Pipeline'
import Coverage from '@/pages/Coverage'
import Workflows from '@/pages/Workflows'
import DeployStats from '@/pages/DeployStats'

function Layout() {
  useWebSocket()

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 lg:ml-0 overflow-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/coverage" element={<Coverage />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/deploy-stats" element={<DeployStats />} />
        </Route>
      </Routes>
    </Router>
  )
}
