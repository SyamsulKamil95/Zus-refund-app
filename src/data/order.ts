import orderJson from './order.json'
import type { OrderAddOn, OrderItem, OrderJson, OrderUnit, PaymentStatus } from '../features/order/types/order.types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return value === 'paid' || value === 'refunded'
}

function isAddOn(value: unknown): value is OrderAddOn {
  return isRecord(value) &&
    typeof value.addon_id === 'string' &&
    typeof value.name === 'string' &&
    isMoney(value.unit_price) &&
    isPaymentStatus(value.status)
}

function isUnit(value: unknown): value is OrderUnit {
  return isRecord(value) &&
    typeof value.unit_id === 'string' &&
    isPaymentStatus(value.status) &&
    Array.isArray(value.addons) &&
    value.addons.every(isAddOn)
}

function isOrderItem(value: unknown): value is OrderItem {
  return isRecord(value) &&
    typeof value.line_id === 'string' &&
    typeof value.base_product_id === 'string' &&
    typeof value.name === 'string' &&
    isMoney(value.unit_price) &&
    Array.isArray(value.units) &&
    value.units.every(isUnit)
}

export function isOrderJson(value: unknown): value is OrderJson {
  return isRecord(value) &&
    typeof value.order_id === 'string' &&
    (value.order_date === undefined || (typeof value.order_date === 'string' && Number.isFinite(Date.parse(value.order_date)))) &&
    value.status === 'completed' &&
    value.currency === 'MYR' &&
    isMoney(value.delivery_fee) &&
    isPaymentStatus(value.delivery_fee_status) &&
    Array.isArray(value.items) &&
    value.items.every(isOrderItem)
}

if (!isOrderJson(orderJson)) {
  throw new Error('The order.json data does not match the expected assessment order structure.')
}

// Expose the validated source JSON directly; no order fields are duplicated in the UI layer.
export const order: OrderJson = orderJson
