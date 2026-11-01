import type { OrderCurrency, OrderItem, OrderJson, OrderUnit } from '../types/order.types'

function toCents(amount: number): number {
  return Math.round(amount * 100)
}

export function getUnitTotalCents(item: OrderItem, unit: OrderUnit): number {
  return toCents(item.unit_price) + unit.addons.reduce((sum, addOn) => sum + toCents(addOn.unit_price), 0)
}

export function getItemSubtotalCents(item: OrderItem): number {
  return item.units.reduce((sum, unit) => sum + getUnitTotalCents(item, unit), 0)
}

export function calculateOrderTotals(order: OrderJson) {
  const subtotalCents = order.items.reduce(
    (sum, item) => sum + getItemSubtotalCents(item),
    0,
  )
  const deliveryCents = toCents(order.delivery_fee)

  return {
    subtotal: subtotalCents / 100,
    deliveryFee: deliveryCents / 100,
    total: (subtotalCents + deliveryCents) / 100,
  }
}

export function formatMoney(amount: number, currency: OrderCurrency): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
