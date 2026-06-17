import { create } from 'zustand'

interface WSEvent {
  type: string
  payload: unknown
  timestamp: number
}

interface WebSocketState {
  connected: boolean
  lastEvent: WSEvent | null
  ws: WebSocket | null
  connect: () => void
  disconnect: () => void
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  connected: false,
  lastEvent: null,
  ws: null,
  connect: () => {
    const existing = get().ws
    if (existing && existing.readyState === WebSocket.OPEN) return

    const ws = new WebSocket('ws://localhost:3002/ws')

    ws.onopen = () => set({ connected: true, ws })
    ws.onclose = () => set({ connected: false, ws: null })
    ws.onerror = () => {
      ws.close()
      set({ connected: false, ws: null })
    }
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        set({ lastEvent: { type: parsed.type, payload: parsed.payload, timestamp: Date.now() } })
      } catch {
        set({ lastEvent: { type: 'raw', payload: event.data, timestamp: Date.now() } })
      }
    }

    set({ ws })
  },
  disconnect: () => {
    const ws = get().ws
    if (ws) {
      ws.close()
      set({ ws: null, connected: false })
    }
  },
}))
