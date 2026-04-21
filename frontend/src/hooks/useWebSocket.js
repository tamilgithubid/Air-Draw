import { useState, useEffect, useRef, useCallback } from 'react'

const RECONNECT_DELAY = 2000
const MAX_RECONNECT_ATTEMPTS = 15

export function useWebSocket(url, { onMessage, autoConnect = true } = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeout = useRef(null)
  const onMessageRef = useRef(onMessage)
  const urlRef = useRef(url)

  onMessageRef.current = onMessage
  urlRef.current = url

  const connect = useCallback(() => {
    const currentUrl = urlRef.current
    if (!currentUrl) return
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

    try {
      const ws = new WebSocket(currentUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] Connected to', currentUrl)
        setIsConnected(true)
        setError(null)
        reconnectAttempts.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessageRef.current?.(data)
        } catch {
          // ignore
        }
      }

      ws.onerror = (e) => {
        console.log('[WS] Error on', currentUrl)
        setError('WebSocket connection error')
      }

      ws.onclose = () => {
        console.log('[WS] Closed', currentUrl)
        setIsConnected(false)
        wsRef.current = null

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, RECONNECT_DELAY)
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }, []) // no deps — reads urlRef.current

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeout.current)
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS + 1
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // Connect/disconnect when url or autoConnect changes
  useEffect(() => {
    if (autoConnect && url) {
      reconnectAttempts.current = 0
      connect()
    }
    return () => {
      clearTimeout(reconnectTimeout.current)
      reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS + 1
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
    }
  }, [url, autoConnect])

  return { isConnected, error, connect, disconnect, sendMessage }
}
