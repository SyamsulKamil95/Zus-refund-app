import type { OrderSnapshot } from '../features/order/state/orderStore'
import type { OrderCurrency } from '../features/order/types/order.types'
import type { RefundChannel, RefundReason } from '../features/refund/types/refundFlow.types'
import type { RefundSelection } from '../features/refund/utils/refundCalculator'

export interface RefundApiRequest {
  requestId: string
  orderId: string
  selection: RefundSelection
  reason: RefundReason
  channel: RefundChannel
}

export interface RefundApiResponse {
  success: true
  orderId: string
  refundAmount: number
  currency: OrderCurrency
  status: 'success'
}

export interface RefundSubmissionResult {
  refund: RefundApiResponse
  version: number
}

export interface ApiErrorResponse {
  success: false
  orderId?: string
  status: 'error'
  error: {
    code: string
    message: string
    details: string[]
  }
}

export interface ApiRequestOptions {
  signal?: AbortSignal
}

export interface OrderApi {
  getOrder: (orderId: string, options?: ApiRequestOptions) => Promise<OrderSnapshot>
  postRefund: (orderId: string, request: unknown, options?: ApiRequestOptions) => Promise<RefundSubmissionResult>
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details: string[] = []) {
    super(message)
    this.name = 'ApiError'
  }
}
