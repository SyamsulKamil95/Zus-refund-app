import { createOrderStore } from '../features/order/state/orderStore'
import type { OrderJson } from '../features/order/types/order.types'
import type { OrderSnapshot } from '../features/order/state/orderStore'
import type { RefundTotal } from '../features/refund/utils/refundCalculator'
import { applyRefund } from '../features/refund/utils/applyRefund'
import { prepareRefundConfirmation } from '../features/refund/utils/refundReview'
import { ApiError, type ApiRequestOptions, type OrderApi } from '../services/orderApi.types'
import { parseRefundRequest, refundRequestFingerprint } from '../services/refundRequest'
import { delay } from 'msw/utils/delay'

interface MockRequestOptions extends ApiRequestOptions {
  simulateFailure?: boolean
  latencyMs?: number
}

interface RefundReceipt extends RefundTotal {
  refundId: string
  requestId: string
  orderId: string
}

export interface MockRefundResult extends OrderSnapshot {
  refund: RefundReceipt
}

export interface MockOrderService {
  getOrder: (orderId: string, options?: MockRequestOptions) => ReturnType<OrderApi['getOrder']>
  postRefund: (orderId: string, request: unknown, options?: MockRequestOptions) => Promise<MockRefundResult>
}

function waitForNetwork(latencyMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal?.removeEventListener('abort', abort)
      reject(new DOMException('The request was cancelled.', 'AbortError'))
    }
    if (signal?.aborted) { abort(); return }
    signal?.addEventListener('abort', abort, { once: true })
    void delay(latencyMs).then(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, (error: unknown) => {
      signal?.removeEventListener('abort', abort)
      reject(error)
    })
  })
}

export function createMockOrderService(initialOrder: OrderJson, { latencyMs = 1000, failNextRefund = false }: { latencyMs?: number; failNextRefund?: boolean } = {}): MockOrderService {
  const store = createOrderStore(initialOrder)
  const storedOrderId = initialOrder.order_id
  const completed = new Map<string, { fingerprint: string; refund: RefundReceipt }>()
  let inFlight = false
  let refundSequence = 0

  function requireOrder(orderId: string) {
    if (orderId !== storedOrderId) throw new ApiError(404, 'ORDER_NOT_FOUND', 'The order was not found.')
  }

  return {
    async getOrder(orderId, options) {
      await waitForNetwork(options?.latencyMs ?? latencyMs, options?.signal)
      options?.signal?.throwIfAborted()
      requireOrder(orderId)
      return store.read()
    },
    async postRefund(orderId, value, options: MockRequestOptions = {}) {
      const request = parseRefundRequest(value)
      requireOrder(orderId)
      if (request.orderId !== orderId) throw new ApiError(400, 'ORDER_MISMATCH', 'The request order ID must match the endpoint.')
      if (inFlight) throw new ApiError(409, 'REFUND_IN_PROGRESS', 'A refund for this order is already being processed.')
      inFlight = true
      try {
        await waitForNetwork(options.latencyMs ?? latencyMs, options.signal)
        options.signal?.throwIfAborted()
        const fingerprint = refundRequestFingerprint(request)
        const previous = completed.get(request.requestId)
        if (previous) {
          if (previous.fingerprint !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This request ID was used for a different refund.')
          return { ...store.read(), refund: { ...previous.refund } }
        }
        const current = store.read()
        const validation = prepareRefundConfirmation(current.order, request)
        if (!validation.isValid) {
          const details = [...validation.errors.selection, validation.errors.reason, validation.errors.channel]
            .filter((message): message is string => Boolean(message))
          throw new ApiError(422, 'INVALID_REFUND_SELECTION', 'The selected items are no longer eligible for refund. Review your selection.', details)
        }
        const shouldSimulateFailure = options.simulateFailure || failNextRefund
        failNextRefund = false
        if (shouldSimulateFailure) throw new ApiError(503, 'SIMULATED_FAILURE', 'The refund service is temporarily unavailable. Please try again.')

        // No await between validation and commit: status changes are atomic within this mock service.
        const snapshot = store.commit(applyRefund(current.order, request.selection))
        const refund: RefundReceipt = {
          ...validation.request.total,
          orderId,
          requestId: request.requestId,
          refundId: `RF-${++refundSequence}`,
        }
        completed.set(request.requestId, { fingerprint, refund })
        return { ...snapshot, refund: { ...refund } }
      } finally {
        inFlight = false
      }
    },
  }
}
