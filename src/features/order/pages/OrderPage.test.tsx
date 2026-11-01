import { act, render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { order } from '../../../data/order'
import { server } from '../../../mocks/node'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../../../app/App'
import OrderPage from './OrderPage'

describe('OrderPage', () => {
  it('waits for GET before displaying order information or enabling a refund', async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    server.use(http.get('*/api/orders/:orderId', async () => {
      await pending
      return HttpResponse.json({ order, version: 0 })
    }))
    render(<App />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Operations Back Office')
    expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Order details' })).toBeInTheDocument()
    expect(screen.getByText('Loading order details…')).toBeInTheDocument()
    expect(screen.queryByText('Iced Spanish Latte')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument()
    await act(async () => release())
    expect(await screen.findByRole('button', { name: 'Refund' })).toBeEnabled()
    const orderDate = screen.getByText(/30 Oct 2026.*1:00.*pm.*MYT/i)
    expect(orderDate).toHaveAttribute('datetime', order.order_date)
  })

  it('shows a GET error and retries loading without displaying source data as a fallback', async () => {
    let shouldFail = true
    server.use(http.get('*/api/orders/:orderId', () => {
      if (shouldFail) return HttpResponse.json({ success: false, orderId: order.order_id, status: 'error', error: { code: 'UNAVAILABLE', message: 'Order service unavailable.', details: [] } }, { status: 503 })
      return HttpResponse.json({ order, version: 0 })
    }))
    const user = userEvent.setup()
    render(<OrderPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Order service unavailable.')
    expect(screen.queryByText('Iced Spanish Latte')).not.toBeInTheDocument()
    shouldFail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('button', { name: 'Refund' })).toBeEnabled()
  })

  it('shows add-on statuses independently from their unit statuses', async () => {
    render(<OrderPage />)

    const refundedUnit = (await screen.findByText('L2-2')).closest('li')
    expect(refundedUnit).toHaveClass('unit-refunded')
    expect(within(refundedUnit as HTMLElement).getByText('Refunded')).toBeInTheDocument()
    expect(within(refundedUnit as HTMLElement).getAllByText('Paid')).toHaveLength(2)
    expect(within(refundedUnit as HTMLElement).getByText('Oat Milk')).toBeInTheDocument()
    expect(within(refundedUnit as HTMLElement).getByText('Brown Sugar Syrup')).toBeInTheDocument()
  })

  it('opens the refund selection dialog from the Refund button', async () => {
    const user = userEvent.setup()
    render(<OrderPage />)

    await user.click(await screen.findByRole('button', { name: 'Refund' }))

    expect(screen.getByRole('dialog', { name: 'Initiate Refund' })).toBeInTheDocument()
  })
})
