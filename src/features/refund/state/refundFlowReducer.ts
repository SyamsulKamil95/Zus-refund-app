import type { RefundChannel, RefundDraft, RefundReason } from '../types/refundFlow.types'

interface RefundFlowState extends RefundDraft {
  step: 'selection' | 'review'
  validationAttempts: number
}

type RefundFlowAction =
  | { type: 'toggle-unit'; unitId: string; selected: boolean }
  | { type: 'toggle-addon'; unitId: string; addonId: string; selected: boolean }
  | { type: 'toggle-delivery'; selected: boolean }
  | { type: 'set-reason'; reason: RefundReason | '' }
  | { type: 'set-channel'; channel: RefundChannel }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'validation-failed' }

export function createRefundFlowState(): RefundFlowState {
  return {
    step: 'selection',
    selection: { selectedUnitIds: [], selectedAddOns: [], includeDeliveryFee: false },
    reason: '',
    channel: '',
    validationAttempts: 0,
  }
}

export function refundFlowReducer(state: RefundFlowState, action: RefundFlowAction): RefundFlowState {
  switch (action.type) {
    case 'toggle-unit': {
      const unitIds = state.selection.selectedUnitIds.filter((unitId) => unitId !== action.unitId)
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedUnitIds: action.selected ? [...unitIds, action.unitId] : unitIds,
          selectedAddOns: action.selected
            ? state.selection.selectedAddOns
            : state.selection.selectedAddOns.filter((addOn) => addOn.unitId !== action.unitId),
        },
      }
    }
    case 'toggle-addon': {
      const addOns = state.selection.selectedAddOns.filter(
        (addOn) => addOn.unitId !== action.unitId || addOn.addonId !== action.addonId,
      )
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedAddOns: action.selected ? [...addOns, { unitId: action.unitId, addonId: action.addonId }] : addOns,
        },
      }
    }
    case 'toggle-delivery':
      return { ...state, selection: { ...state.selection, includeDeliveryFee: action.selected } }
    case 'set-reason':
      return { ...state, reason: action.reason }
    case 'set-channel':
      return { ...state, channel: action.channel }
    case 'next':
      return { ...state, step: 'review' }
    case 'back':
      return { ...state, step: 'selection' }
    case 'validation-failed':
      return { ...state, validationAttempts: state.validationAttempts + 1 }
  }
}
