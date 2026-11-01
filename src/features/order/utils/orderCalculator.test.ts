import { describe, expect, it } from 'vitest'
import { order } from '../../../data/order'
import { calculateOrderTotals, getUnitTotalCents } from './orderCalculator'

describe('order calculations', () => {
  it('includes unit add-ons in each product subtotal and delivery in the order total', () => {
    expect(calculateOrderTotals(order)).toEqual({
      subtotal: 84.3,
      deliveryFee: 5,
      total: 89.3,
    })
  })

  it('calculates add-ons from each unit and preserves add-on statuses independently', () => {
    expect(getUnitTotalCents(order.items[0], order.items[0].units[0])).toBe(1590)
    expect(getUnitTotalCents(order.items[1], order.items[1].units[1])).toBe(1440)
    expect(order.items[1].units[1].status).toBe('refunded')
    expect(order.items[1].units[1].addons.map((addOn) => addOn.status)).toEqual(['paid', 'paid'])
    expect(getUnitTotalCents(order.items[2], order.items[2].units[0])).toBe(790)
  })
})
