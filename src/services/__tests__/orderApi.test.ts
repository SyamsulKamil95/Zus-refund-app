import { afterEach, describe, expect, it, vi } from 'vitest'
import { order } from '../../data/order'
import { createOrderApi } from '../orderApi'
import type { RefundApiRequest, RefundApiResponse } from '../orderApi.types'

const refundRequest: RefundApiRequest = {
  requestId: 'request', orderId: order.order_id,
  selection: { selectedUnitIds: ['L1-2'], selectedAddOns: [{ unitId: 'L1-2', addonId: 'A1' }], includeDeliveryFee: false },
  reason: 'Other', channel: 'in-app-credit',
}
const refundResponse: RefundApiResponse = { success: true, orderId: order.order_id, refundAmount: 15.9, currency: 'MYR', status: 'success' }

afterEach(() => vi.unstubAllGlobals())

describe('fetch response contract', () => {
  it('does not treat HTTP 202 as a completed refund even if it contains a receipt-shaped payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(refundResponse, { status: 202, headers: { 'X-Order-Version': '1' } })))
    await expect(createOrderApi().postRefund(order.order_id, refundRequest)).rejects.toMatchObject({ status: 202, code: 'UNEXPECTED_STATUS' })
  })

  it('keeps the public refund body separate from order version response metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(refundResponse, { status: 201, headers: { 'X-Order-Version': '3' } })))
    await expect(createOrderApi().postRefund(order.order_id, refundRequest)).resolves.toEqual({ refund: refundResponse, version: 3 })
  })

  it.each([
    { success: false }, { status: 'error' }, { orderId: 'different-order' }, { currency: 'USD' },
    { refundAmount: -1 }, { refundAmount: '15.90' }, { refundAmount: 15.901 }, { refundAmount: null },
  ])('rejects HTTP 201 with invalid refund fields %j', async (invalid) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...refundResponse, ...invalid }, { status: 201, headers: { 'X-Order-Version': '1' } })))
    await expect(createOrderApi().postRefund(order.order_id, refundRequest)).rejects.toMatchObject({ status: 502, code: 'INVALID_RESPONSE' })
  })

  it.each([null, '0', '-1', '1.5', 'invalid', '9007199254740992'])('rejects missing or invalid order version metadata %s', async (version) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(refundResponse, {
      status: 201, headers: version === null ? {} : { 'X-Order-Version': version },
    })))
    await expect(createOrderApi().postRefund(order.order_id, refundRequest)).rejects.toMatchObject({ status: 502, code: 'INVALID_RESPONSE' })
  })

  it('preserves cancellation when aborted after headers arrive while JSON is still streaming', async () => {
    let bodyController!: ReadableStreamDefaultController<Uint8Array>
    const body = new ReadableStream<Uint8Array>({ start(controller) { bodyController = controller } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })))
    const controller = new AbortController()
    const pending = createOrderApi().getOrder(order.order_id, { signal: controller.signal })
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    await Promise.resolve()
    controller.abort()
    bodyController.error(controller.signal.reason)
    await rejected
  })
})
