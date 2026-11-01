import { afterEach, describe, expect, it, vi } from 'vitest'
import { order } from '../../data/order'
import { calculateOrderTotals } from '../../features/order/utils/orderCalculator'
import { getRefundableUnits } from '../../features/refund/utils/refundCalculator'
import { createMockOrderService } from '../../mocks/mockOrderStore'
import type { RefundApiRequest } from '../orderApi.types'

function request(overrides: Partial<RefundApiRequest> = {}): RefundApiRequest {
  return {
    requestId: 'request-1', orderId: order.order_id, reason: 'Quality issue', channel: 'original-payment-method',
    selection: { selectedUnitIds: ['L1-2'], selectedAddOns: [{ unitId: 'L1-2', addonId: 'A1' }], includeDeliveryFee: false },
    ...overrides,
  }
}

const api = () => createMockOrderService(order, { latencyMs: 0 })
afterEach(() => vi.useRealTimers())

describe('mock order API', () => {
  it('GET returns independent copies of the current order', async () => {
    const service = api()
    const first = await service.getOrder(order.order_id)
    first.order.items[0].units[1].status = 'refunded'
    expect(await service.getOrder(order.order_id)).toEqual({ order, version: 0 })
    await expect(service.getOrder('unknown')).rejects.toMatchObject({ status: 404 })
  })

  it('recalculates the authoritative total and updates only selected statuses', async () => {
    const original = structuredClone(order)
    const service = api()
    const result = await service.postRefund(order.order_id, {
      ...request({ selection: { selectedUnitIds: ['L2-1'], selectedAddOns: [{ unitId: 'L2-1', addonId: 'A2' }], includeDeliveryFee: true } }),
      total: { amountMinorUnits: 999999, currency: 'MYR' },
    })
    expect(result.refund.amountMinorUnits).toBe(1840)
    expect(result.version).toBe(1)
    expect(result.order.items[1].units[0].status).toBe('refunded')
    expect(result.order.items[1].units[0].addons.map(({ status }) => status)).toEqual(['refunded', 'paid'])
    expect(result.order.items[1].units[1]).toEqual(order.items[1].units[1])
    expect(result.order.items[0]).toEqual(order.items[0])
    expect(result.order.items[2]).toEqual(order.items[2])
    expect(result.order.delivery_fee_status).toBe('refunded')
    expect(calculateOrderTotals(result.order)).toEqual(calculateOrderTotals(order))
    expect(order).toEqual(original)
    expect(await service.getOrder(order.order_id)).toEqual({ order: result.order, version: 1 })
  })

  it('leaves unselected add-ons and delivery paid when only their parent unit is refunded', async () => {
    const service = api()
    const result = await service.postRefund(order.order_id, request({
      selection: { selectedUnitIds: ['L1-2'], selectedAddOns: [], includeDeliveryFee: false },
    }))
    expect(result.refund.amountMinorUnits).toBe(1390)
    expect(result.order.items[0].units[1].status).toBe('refunded')
    expect(result.order.items[0].units[1].addons[0].status).toBe('paid')
    expect(result.order.delivery_fee_status).toBe('paid')
  })

  it('refunds the entire remaining RM59.00 without changing the inconsistent original add-on statuses', async () => {
    const service = api()
    const units = getRefundableUnits(order)
    const result = await service.postRefund(order.order_id, request({ selection: {
      selectedUnitIds: units.map(({ unitId }) => unitId),
      selectedAddOns: units.flatMap(({ unitId, addOns }) => addOns.map(({ addon_id }) => ({ unitId, addonId: addon_id }))),
      includeDeliveryFee: true,
    } }))
    expect(result.refund.amountMinorUnits).toBe(5900)
    expect(getRefundableUnits(result.order)).toEqual([])
    expect(result.order.delivery_fee_status).toBe('refunded')
    expect(result.order.items[1].units[1]).toEqual(order.items[1].units[1])
    expect(calculateOrderTotals(result.order).total).toBe(89.3)
    await expect(service.postRefund(order.order_id, request({ requestId: 'another-attempt' }))).rejects.toMatchObject({ status: 422 })
  })

  it.each([
    ['already refunded unit', ['L1-1'], []],
    ['refunded parent with paid add-ons', ['L2-2'], [{ unitId: 'L2-2', addonId: 'A2' }]],
    ['orphan add-on', [], [{ unitId: 'L1-2', addonId: 'A1' }]],
    ['duplicate unit', ['L1-2', 'L1-2'], []],
    ['unknown unit', ['unknown'], []],
    ['unknown add-on', ['L1-2'], [{ unitId: 'L1-2', addonId: 'unknown' }]],
    ['duplicate add-on', ['L1-2'], [{ unitId: 'L1-2', addonId: 'A1' }, { unitId: 'L1-2', addonId: 'A1' }]],
    ['empty selection', [], []],
  ] as const)('rejects %s without changing order state', async (_label, units, addOns) => {
    const service = api()
    await expect(service.postRefund(order.order_id, request({
      selection: { selectedUnitIds: units, selectedAddOns: addOns, includeDeliveryFee: false },
    }))).rejects.toMatchObject({ status: 422, code: 'INVALID_REFUND_SELECTION' })
    expect(await service.getOrder(order.order_id)).toEqual({ order, version: 0 })
  })

  it.each([{ reason: '' }, { reason: 'Unsupported' }, { channel: '' }, { channel: 'cash' }])('rejects invalid reason/channel %j', async (invalid) => {
    const service = api()
    await expect(service.postRefund(order.order_id, { ...request(), ...invalid })).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' })
    expect((await service.getOrder(order.order_id)).version).toBe(0)
  })

  it('rejects malformed input and an order ID that differs from the path', async () => {
    const service = api()
    await expect(service.postRefund(order.order_id, null)).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(service.postRefund(order.order_id, { ...request(), selection: { selectedUnitIds: [42] } })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(service.postRefund(order.order_id, request({ orderId: 'another' }))).rejects.toMatchObject({ code: 'ORDER_MISMATCH' })
  })

  it('supports deterministic failure and a safe retry with the same request ID', async () => {
    const service = api()
    await expect(service.postRefund(order.order_id, request(), { simulateFailure: true })).rejects.toMatchObject({ status: 503, code: 'SIMULATED_FAILURE' })
    expect(await service.getOrder(order.order_id)).toEqual({ order, version: 0 })
    expect((await service.postRefund(order.order_id, request())).refund.amountMinorUnits).toBe(1590)
  })

  it('rejects a second refund of the same unit or delivery fee', async () => {
    const service = api()
    const selection = { ...request().selection, includeDeliveryFee: true }
    await service.postRefund(order.order_id, request({ selection }))
    await expect(service.postRefund(order.order_id, request({ requestId: 'request-2' }))).rejects.toMatchObject({ status: 422 })
    await expect(service.postRefund(order.order_id, request({
      requestId: 'request-3', selection: { selectedUnitIds: [], selectedAddOns: [], includeDeliveryFee: true },
    }))).rejects.toMatchObject({ status: 422 })
  })

  it('replays the same receipt without another commit and returns the latest order snapshot', async () => {
    const service = api()
    const first = await service.postRefund(order.order_id, request())
    const second = await service.postRefund(order.order_id, request({
      requestId: 'request-2', selection: { selectedUnitIds: ['L3-1'], selectedAddOns: [], includeDeliveryFee: false },
    }))
    const replay = await service.postRefund(order.order_id, request())
    expect(replay.refund).toEqual(first.refund)
    expect(replay.version).toBe(2)
    expect(replay.order).toEqual(second.order)
    await expect(service.postRefund(order.order_id, request({ reason: 'Other' }))).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
  })

  it('simulates network latency and rejects concurrent submissions', async () => {
    vi.useFakeTimers()
    const service = createMockOrderService(order)
    const first = service.postRefund(order.order_id, request())
    const settled = vi.fn()
    void first.then(settled)
    await expect(service.postRefund(order.order_id, request())).rejects.toMatchObject({ code: 'REFUND_IN_PROGRESS' })
    await vi.advanceTimersByTimeAsync(999)
    expect(settled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect((await first).version).toBe(1)
  })

  it('aborts before commit and releases the in-flight lock', async () => {
    vi.useFakeTimers()
    const service = createMockOrderService(order)
    const controller = new AbortController()
    const pending = service.postRefund(order.order_id, request(), { signal: controller.signal })
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await rejection
    const get = service.getOrder(order.order_id)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await get).toEqual({ order, version: 0 })
    const retry = service.postRefund(order.order_id, request())
    await vi.advanceTimersByTimeAsync(1000)
    expect((await retry).version).toBe(1)
  })

  it('does not commit if cancelled after the delay resolves but before the request resumes', async () => {
    vi.useFakeTimers()
    const service = createMockOrderService(order)
    const controller = new AbortController()
    const pending = service.postRefund(order.order_id, request(), { signal: controller.signal })
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    vi.advanceTimersByTime(1000)
    controller.abort()
    await rejected
    const current = service.getOrder(order.order_id)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await current).toEqual({ order, version: 0 })
  })
})
