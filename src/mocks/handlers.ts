import { http, HttpResponse } from 'msw/http'
import { ApiError, type ApiErrorResponse, type RefundApiResponse } from '../services/orderApi.types'
import type { MockRefundResult } from './mockOrderStore'
import { mockRuntime } from './runtime'

function errorResponse(error: unknown, orderId?: string) {
  const cause = error instanceof ApiError ? error
    : error instanceof DOMException && error.name === 'AbortError'
      ? new ApiError(499, 'REQUEST_CANCELLED', 'The request was cancelled.')
      : new ApiError(500, 'INTERNAL_ERROR', 'The mock order service could not process this request.')
  const body: ApiErrorResponse = {
    success: false,
    ...(orderId === undefined ? {} : { orderId }),
    status: 'error',
    error: { code: cause.code, message: cause.message, details: cause.details },
  }
  return HttpResponse.json(body, { status: cause.status })
}

export function refundHttpResponse(result: MockRefundResult) {
  const body: RefundApiResponse = {
    success: true,
    orderId: result.refund.orderId,
    refundAmount: result.refund.amountMinorUnits / 100,
    currency: result.refund.currency,
    status: 'success',
  }
  return HttpResponse.json(body, {
    status: 201,
    headers: { 'X-Order-Version': String(result.version), 'Access-Control-Expose-Headers': 'X-Order-Version' },
  })
}

export const handlers = [
  http.get('*/api/orders/:orderId', async ({ params, request }) => {
    const service = mockRuntime.service
    const latencyMs = mockRuntime.controls.getSnapshot().latencyMs
    try { return HttpResponse.json(await service.getOrder(String(params.orderId), { signal: request.signal, latencyMs }), { status: 200 }) }
    catch (error: unknown) { return errorResponse(error, String(params.orderId)) }
  }),
  http.post('*/api/orders/:orderId/refunds', async ({ params, request }) => {
    const service = mockRuntime.service
    const orderId = String(params.orderId)
    let body: unknown
    try { body = await request.json() }
    catch { return errorResponse(new ApiError(400, 'INVALID_JSON', 'The refund request must contain valid JSON.'), orderId) }
    if (request.signal.aborted) return errorResponse(new ApiError(499, 'REQUEST_CANCELLED', 'The request was cancelled.'), orderId)
    const scenario = mockRuntime.controls.takeRefundScenario()
    try {
      const response = await service.postRefund(orderId, body, {
        signal: request.signal, latencyMs: scenario.latencyMs, simulateFailure: scenario.failNextRefund,
      })
      return refundHttpResponse(response)
    } catch (error: unknown) { return errorResponse(error, orderId) }
  }),
  http.all('*/api/*', () => errorResponse(new ApiError(404, 'ENDPOINT_NOT_FOUND', 'This mock API endpoint does not exist.'))),
]
