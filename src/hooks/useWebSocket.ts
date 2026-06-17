import { useEffect, useRef } from 'react'
import { useWebSocketStore } from '@/stores/websocket'

export function useWebSocket() {
  const connected = useWebSocketStore((s) => s.connected)
  const lastEvent = useWebSocketStore((s) => s.lastEvent)
  const connect = useWebSocketStore((s) => s.connect)
  const disconnect = useWebSocketStore((s) => s.disconnect)
  const subscribe = useWebSocketStore((s) => s.subscribe)

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return { connected, lastEvent, subscribe }
}

export function useWebSocketListener(
  eventTypes: string[],
  handler: (event: { type: string; payload: any; timestamp: number }) => void,
  enabled: boolean = true
) {
  const { subscribe, connected } = useWebSocket()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return
    const unsub = subscribe((event) => {
      if (eventTypes.includes(event.type)) {
        handlerRef.current(event)
      }
    })
    return unsub
  }, [subscribe, enabled, eventTypes.join(',')])

  return { connected }
}
