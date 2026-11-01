import { describe, expect, it } from 'vitest'
import { HttpResponse, http } from 'msw/http'
import { order } from '../../data/order'
import { server } from '../../mocks/node'
import { mockRuntime } from '../../mocks/runtime'
import { calculateOrderTotals } from '../../features/order/utils/orderCalculator'
import { createOrderApi } from '../orderApi'
import { ApiError, type RefundApiRequest } from '../orderApi.types'

const endpoint = `http://localhost/api/orders/${order.order_id}`
const api = createOrderApi()
function request(overrides: Partial<RefundApiRequest> = {}): RefundApiRequest {
  return {
    requestId: 'http-request', orderId: order.order_id, reason: 'Quality issue', channel: 'in-app-credit',
    selection: { selectedUnitIds: ['L2-1'], selectedAddOns: [{ unitId: 'L2-1', addonId: 'A2' }], includeDeliveryFee: true },
    ...overrides,
  }
}
function post(body: unknown = request(), url = endpoint) {
  return fetch(`${url}/refunds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

describe('fetch clients and MSW HTTP handlers', () => {
  it('GET returns HTTP 200 and an isolated copy of the original order', async () => {
    const response = await fetch(endpoint)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ order, version: 0 })
    const snapshot = await api.getOrder(order.order_id)
    snapshot.order.items[0].units[1].status = 'refunded'
    expect(await api.getOrder(order.order_id)).toEqual({ order, version: 0 })
  })

  it('GET and POST return HTTP 404 for unknown orders', async () => {
    expect((await fetch('http://localhost/api/orders/INVALID')).status).toBe(404)
    const response = await post(request({ orderId: 'INVALID' }), 'http://localhost/api/orders/INVALID')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ success: false, orderId: 'INVALID', status: 'error', error: {
      code: 'ORDER_NOT_FOUND', message: 'The order was not found.', details: [],
    } })
    await expect(api.getOrder('INVALID')).rejects.toMatchObject({ status: 404, code: 'ORDER_NOT_FOUND' })
  })

  it('POST returns HTTP 201 with the authoritative total and only selected status changes', async () => {
    const original = structuredClone(order)
    const response = await post({ ...request(), total: { amountMinorUnits: 1, currency: 'USD' } })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ success: true, orderId: order.order_id, refundAmount: 18.4, currency: 'MYR', status: 'success' })
    expect(response.headers.get('X-Order-Version')).toBe('1')
    const updated = await api.getOrder(order.order_id)
    expect(updated.order.items[1].units[0].status).toBe('refunded')
    expect(updated.order.items[1].units[0].addons.map(({ status }) => status)).toEqual(['refunded', 'paid'])
    expect(updated.order.items[1].units[1]).toEqual(order.items[1].units[1])
    expect(updated.order.items[0]).toEqual(order.items[0])
    expect(updated.order.items[2]).toEqual(order.items[2])
    expect(updated.order.delivery_fee_status).toBe('refunded')
    expect(calculateOrderTotals(updated.order).total).toBe(89.3)
    expect(order).toEqual(original)
  })

  it('returns the requested success contract for the RM15.90 example', async () => {
    const response = await post(request({ selection: {
      selectedUnitIds: ['L1-2'], selectedAddOns: [{ unitId: 'L1-2', addonId: 'A1' }], includeDeliveryFee: false,
    } }))
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ success: true, orderId: order.order_id, refundAmount: 15.9, currency: 'MYR', status: 'success' })
  })

  it.each([
    ['refunded unit', ['L1-1'], []],
    ['refunded parent with paid add-ons', ['L2-2'], [{ unitId: 'L2-2', addonId: 'A2' }]],
    ['orphan add-on', [], [{ unitId: 'L2-1', addonId: 'A2' }]],
    ['unknown unit', ['unknown'], []],
    ['unknown add-on', ['L2-1'], [{ unitId: 'L2-1', addonId: 'unknown' }]],
    ['duplicate unit', ['L2-1', 'L2-1'], []],
    ['duplicate add-on', ['L2-1'], [{ unitId: 'L2-1', addonId: 'A2' }, { unitId: 'L2-1', addonId: 'A2' }]],
    ['empty selection', [], []],
  ] as const)('returns HTTP 422 for %s without changing the order', async (_label, selectedUnitIds, selectedAddOns) => {
    const response = await post(request({ selection: { selectedUnitIds, selectedAddOns, includeDeliveryFee: false } }))
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ success: false, orderId: order.order_id, status: 'error', error: { code: 'INVALID_REFUND_SELECTION', details: expect.any(Array) } })
    expect(await api.getOrder(order.order_id)).toEqual({ order, version: 0 })
  })

  it.each([{ reason: '' }, { channel: 'cash' }])('returns HTTP 422 for invalid review data %j', async (invalid) => {
    expect((await post({ ...request(), ...invalid })).status).toBe(422)
    expect((await api.getOrder(order.order_id)).version).toBe(0)
  })

  it('returns HTTP 400 for malformed JSON, invalid structure and path/body mismatch', async () => {
    const malformed = await fetch(`${endpoint}/refunds`, { method: 'POST', body: '{' })
    expect(malformed.status).toBe(400)
    expect(await malformed.json()).toEqual({ success: false, orderId: order.order_id, status: 'error', error: {
      code: 'INVALID_JSON', message: 'The refund request must contain valid JSON.', details: [],
    } })
    expect((await post(null)).status).toBe(400)
    expect((await post(request({ orderId: 'different' }))).status).toBe(400)
  })

  it('turns a one-shot HTTP 503 into a typed error and retries safely without partial changes', async () => {
    mockRuntime.controls.armFailure()
    await expect(api.postRefund(order.order_id, request())).rejects.toMatchObject({ status: 503, code: 'SIMULATED_FAILURE', message: expect.stringContaining('temporarily unavailable') })
    expect(await api.getOrder(order.order_id)).toEqual({ order, version: 0 })
    expect(mockRuntime.controls.getSnapshot().failNextRefund).toBe(false)
    expect(await api.postRefund(order.order_id, request())).toEqual({ version: 1, refund: {
      success: true, orderId: order.order_id, refundAmount: 18.4, currency: 'MYR', status: 'success',
    } })
  })

  it('returns a consistent HTTP 503 error body without changing the order', async () => {
    mockRuntime.controls.armFailure()
    const response = await post()
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ success: false, orderId: order.order_id, status: 'error', error: {
      code: 'SIMULATED_FAILURE', message: 'The refund service is temporarily unavailable. Please try again.', details: [],
    } })
    expect(response.headers.get('X-Order-Version')).toBeNull()
    expect(await api.getOrder(order.order_id)).toEqual({ order, version: 0 })
  })

  it('returns typed HTTP 422 errors with validation details to the fetch client', async () => {
    try {
      await api.postRefund(order.order_id, request({ selection: { selectedUnitIds: ['L1-1'], selectedAddOns: [], includeDeliveryFee: false } }))
      throw new Error('Expected validation to fail')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({ status: 422, details: expect.arrayContaining([expect.stringContaining('already been refunded')]) })
    }
  })

  it('rejects overlapping requests, replays an identical request safely and rejects another refund of that unit', async () => {
    mockRuntime.controls.reset({ latencyMs: 30 })
    const results = await Promise.all([post(), post()])
    expect(results.map(({ status }) => status).sort()).toEqual([201, 409])
    const conflict = results.find(({ status }) => status === 409)
    expect(await conflict?.json()).toEqual({ success: false, orderId: order.order_id, status: 'error', error: {
      code: 'REFUND_IN_PROGRESS', message: 'A refund for this order is already being processed.', details: [],
    } })
    expect((await api.getOrder(order.order_id)).version).toBe(1)
    expect((await post()).status).toBe(201)
    expect((await api.getOrder(order.order_id)).version).toBe(1)
    expect((await post(request({ requestId: 'different-request' }))).status).toBe(422)
  })

  it('forwards AbortSignal to fetch', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(api.getOrder(order.order_id, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect((await api.getOrder(order.order_id)).version).toBe(0)
  })

  it('rejects invalid successful HTTP payloads instead of rendering fabricated order data', async () => {
    server.use(http.get('*/api/orders/:orderId', () => HttpResponse.json({ order: {}, version: 0 })))
    await expect(api.getOrder(order.order_id)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
})
