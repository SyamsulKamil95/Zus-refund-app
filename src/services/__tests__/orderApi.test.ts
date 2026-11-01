import { afterEach, describe, expect, it, vi } from 'vitest'
import { order } from '../../data/order'
import { createOrderApi } from '../orderApi'

afterEach(() => vi.unstubAllGlobals())

describe('fetch response contract', () => {
  it('does not treat HTTP 202 as a completed refund even if it contains a receipt-shaped payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ order, version: 0, refund: {
      refundId: 'pending', requestId: 'pending', orderId: order.order_id, currency: order.currency, amountMinorUnits: 790,
    } }, { status: 202 })))
    await expect(createOrderApi().postRefund(order.order_id, {
      requestId: 'pending', orderId: order.order_id,
      selection: { selectedUnitIds: ['L3-1'], selectedAddOns: [], includeDeliveryFee: false },
      reason: 'Other', channel: 'in-app-credit',
    })).rejects.toMatchObject({ status: 202, code: 'UNEXPECTED_STATUS' })
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
