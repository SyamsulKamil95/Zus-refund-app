import type { OrderSnapshot } from '../features/order/state/orderStore'
import type { RefundChannel, RefundReason } from '../features/refund/types/refundFlow.types'
import type { RefundSelection, RefundTotal } from '../features/refund/utils/refundCalculator'

export interface RefundApiRequest {
  requestId: string
  orderId: string
  selection: RefundSelection
  reason: RefundReason
  channel: RefundChannel
}

export interface RefundReceipt extends RefundTotal {
  refundId: string
  requestId: string
  orderId: string
}

export interface RefundApiResponse extends OrderSnapshot {
  refund: RefundReceipt
}

export interface ApiRequestOptions {
  signal?: AbortSignal
}

export interface OrderApi {
  getOrder: (orderId: string, options?: ApiRequestOptions) => Promise<OrderSnapshot>
  postRefund: (orderId: string, request: unknown, options?: ApiRequestOptions) => Promise<RefundApiResponse>
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details: string[] = []) {
    super(message)
    this.name = 'ApiError'
  }
}
