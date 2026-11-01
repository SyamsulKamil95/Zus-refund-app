import { http, HttpResponse } from 'msw/http'
import { ApiError } from '../services/orderApi.types'
import { mockRuntime } from './runtime'

function errorResponse(error: unknown) {
  if (error instanceof ApiError) return HttpResponse.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status })
  if (error instanceof DOMException && error.name === 'AbortError') return new HttpResponse(null, { status: 499 })
  return HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'The mock order service could not process this request.', details: [] } }, { status: 500 })
}

export const handlers = [
  http.get('*/api/orders/:orderId', async ({ params, request }) => {
    const service = mockRuntime.service
    const latencyMs = mockRuntime.controls.getSnapshot().latencyMs
    try { return HttpResponse.json(await service.getOrder(String(params.orderId), { signal: request.signal, latencyMs }), { status: 200 }) }
    catch (error: unknown) { return errorResponse(error) }
  }),
  http.post('*/api/orders/:orderId/refunds', async ({ params, request }) => {
    const service = mockRuntime.service
    let body: unknown
    try { body = await request.json() }
    catch { return HttpResponse.json({ error: { code: 'INVALID_JSON', message: 'The refund request must contain valid JSON.', details: [] } }, { status: 400 }) }
    if (request.signal.aborted) return new HttpResponse(null, { status: 499 })
    const scenario = mockRuntime.controls.takeRefundScenario()
    try {
      const response = await service.postRefund(String(params.orderId), body, {
        signal: request.signal, latencyMs: scenario.latencyMs, simulateFailure: scenario.failNextRefund,
      })
      return HttpResponse.json(response, { status: 201 })
    } catch (error: unknown) { return errorResponse(error) }
  }),
  http.all('*/api/*', () => HttpResponse.json({ error: { code: 'ENDPOINT_NOT_FOUND', message: 'This mock API endpoint does not exist.', details: [] } }, { status: 404 })),
]
