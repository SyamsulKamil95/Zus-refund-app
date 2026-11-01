import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { order } from '../../../data/order'
import { createOrderApi } from '../../../services/orderApi'
import type { OrderJson } from '../../order/types/order.types'
import { getRefundableUnits } from '../utils/refundCalculator'
import { RefundModal } from './RefundModal'

function renderOpenRefundModal() {
  const onRequestConfirmation = vi.fn()
  function RefundModalHarness() {
    const [open, setOpen] = useState(true)
    return <>
      <button onClick={() => setOpen(true)}>Open refund</button>
      <RefundModal api={createOrderApi()} order={order} open={open} onOpenChange={setOpen} onRequestConfirmation={onRequestConfirmation} />
    </>
  }
  return { ...render(<RefundModalHarness />), onRequestConfirmation }
}

const money = (amount: string) => new RegExp(`RM\\s*${amount.replace('.', '\\.')}`)

function expectRefundTotal(dialog: HTMLElement, amount: string) {
  const summary = within(dialog).getByRole('region', { name: 'Refund total' })
  expect(within(summary).getByText(money(amount))).toBeInTheDocument()
}

describe('RefundModal', () => {
  it('keeps add-ons unchecked until explicitly selected and recalculates the amount', async () => {
    const user = userEvent.setup()
    renderOpenRefundModal()

    const dialog = screen.getByRole('dialog', { name: 'Initiate Refund' })
    const unitCheckbox = within(dialog).getByRole('checkbox', {
      name: 'Select L1-2 (Iced Spanish Latte) for refund',
    })
    const addOnCheckbox = within(dialog).getByRole('checkbox', {
      name: 'Select Extra Shot for unit L1-2',
    })

    expect(addOnCheckbox).toBeDisabled()
    expect(addOnCheckbox).not.toBeChecked()
    expectRefundTotal(dialog, '0.00')

    await user.click(unitCheckbox)
    expect(addOnCheckbox).toBeEnabled()
    expect(addOnCheckbox).not.toBeChecked()
    expectRefundTotal(dialog, '13.90')

    await user.click(addOnCheckbox)
    expectRefundTotal(dialog, '15.90')
  })

  it('disables refunded units and add-ons whose parent unit was refunded', () => {
    renderOpenRefundModal()
    const dialog = screen.getByRole('dialog', { name: 'Initiate Refund' })

    expect(within(dialog).getByRole('checkbox', {
      name: 'Select L1-1 (Iced Spanish Latte) for refund',
    })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', {
      name: 'Select Extra Shot for unit L1-1',
    })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', {
      name: 'Select L2-2 (Hazelnut Americano with Oat Milk and Brown Sugar Syrup) for refund',
    })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', {
      name: 'Select Oat Milk for unit L2-2',
    })).toBeDisabled()
  })

  it('allows delivery to be selected independently and prevents Next with no selection', async () => {
    const user = userEvent.setup()
    renderOpenRefundModal()
    const dialog = screen.getByRole('dialog', { name: 'Initiate Refund' })
    const nextButton = within(dialog).getByRole('button', { name: 'Next' })

    expect(nextButton).toBeDisabled()
    await user.click(within(dialog).getByRole('checkbox', { name: /Delivery fee/ }))
    expectRefundTotal(dialog, '5.00')
    expect(nextButton).toBeEnabled()

    await user.click(nextButton)
    expect(within(dialog).getByRole('heading', { name: 'Review refund' })).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Selected items' })).toHaveTextContent('Delivery fee')
    expectRefundTotal(dialog, '5.00')
    expect(dialog).toBeInTheDocument()
  })

  it('calculates the full remaining refundable amount from all eligible selections', async () => {
    const user = userEvent.setup()
    renderOpenRefundModal()
    const dialog = screen.getByRole('dialog', { name: 'Initiate Refund' })

    for (const unit of getRefundableUnits(order)) {
      await user.click(within(dialog).getByRole('checkbox', {
        name: `Select ${unit.unitId} (${unit.itemName}) for refund`,
      }))
      for (const addOn of unit.addOns) {
        await user.click(within(dialog).getByRole('checkbox', {
          name: `Select ${addOn.name} for unit ${unit.unitId}`,
        }))
      }
    }
    await user.click(within(dialog).getByRole('checkbox', { name: /Delivery fee/ }))

    expectRefundTotal(dialog, '59.00')
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    expectRefundTotal(dialog, '59.00')
  })

  it('closes from Cancel without starting another workflow step', async () => {
    const user = userEvent.setup()
    renderOpenRefundModal()
    const dialog = screen.getByRole('dialog', { name: 'Initiate Refund' })

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reviews only selected units and add-ons with the same total and optional delivery fee', async () => {
    const user = userEvent.setup()
    renderOpenRefundModal()
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select L1-2 (Iced Spanish Latte) for refund' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select Extra Shot for unit L1-2' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select L2-1 (Hazelnut Americano with Oat Milk and Brown Sugar Syrup) for refund' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select Oat Milk for unit L2-1' }))
    await user.click(within(dialog).getByRole('checkbox', { name: /Delivery fee/ }))
    expectRefundTotal(dialog, '34.30')

    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    const review = within(dialog).getByRole('region', { name: 'Selected items' })
    expect(within(dialog).getByRole('heading', { name: 'Review refund' })).toHaveFocus()
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(review).getByText('Iced Spanish Latte')).toBeInTheDocument()
    expect(within(review).getByText('Unit L1-2 · base price')).toBeInTheDocument()
    expect(within(review).getByText(money('13.90'))).toBeInTheDocument()
    expect(within(review).getByRole('list', { name: 'Selected add-ons for L1-2' })).toHaveTextContent('Extra Shot')
    expect(within(review).getByText(money('2.00'))).toBeInTheDocument()
    expect(within(review).getByRole('list', { name: 'Selected add-ons for L2-1' })).toHaveTextContent('Oat Milk')
    expect(within(review).getByText(money('1.50'))).toBeInTheDocument()
    expect(within(review).queryByText('Brown Sugar Syrup', { exact: true })).not.toBeInTheDocument()
    expect(within(review).queryByText('Butter Croissant')).not.toBeInTheDocument()
    expect(within(review).queryByText(/Unit L2-2/)).not.toBeInTheDocument()
    expect(within(review).getByText('Delivery fee')).toBeInTheDocument()
    expectRefundTotal(dialog, '34.30')
  })

  it('retains units, add-ons, delivery, reason and channel across Back and Next', async () => {
    const user = userEvent.setup()
    renderOpenRefundModal()
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select L1-2 (Iced Spanish Latte) for refund' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select Extra Shot for unit L1-2' }))
    await user.click(within(dialog).getByRole('checkbox', { name: /Delivery fee/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /Refund reason/ }), 'Quality issue')
    await user.click(within(dialog).getByRole('radio', { name: 'In-app credit' }))
    await user.click(within(dialog).getByRole('button', { name: 'Back' }))

    expect(within(dialog).getByRole('heading', { name: 'Items eligible for refund' })).toHaveFocus()
    expect(within(dialog).getByRole('checkbox', { name: 'Select L1-2 (Iced Spanish Latte) for refund' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Select Extra Shot for unit L1-2' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: /Delivery fee/ })).toBeChecked()
    expectRefundTotal(dialog, '20.90')
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    expect(within(dialog).getByRole('combobox', { name: /Refund reason/ })).toHaveValue('Quality issue')
    expect(within(dialog).getByRole('radio', { name: 'In-app credit' })).toBeChecked()
    expect(within(dialog).getByRole('radio', { name: 'Original payment method' })).not.toBeChecked()
  })

  it('requires a reason and focuses its error without calling the confirmation callback', async () => {
    const user = userEvent.setup()
    const { onRequestConfirmation } = renderOpenRefundModal()
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Delivery fee/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(dialog).getByRole('radio', { name: 'Original payment method' }))
    await user.click(within(dialog).getByRole('button', { name: 'Confirm Refund' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Select a refund reason.')
    expect(within(dialog).getByRole('combobox', { name: /Refund reason/ })).toHaveFocus()
    expect(onRequestConfirmation).not.toHaveBeenCalled()
  })

  it('requires an explicit channel and has exactly the five supported reasons', async () => {
    const user = userEvent.setup()
    const { onRequestConfirmation } = renderOpenRefundModal()
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Delivery fee/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    const reasonSelect = within(dialog).getByRole('combobox', { name: /Refund reason/ })
    expect(within(reasonSelect).getAllByRole('option').filter((option) => !(option as HTMLOptionElement).disabled).map((option) => option.textContent))
      .toEqual(['Wrong item', 'Missing item', 'Quality issue', 'Late delivery', 'Other'])
    expect(within(dialog).getAllByRole('radio')).toHaveLength(2)
    expect(within(dialog).getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true)
    await user.selectOptions(reasonSelect, 'Missing item')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm Refund' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose a refund channel.')
    expect(within(dialog).getByRole('radio', { name: 'Original payment method' })).toHaveFocus()
    expect(onRequestConfirmation).not.toHaveBeenCalled()
  })

  it('passes a validated snapshot to the Phase 6 callback without closing or showing a success message', async () => {
    const user = userEvent.setup()
    const { onRequestConfirmation } = renderOpenRefundModal()
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select L1-2 (Iced Spanish Latte) for refund' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select Extra Shot for unit L1-2' }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    expect(within(dialog).getByRole('region', { name: 'Selected items' })).not.toHaveTextContent('Delivery fee')
    await user.selectOptions(within(dialog).getByRole('combobox'), 'Other')
    await user.click(within(dialog).getByRole('radio', { name: 'In-app credit' }))
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Confirm Refund' }))

    expect(onRequestConfirmation).toHaveBeenCalledExactlyOnceWith({
      orderId: order.order_id,
      selection: { selectedUnitIds: ['L1-2'], selectedAddOns: [{ unitId: 'L1-2', addonId: 'A1' }], includeDeliveryFee: false },
      reason: 'Other',
      channel: 'in-app-credit',
      total: { currency: 'MYR', amountMinorUnits: 1590 },
    })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument()
  })

  it.each(['selection', 'review'] as const)('revalidates changed order eligibility during %s', async (step) => {
    const user = userEvent.setup()
    const onRequestConfirmation = vi.fn()
    const { rerender } = render(<RefundModal api={createOrderApi()} order={order} open onOpenChange={vi.fn()} onRequestConfirmation={onRequestConfirmation} />)
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select L1-2 (Iced Spanish Latte) for refund' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Select Extra Shot for unit L1-2' }))
    if (step === 'review') {
      await user.click(within(dialog).getByRole('button', { name: 'Next' }))
      await user.selectOptions(within(dialog).getByRole('combobox'), 'Wrong item')
      await user.click(within(dialog).getByRole('radio', { name: 'Original payment method' }))
    }
    const updatedOrder: OrderJson = {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        units: item.units.map((unit) => unit.unit_id === 'L1-2' ? { ...unit, status: 'refunded' } : unit),
      })),
    }
    rerender(<RefundModal api={createOrderApi()} order={updatedOrder} open onOpenChange={vi.fn()} onRequestConfirmation={onRequestConfirmation} />)
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Unit L1-2 has already been refunded.')
    if (step === 'selection') {
      expect(within(dialog).getByRole('button', { name: 'Next' })).toBeDisabled()
      expect(within(dialog).queryByRole('heading', { name: 'Review refund' })).not.toBeInTheDocument()
    } else {
      await user.click(within(dialog).getByRole('button', { name: 'Confirm Refund' }))
    }
    expect(onRequestConfirmation).not.toHaveBeenCalled()
  })

  it.each(['Cancel', 'Close refund modal', 'Escape'])('discards the draft when closed through %s and reopened', async (closeMethod) => {
    const user = userEvent.setup()
    renderOpenRefundModal()
    let dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Delivery fee/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.selectOptions(within(dialog).getByRole('combobox'), 'Late delivery')
    await user.click(within(dialog).getByRole('radio', { name: 'In-app credit' }))
    if (closeMethod === 'Cancel') await user.click(within(dialog).getByRole('button', { name: 'Back' }))
    if (closeMethod === 'Escape') await user.keyboard('{Escape}')
    else await user.click(within(dialog).getByRole('button', { name: closeMethod }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open refund' }))
    dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Items eligible for refund' })).toHaveFocus()
    expect(within(dialog).getByRole('checkbox', { name: /Delivery fee/ })).not.toBeChecked()
    expect(within(dialog).getByRole('button', { name: 'Next' })).toBeDisabled()
    expectRefundTotal(dialog, '0.00')
    await user.click(within(dialog).getByRole('checkbox', { name: /Delivery fee/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    expect(within(dialog).getByRole('combobox')).toHaveValue('')
    expect(within(dialog).getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Open refund' })).toHaveFocus()
  })

  it('clears selected add-ons when their parent is unchecked using the keyboard', async () => {
    const user = userEvent.setup()
    renderOpenRefundModal()
    const dialog = screen.getByRole('dialog')
    const unit = within(dialog).getByRole('checkbox', { name: 'Select L1-2 (Iced Spanish Latte) for refund' })
    const addOn = within(dialog).getByRole('checkbox', { name: 'Select Extra Shot for unit L1-2' })
    unit.focus()
    await user.keyboard(' ')
    addOn.focus()
    await user.keyboard(' ')
    expectRefundTotal(dialog, '15.90')
    unit.focus()
    await user.keyboard(' ')
    expect(addOn).not.toBeChecked()
    expect(addOn).toBeDisabled()
    expectRefundTotal(dialog, '0.00')
  })
})

