import { refundChannels, refundReasons } from '../features/refund/types/refundFlow.types'
import { ApiError, type RefundApiRequest } from './orderApi.types'
import type { RefundAddOnSelection } from '../features/refund/utils/refundCalculator'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string')
}

function isAddOnSelection(value: unknown): value is RefundAddOnSelection {
  return isRecord(value) && typeof value.unitId === 'string' && typeof value.addonId === 'string'
}

export function parseRefundRequest(value: unknown): RefundApiRequest {
  if (!isRecord(value) || typeof value.requestId !== 'string' || !value.requestId.trim() ||
    typeof value.orderId !== 'string' || !isRecord(value.selection)) {
    throw new ApiError(400, 'INVALID_REQUEST', 'Provide an order ID, request ID, and refund selection.')
  }
  const { selection } = value
  if (!isStringArray(selection.selectedUnitIds) ||
    !Array.isArray(selection.selectedAddOns) || !selection.selectedAddOns.every(isAddOnSelection) ||
    typeof selection.includeDeliveryFee !== 'boolean') {
    throw new ApiError(400, 'INVALID_REQUEST', 'The refund selection has an invalid structure.')
  }
  const reason = refundReasons.find((candidate) => candidate === value.reason)
  const channel = refundChannels.find((candidate) => candidate.value === value.channel)?.value
  const details = [...(!reason ? ['Select a valid refund reason.'] : []), ...(!channel ? ['Choose a valid refund channel.'] : [])]
  if (!reason || !channel) throw new ApiError(422, 'VALIDATION_ERROR', 'Select a valid refund reason and channel.', details)
  return {
    requestId: value.requestId,
    orderId: value.orderId,
    reason,
    channel,
    selection: {
      selectedUnitIds: [...selection.selectedUnitIds],
      selectedAddOns: selection.selectedAddOns.map(({ unitId, addonId }) => ({ unitId, addonId })),
      includeDeliveryFee: selection.includeDeliveryFee,
    },
  }
}

export function refundRequestFingerprint(request: RefundApiRequest): string {
  return JSON.stringify([
    request.orderId,
    [...request.selection.selectedUnitIds].sort(),
    request.selection.selectedAddOns.map(({ unitId, addonId }) => JSON.stringify([unitId, addonId])).sort(),
    request.selection.includeDeliveryFee,
    request.reason,
    request.channel,
  ])
}
