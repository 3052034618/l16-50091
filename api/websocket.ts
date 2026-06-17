import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'

const clients = new Set<WebSocket>()

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => {
      clients.delete(ws)
    })
    ws.on('error', () => {
      clients.delete(ws)
    })
  })
}

export function broadcastEvent(type: string, payload: any) {
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() })
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}
