import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw/http'
import { server } from '../../../mocks/node'
import { order } from '../../../data/order'
import { createOrderApi } from '../../../services/orderApi'
import { mockRuntime } from '../../../mocks/runtime'
import type { OrderApi, RefundApiResponse } from '../../../services/orderApi.types'
import OrderPage from '../../order/pages/OrderPage'
import { prepareRefundConfirmation } from '../utils/refundReview'
import { RefundConfirmationDialog } from '../components/RefundConfirmationDialog'

async function openConfirmation(user: ReturnType<typeof userEvent.setup>, includeDelivery = true) {
  await user.click(await screen.findByRole('button', { name: 'Refund' }))
  const review = screen.getByRole('dialog', { name: 'Initiate Refund' })
  await user.click(within(review).getByRole('checkbox', { name: 'Select L2-1 (Hazelnut Americano with Oat Milk and Brown Sugar Syrup) for refund' }))
  await user.click(within(review).getByRole('checkbox', { name: 'Select Oat Milk for unit L2-1' }))
  if (includeDelivery) await user.click(within(review).getByRole('checkbox', { name: /Delivery fee/ }))
  await user.click(within(review).getByRole('button', { name: 'Next' }))
  await user.selectOptions(within(review).getByRole('combobox'), 'Quality issue')
  await user.click(within(review).getByRole('radio', { name: 'In-app credit' }))
  await user.click(within(review).getByRole('button', { name: 'Confirm Refund' }))
  return screen.getByRole('dialog', { name: 'Confirm Refund?' })
}

function unitRow(unitId: string) {
  const row = screen.getByText(unitId, { exact: true }).closest('li')
  if (!row) throw new Error(`Missing unit row ${unitId}`)
  return row
}

