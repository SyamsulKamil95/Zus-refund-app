import { useEffect, useRef, useState } from 'react'
import { ApiError, type OrderApi, type RefundApiRequest, type RefundApiResponse } from '../../../services/orderApi.types'

export function useRefundSubmission(api: OrderApi, onSuccess: (response: RefundApiResponse) => void) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inFlightRef = useRef(false)
  const activeRequestRef = useRef<AbortController | null>(null)

  useEffect(() => () => {
    activeRequestRef.current?.abort()
    activeRequestRef.current = null
  }, [])

  async function submit(request: RefundApiRequest) {
    if (inFlightRef.current) return
    inFlightRef.current = true
    const controller = new AbortController()
    activeRequestRef.current = controller
    setIsSubmitting(true)
    setError('')
    try {
      const response = await api.postRefund(request.orderId, request, { signal: controller.signal })
      if (activeRequestRef.current === controller && !controller.signal.aborted) onSuccess(response)
    } catch (cause: unknown) {
      if (activeRequestRef.current === controller && !controller.signal.aborted) {
        setError(cause instanceof ApiError
          ? [cause.message, ...cause.details].join(' ')
          : 'Unable to submit the refund. Please retry.')
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null
        inFlightRef.current = false
        setIsSubmitting(false)
      }
    }
  }

  return { submit, isSubmitting, error }
}
