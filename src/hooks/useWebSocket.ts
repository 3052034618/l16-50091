import { useEffect } from 'react'
import { useWebSocketStore } from '@/stores/websocket'

export function useWebSocket() {
  const connected = useWebSocketStore((s) => s.connected)
  const lastEvent = useWebSocketStore((s) => s.lastEvent)
  const connect = useWebSocketStore((s) => s.connect)
  const disconnect = useWebSocketStore((s) => s.disconnect)

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return { connected, lastEvent }
}
