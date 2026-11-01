import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import OrderPage from './OrderPage'

describe('OrderPage', () => {
  it('shows add-on statuses independently from their unit statuses', () => {
    render(<OrderPage />)

    const refundedUnit = screen.getByText('L2-2').closest('li')
    expect(refundedUnit).toHaveClass('unit-refunded')
    expect(within(refundedUnit as HTMLElement).getByText('Refunded')).toBeInTheDocument()
    expect(within(refundedUnit as HTMLElement).getAllByText('Paid')).toHaveLength(2)
    expect(within(refundedUnit as HTMLElement).getByText('Oat Milk')).toBeInTheDocument()
    expect(within(refundedUnit as HTMLElement).getByText('Brown Sugar Syrup')).toBeInTheDocument()
  })

  it('shows the next-phase notice without starting a refund flow', async () => {
    const user = userEvent.setup()
    render(<OrderPage />)

    await user.click(screen.getByRole('button', { name: 'Refund' }))

    expect(screen.getByRole('status')).toHaveTextContent('Refund workflow will be implemented in the next phase.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
