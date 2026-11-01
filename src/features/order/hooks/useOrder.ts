import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, type OrderApi } from '../../../services/orderApi.types'
import type { OrderSnapshot } from '../state/orderStore'

export function useOrder(api: OrderApi, orderId: string) {
  const [snapshot, setSnapshot] = useState<OrderSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const activeRef = useRef<AbortController | null>(null)
  const requestSequence = useRef(0)
  const minimumVersion = useRef(0)

  const fetchOrder = useCallback((expectedVersion = 0) => {
    activeRef.current?.abort()
    const controller = new AbortController()
    activeRef.current = controller
    const sequence = ++requestSequence.current
    minimumVersion.current = Math.max(minimumVersion.current, expectedVersion)
    void api.getOrder(orderId, { signal: controller.signal }).then((incoming) => {
      if (sequence !== requestSequence.current || controller.signal.aborted) return
      if (incoming.version < minimumVersion.current) throw new ApiError(409, 'STALE_ORDER', 'The refreshed order is out of date. Please retry loading it.')
      setSnapshot((current) => !current || incoming.version >= current.version ? incoming : current)
      setLoadError('')
    }).catch((error: unknown) => {
      if (sequence === requestSequence.current && !controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load the current order.')
    }).finally(() => {
      if (sequence === requestSequence.current && !controller.signal.aborted) {
        setIsLoading(false)
        activeRef.current = null
      }
    })
  }, [api, orderId])

  useEffect(() => {
    void fetchOrder()
    return () => { activeRef.current?.abort(); activeRef.current = null }
  }, [fetchOrder])

  const reload = useCallback((expectedVersion = 0) => {
    setIsLoading(true)
    setLoadError('')
    void fetchOrder(expectedVersion)
  }, [fetchOrder])

  return { order: snapshot?.order ?? null, isLoading, loadError, reload }
}
