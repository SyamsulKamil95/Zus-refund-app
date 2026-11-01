import { ERROR_MESSAGE } from '../constant/constant'
import { isOrderJson } from '../data/order'
import type { OrderSnapshot } from '../features/order/state/orderStore'
import { ApiError, type OrderApi, type RefundApiResponse } from './orderApi.types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOrderSnapshot(value: unknown): value is OrderSnapshot {
  return isRecord(value) && isOrderJson(value.order) && typeof value.version === 'number' && Number.isSafeInteger(value.version) && value.version >= 0
}

function isRefundResponse(value: unknown): value is RefundApiResponse {
  return isRecord(value) && value.success === true && value.status === 'success' &&
    typeof value.orderId === 'string' && value.currency === 'MYR' &&
    typeof value.refundAmount === 'number' && Number.isFinite(value.refundAmount) && value.refundAmount >= 0 &&
    Number.isSafeInteger(Math.round(value.refundAmount * 100)) && Math.round(value.refundAmount * 100) / 100 === value.refundAmount
}

async function requestJson(url: URL, init: RequestInit, expectedStatus: 200 | 201 | 400): Promise<{ data: unknown; headers: Headers }> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  if (response.ok && response.status !== expectedStatus) {
    throw new ApiError(response.status, 'UNEXPECTED_STATUS', ERROR_MESSAGE.SOMETHING_WENT_WRONG)
  }
  let data: unknown
  try { data = await response.json() }
  catch {
    init.signal?.throwIfAborted()
    throw new ApiError(response.status, 'INVALID_RESPONSE', ERROR_MESSAGE.SOMETHING_WENT_WRONG)
  }
  init.signal?.throwIfAborted()
  if (!response.ok) {
    const error = isRecord(data) && data.success === false && data.status === 'error' && isRecord(data.error) ? data.error : null
    throw new ApiError(response.status,
      error && typeof error.code === 'string' ? error.code : 'HTTP_ERROR',
      error && typeof error.message === 'string' ? error.message : `The order service returned HTTP ${response.status}.`,
      error && Array.isArray(error.details) ? error.details.filter((detail: unknown): detail is string => typeof detail === 'string') : [])
  }
  return { data, headers: response.headers }
}

export function createOrderApi(baseUrl = new URL(import.meta.env.VITE_API_BASE_URL || `${import.meta.env.BASE_URL}api/`, window.location.origin).href): OrderApi {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return {
    async getOrder(orderId, options) {
      const { data } = await requestJson(new URL(`orders/${encodeURIComponent(orderId)}`, base), {
        method: 'GET', headers: { Accept: 'application/json' }, signal: options?.signal,
      }, 200)
      if (!isOrderSnapshot(data) || data.order.order_id !== orderId) throw new ApiError(502, 'INVALID_RESPONSE', 'The service returned an invalid order.')
      return data
    },
    async postRefund(orderId, request, options) {
      const { data, headers } = await requestJson(new URL(`orders/${encodeURIComponent(orderId)}/refunds`, base), {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(request), signal: options?.signal,
      }, 201)
      if (!isRefundResponse(data) || data.orderId !== orderId) throw new ApiError(502, 'INVALID_RESPONSE', 'The service returned an invalid refund receipt.')
      const versionHeader = headers.get('X-Order-Version')
      const version = Number(versionHeader)
      if (!versionHeader || !/^[1-9]\d*$/.test(versionHeader) || !Number.isSafeInteger(version)) {
        throw new ApiError(502, 'INVALID_RESPONSE', 'The service returned invalid order version metadata.')
      }
      return { refund: data, version }
    },
  }
}
