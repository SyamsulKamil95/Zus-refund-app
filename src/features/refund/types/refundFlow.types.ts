import type { RefundSelection, RefundTotal } from '../utils/refundCalculator'

export const refundReasons = ['Wrong item', 'Missing item', 'Quality issue', 'Late delivery', 'Other'] as const
export type RefundReason = typeof refundReasons[number]

export const refundChannels = [
  { value: 'original-payment-method', label: 'Original payment method' },
  { value: 'in-app-credit', label: 'In-app credit' },
] as const
export type RefundChannel = typeof refundChannels[number]['value']

export interface RefundDraft {
  selection: RefundSelection
  reason: RefundReason | ''
  channel: RefundChannel | ''
}

// UI preview snapshot; the API recalculates the total from its own current order.
export interface RefundConfirmationRequest {
  orderId: string
  selection: RefundSelection
  reason: RefundReason
  channel: RefundChannel
  total: RefundTotal
}