describe('refund confirmation and submission workflow', () => {
  it('keeps a real fetch pending without success, duplicate POSTs or dismissal until HTTP 201 arrives', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const post = vi.fn(async ({ request, params }: { request: Request; params: { orderId?: string | readonly string[] } }) => {
      const body: unknown = await request.json()
      await gate
      return HttpResponse.json(await mockRuntime.service.postRefund(String(params.orderId), body, { latencyMs: 0 }), { status: 201 })
    })
    server.use(http.post('*/api/orders/:orderId/refunds', post))
    const user = userEvent.setup()
    const api = createOrderApi()
    render(<OrderPage api={api} />)
    const confirmation = await openConfirmation(user)
    await user.dblClick(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(within(confirmation).getByRole('button', { name: 'Submitting refund…' })).toBeDisabled()
    expect(confirmation).toHaveFocus()
    expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.queryByText(/completed successfully/)).not.toBeInTheDocument()
    expect(await api.getOrder(order.order_id)).toEqual({ order, version: 0 })
    await user.keyboard('{Escape}')
    expect(confirmation).toBeInTheDocument()
    await act(async () => release())
    await screen.findByRole('button', { name: 'Refund' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/RM\s*18\.40/)
    expect(post).toHaveBeenCalledTimes(1)
    expect((await api.getOrder(order.order_id)).version).toBe(1)
  })

  it('preserves the draft after an MSW network failure and retries successfully', async () => {
    server.use(http.post('*/api/orders/:orderId/refunds', () => HttpResponse.error()))
    const user = userEvent.setup()
    const api = createOrderApi()
    render(<OrderPage api={api} />)
    const confirmation = await openConfirmation(user)
    await user.click(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    expect(await within(confirmation).findByRole('alert')).toHaveTextContent('Unable to submit the refund. Please retry.')
    expect(within(confirmation).getByText('Quality issue')).toBeInTheDocument()
    expect(within(confirmation).getByText('In-app credit')).toBeInTheDocument()
    expect(within(confirmation).getByText(/RM\s*18\.40/)).toBeInTheDocument()
    expect(await api.getOrder(order.order_id)).toEqual({ order, version: 0 })
    expect(screen.queryByText(/completed successfully/)).not.toBeInTheDocument()
    server.resetHandlers()
    await user.click(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    await screen.findByRole('button', { name: 'Refund' })
    expect(screen.getByRole('status')).toHaveTextContent(/RM\s*18\.40/)
    expect((await api.getOrder(order.order_id)).version).toBe(1)
  })

  it('shows HTTP 422 feedback and retains the review draft without changing the order', async () => {
    server.use(http.post('*/api/orders/:orderId/refunds', () => HttpResponse.json({ error: {
      code: 'INVALID_REFUND_SELECTION', message: 'The selected items are no longer eligible for refund.', details: [],
    } }, { status: 422 })))
    const user = userEvent.setup()
    const api = createOrderApi()
    render(<OrderPage api={api} />)
    const confirmation = await openConfirmation(user)
    await user.click(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    expect(await within(confirmation).findByRole('alert')).toHaveTextContent('no longer eligible')
    expect(within(confirmation).getByRole('button', { name: 'Confirm Refund' })).toBeEnabled()
    expect(await api.getOrder(order.order_id)).toEqual({ order, version: 0 })
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    const review = screen.getByRole('dialog', { name: 'Initiate Refund' })
    expect(within(review).getByRole('combobox')).toHaveValue('Quality issue')
    expect(within(review).getByRole('radio', { name: 'In-app credit' })).toBeChecked()
    expect(within(review).getByRole('region', { name: 'Selected items' })).toHaveTextContent('Oat Milk')
  })
  it.each(['Cancel', 'Escape'])('opens confirmation without submitting and %s returns to the unchanged review', async (cancelMethod) => {
    const user = userEvent.setup()
    const api = createOrderApi()
    const post = vi.spyOn(api, 'postRefund')
    render(<OrderPage api={api} />)
    const confirmation = await openConfirmation(user)
    expect(within(confirmation).getByText(order.order_id)).toBeInTheDocument()
    expect(within(confirmation).getByText(/RM\s*18\.40/)).toBeInTheDocument()
    expect(within(confirmation).getByText('Quality issue')).toBeInTheDocument()
    expect(within(confirmation).getByText('In-app credit')).toBeInTheDocument()
    expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(within(confirmation).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    if (cancelMethod === 'Escape') await user.keyboard('{Escape}')
    else await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Confirm Refund?' })).not.toBeInTheDocument()
    const review = screen.getByRole('dialog', { name: 'Initiate Refund' })
    expect(within(review).getByRole('heading', { name: 'Review refund' })).toBeInTheDocument()
    expect(within(review).getByRole('combobox')).toHaveValue('Quality issue')
    expect(within(review).getByRole('radio', { name: 'In-app credit' })).toBeChecked()
    expect(within(review).getByRole('region', { name: 'Selected items' })).toHaveTextContent('Oat Milk')
    expect(within(review).getByRole('button', { name: 'Confirm Refund' })).toHaveFocus()
  })

  it('submits the correct request, closes both dialogs and renders only the selected status changes', async () => {
    const user = userEvent.setup()
    const api = createOrderApi()
    const post = vi.spyOn(api, 'postRefund')
    const get = vi.spyOn(api, 'getOrder')
    render(<OrderPage api={api} />)
    const confirmation = await openConfirmation(user)
    await user.click(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await screen.findByRole('button', { name: 'Refund' })

    expect(get).toHaveBeenCalledTimes(2)
    expect(post).toHaveBeenCalledExactlyOnceWith(order.order_id, {
      requestId: expect.any(String), orderId: order.order_id,
      selection: { selectedUnitIds: ['L2-1'], selectedAddOns: [{ unitId: 'L2-1', addonId: 'A2' }], includeDeliveryFee: true },
      reason: 'Quality issue', channel: 'in-app-credit',
    }, { signal: expect.any(AbortSignal) })
    expect(unitRow('L2-1')).toHaveClass('unit-refunded')
    const addOns = within(unitRow('L2-1')).getByRole('list').querySelectorAll('li')
    expect(addOns[0]).toHaveTextContent('Oat Milk')
    expect(addOns[0]).toHaveTextContent('Refunded')
    expect(addOns[1]).toHaveTextContent('Brown Sugar Syrup')
    expect(addOns[1]).toHaveTextContent('Paid')
    expect(unitRow('L1-2')).toHaveClass('unit-paid')
    expect(within(unitRow('L2-2')).getAllByText('Paid')).toHaveLength(2)
    const summary = screen.getByRole('complementary', { name: 'Order summary' })
    expect(within(summary).getByText('Refunded')).toBeInTheDocument()
    expect(summary).toHaveTextContent(/RM\s*89\.30/)
    expect(screen.getByRole('status')).toHaveTextContent(/Refund of RM\s*18\.40 completed successfully/)
    expect(order.items[1].units[0].status).toBe('paid')
  })

  it('leaves delivery paid when it was not selected', async () => {
    const user = userEvent.setup()
    render(<OrderPage api={createOrderApi()} />)
    const confirmation = await openConfirmation(user, false)
    await user.click(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await screen.findByRole('button', { name: 'Refund' })
    const summary = screen.getByRole('complementary', { name: 'Order summary' })
    expect(within(summary).getByText('Paid')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/RM\s*13\.40/)
  })

  it('preserves the draft and order on failure, then allows retry', async () => {
    const user = userEvent.setup()
    const api = createOrderApi()
    mockRuntime.controls.armFailure()
    render(<OrderPage api={api} />)
    let confirmation = await openConfirmation(user)
    await user.click(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    expect(await within(confirmation).findByRole('alert')).toHaveTextContent('temporarily unavailable')
    expect(within(confirmation).getByRole('button', { name: 'Confirm Refund' })).toBeEnabled()
    expect(within(confirmation).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(await api.getOrder(order.order_id)).toEqual({ order, version: 0 })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    const review = screen.getByRole('dialog', { name: 'Initiate Refund' })
    expect(within(review).getByRole('combobox')).toHaveValue('Quality issue')
    expect(within(review).getByRole('radio', { name: 'In-app credit' })).toBeChecked()
    expect(within(review).getByRole('region', { name: 'Selected items' })).toHaveTextContent('Oat Milk')
    await user.click(within(review).getByRole('button', { name: 'Back' }))
    expect(within(review).getByRole('checkbox', { name: 'Select L2-1 (Hazelnut Americano with Oat Milk and Brown Sugar Syrup) for refund' })).toBeChecked()
    expect(within(review).getByRole('checkbox', { name: 'Select Oat Milk for unit L2-1' })).toBeChecked()
    expect(within(review).getByRole('checkbox', { name: 'Select Brown Sugar Syrup for unit L2-1' })).not.toBeChecked()
    expect(within(review).getByRole('checkbox', { name: /Delivery fee/ })).toBeChecked()
    await user.click(within(review).getByRole('button', { name: 'Next' }))
    expect(within(review).getByRole('combobox')).toHaveValue('Quality issue')
    expect(within(review).getByRole('radio', { name: 'In-app credit' })).toBeChecked()
    await user.click(within(review).getByRole('button', { name: 'Confirm Refund' }))
    confirmation = screen.getByRole('dialog', { name: 'Confirm Refund?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await screen.findByRole('button', { name: 'Refund' })
    expect(screen.getByRole('status')).toHaveTextContent(/RM\s*18\.40/)
    const updated = await api.getOrder(order.order_id)
    expect(updated.version).toBe(1)
    expect(updated.order.items[1].units[0].status).toBe('refunded')
    expect(updated.order.items[1].units[0].addons.map(({ status }) => status)).toEqual(['refunded', 'paid'])
    expect(updated.order.delivery_fee_status).toBe('refunded')
  })

  it('blocks double-click submission and dismissal while a request is pending', async () => {
    const user = userEvent.setup()
    const service = createOrderApi()
    let resolveRequest!: (response: RefundApiResponse) => void
    const post = vi.fn<OrderApi['postRefund']>(() => new Promise((resolve) => { resolveRequest = resolve }))
    render(<OrderPage api={{ ...service, postRefund: post }} />)
    const confirmation = await openConfirmation(user)
    await user.dblClick(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    expect(post).toHaveBeenCalledTimes(1)
    expect(within(confirmation).getByRole('button', { name: 'Submitting refund…' })).toBeDisabled()
    expect(within(confirmation).getByRole('status')).toHaveTextContent('Submitting refund. Please wait.')
    expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(confirmation).toBeInTheDocument()
    const [orderId, request, options] = post.mock.calls[0]
    await act(async () => resolveRequest(await service.postRefund(orderId, request, options)))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await screen.findByRole('button', { name: 'Refund' })
    expect(screen.getByRole('status')).toHaveTextContent(/RM\s*18\.40/)
  })

  it('rejects a stale refresh after a successful refund and retries GET without another POST', async () => {
    const user = userEvent.setup()
    const service = createOrderApi()
    const getOrder = vi.fn<OrderApi['getOrder']>().mockImplementationOnce(service.getOrder)
      .mockResolvedValueOnce({ order: structuredClone(order), version: 0 }).mockImplementation(service.getOrder)
    const postRefund = vi.fn(service.postRefund)
    render(<OrderPage api={{ ...service, getOrder, postRefund }} />)
    const confirmation = await openConfirmation(user)
    await user.click(within(confirmation).getByRole('button', { name: 'Confirm Refund' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByRole('alert')).toHaveTextContent('out of date')
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByRole('button', { name: 'Refund' })
    expect(postRefund).toHaveBeenCalledTimes(1)
    expect(unitRow('L2-1')).toHaveClass('unit-refunded')
    expect(screen.getByRole('status')).toHaveTextContent(/RM\s*18\.40/)
  })

  it('starts a fresh draft with updated eligibility and allows a second refund in the same session', async () => {
    const user = userEvent.setup()
    const api = createOrderApi()
    render(<OrderPage api={api} />)
    const first = await openConfirmation(user)
    await user.click(within(first).getByRole('button', { name: 'Confirm Refund' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await screen.findByRole('button', { name: 'Refund' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refund' })).toHaveFocus())
    await user.click(await screen.findByRole('button', { name: 'Refund' }))
    const selection = screen.getByRole('dialog', { name: 'Initiate Refund' })
    expect(within(selection).getByRole('checkbox', { name: 'Select L2-1 (Hazelnut Americano with Oat Milk and Brown Sugar Syrup) for refund' })).toBeDisabled()
    expect(within(selection).getByRole('checkbox', { name: 'Select Brown Sugar Syrup for unit L2-1' })).toBeDisabled()
    expect(within(selection).getByRole('checkbox', { name: /Delivery fee/ })).toBeDisabled()
    expect(within(selection).getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.click(within(selection).getByRole('checkbox', { name: 'Select L3-1 (Butter Croissant) for refund' }))
    await user.click(within(selection).getByRole('button', { name: 'Next' }))
    expect(within(selection).getByRole('combobox')).toHaveValue('')
    expect(within(selection).getByRole('radio', { name: 'Original payment method' })).not.toBeChecked()
    await user.selectOptions(within(selection).getByRole('combobox'), 'Missing item')
    await user.click(within(selection).getByRole('radio', { name: 'Original payment method' }))
    await user.click(within(selection).getByRole('button', { name: 'Confirm Refund' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Confirm Refund?' })).getByRole('button', { name: 'Confirm Refund' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await screen.findByRole('button', { name: 'Refund' })
    expect(screen.getByRole('status')).toHaveTextContent(/RM\s*7\.90/)
    expect(screen.getByRole('complementary', { name: 'Order summary' })).toHaveTextContent(/RM\s*89\.30/)
    const updated = await api.getOrder(order.order_id)
    expect(updated.version).toBe(2)
    expect(updated.order.items[1].units[0].addons.map(({ status }) => status)).toEqual(['refunded', 'paid'])
    expect(updated.order.items[2].units[0].status).toBe('refunded')
  })

  it('ignores a submission response after unmount even if the transport ignores abort', async () => {
    const user = userEvent.setup()
    const service = createOrderApi()
    const preview = prepareRefundConfirmation(order, {
      selection: { selectedUnitIds: ['L3-1'], selectedAddOns: [], includeDeliveryFee: false }, reason: 'Other', channel: 'in-app-credit',
    })
    if (!preview.isValid) throw new Error('Invalid test draft')
    let resolveRequest!: (response: RefundApiResponse) => void
    const post = vi.fn<OrderApi['postRefund']>(() => new Promise((resolve) => { resolveRequest = resolve }))
    const onSuccess = vi.fn()
    const { unmount } = render(<RefundConfirmationDialog request={preview.request} api={{ ...service, postRefund: post }} onCancel={vi.fn()} onSuccess={onSuccess} returnFocusRef={{ current: null }} />)
    await user.click(screen.getByRole('button', { name: 'Confirm Refund' }))
    const signal = post.mock.calls[0][2]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => resolveRequest({ order: structuredClone(order), version: 1, refund: {
      refundId: 'test', requestId: 'test', orderId: order.order_id, currency: 'MYR', amountMinorUnits: 790,
    } }))
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
