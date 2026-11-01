import type { OrderJson } from '../../order/types/order.types'
import { refundChannels, refundReasons, type RefundConfirmationRequest, type RefundDraft } from '../types/refundFlow.types'
import { calculateRefundTotal, getRefundableUnits, validateRefundSelection, type RefundSelection } from './refundCalculator'

export function getRefundSelectionErrors(order: OrderJson, selection: RefundSelection): string[] {
  const errors = validateRefundSelection(order, selection).errors.map(({ message }) => message)
  if (selection.selectedUnitIds.length === 0 && !selection.includeDeliveryFee) {
    errors.unshift('Select at least one paid unit or the delivery fee to continue.')
  }
  return errors
}

export function getRefundReviewUnits(order: OrderJson, selection: RefundSelection) {
  return getRefundableUnits(order)
    .filter((unit) => selection.selectedUnitIds.includes(unit.unitId))
    .map((unit) => ({
      ...unit,
      addOns: unit.addOns.filter((addOn) => selection.selectedAddOns.some(
        (selectedAddOn) => selectedAddOn.unitId === unit.unitId && selectedAddOn.addonId === addOn.addon_id,
      )),
    }))
}

export interface RefundReviewErrors {
  selection: string[]
  reason?: string
  channel?: string
}

type ConfirmationPreparation =
  | { isValid: false; errors: RefundReviewErrors }
  | { isValid: true; request: RefundConfirmationRequest }

export function prepareRefundConfirmation(order: OrderJson, draft: RefundDraft): ConfirmationPreparation {
  const errors: RefundReviewErrors = { selection: getRefundSelectionErrors(order, draft.selection) }
  const reason = refundReasons.find((value) => value === draft.reason)
  const channel = refundChannels.find(({ value }) => value === draft.channel)?.value
  if (!reason) errors.reason = 'Select a refund reason.'
  if (!channel) errors.channel = 'Choose a refund channel.'
  if (errors.selection.length > 0 || !reason || !channel) return { isValid: false, errors }

  return {
    isValid: true,
    request: {
      orderId: order.order_id,
      selection: {
        selectedUnitIds: [...draft.selection.selectedUnitIds],
        selectedAddOns: draft.selection.selectedAddOns.map((addOn) => ({ ...addOn })),
        includeDeliveryFee: draft.selection.includeDeliveryFee,
      },
      reason,
      channel,
      total: calculateRefundTotal(order, draft.selection),
    },
  }
}
