import type { OrderJson } from '../../order/types/order.types'
import type { RefundSelection } from './refundCalculator'

// Call only after validation. A parent refund intentionally leaves unselected add-ons unchanged.
export function applyRefund(order: OrderJson, selection: RefundSelection): OrderJson {
  return {
    ...order,
    delivery_fee_status: selection.includeDeliveryFee ? 'refunded' : order.delivery_fee_status,
    items: order.items.map((item) => ({
      ...item,
      units: item.units.map((unit) => ({
        ...unit,
        status: selection.selectedUnitIds.includes(unit.unit_id) ? 'refunded' : unit.status,
        addons: unit.addons.map((addOn) => ({
          ...addOn,
          status: selection.selectedAddOns.some(
            (selected) => selected.unitId === unit.unit_id && selected.addonId === addOn.addon_id,
          ) ? 'refunded' : addOn.status,
        })),
      })),
    })),
  }
}
