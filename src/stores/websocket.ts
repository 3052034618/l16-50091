import { create } from 'zustand'

type EventCallback = (event: { type: string; payload: any; timestamp: number }) => void

interface WSEvent {
  type: string
  payload: unknown
  timestamp: number
}

interface WebSocketState {
  connected: boolean
  lastEvent: WSEvent | null
  ws: WebSocket | null
  subscribers: Set<EventCallback>
  connect: () => void
  disconnect: () => void
  subscribe: (callback: EventCallback) => () => void
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  connected: false,
  lastEvent: null,
  ws: null,
  subscribers: new Set<EventCallback>(),
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
        const eventObj = { type: parsed.type, payload: parsed.payload, timestamp: Date.now() }
        set({ lastEvent: eventObj })
        for (const cb of get().subscribers) {
          cb(eventObj)
        }
      } catch {
        const eventObj = { type: 'raw', payload: event.data, timestamp: Date.now() }
        set({ lastEvent: eventObj })
        for (const cb of get().subscribers) {
          cb(eventObj)
        }
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
  subscribe: (callback: EventCallback) => {
    get().subscribers.add(callback)
    return () => {
      get().subscribers.delete(callback)
    }
  },
}))
