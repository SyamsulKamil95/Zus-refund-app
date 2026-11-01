import { describe, expect, it } from 'vitest'
import { order } from '../../../data/order'
import {
  calculateRefundTotal,
  getRefundableUnits,
  InvalidRefundSelectionError,
  validateRefundSelection,
  type RefundSelection,
} from '../utils/refundCalculator'

function makeSelection(
  selectedUnitIds: string[] = [],
  selectedAddOns: RefundSelection['selectedAddOns'] = [],
  includeDeliveryFee = false,
): RefundSelection {
  return { selectedUnitIds, selectedAddOns, includeDeliveryFee }
}

describe('refund calculation and validation', () => {
  it('returns zero for no selection', () => {
    expect(calculateRefundTotal(order, makeSelection())).toEqual({
      currency: 'MYR',
      amountMinorUnits: 0,
    })
  })

  it('includes the parent item unit price when a refundable unit is selected', () => {
    expect(calculateRefundTotal(order, makeSelection(['L1-2'])).amountMinorUnits).toBe(1390)
  })

  it('includes a selected add-on with its parent unit', () => {
    const selection = makeSelection(['L1-2'], [{ unitId: 'L1-2', addonId: 'A1' }])
    expect(calculateRefundTotal(order, selection).amountMinorUnits).toBe(1590)
  })

  it('calculates the total for multiple selected units', () => {
    expect(calculateRefundTotal(order, makeSelection(['L1-2', 'L2-1'])).amountMinorUnits).toBe(2580)
  })

  it('calculates the supplied L3-1 unit as RM7.90', () => {
    expect(calculateRefundTotal(order, makeSelection(['L3-1'])).amountMinorUnits).toBe(790)
  })

  it('includes multiple selected add-ons from one unit', () => {
    const selection = makeSelection(['L2-1'], [
      { unitId: 'L2-1', addonId: 'A2' },
      { unitId: 'L2-1', addonId: 'A3' },
    ])
    expect(calculateRefundTotal(order, selection).amountMinorUnits).toBe(1440)
  })

  it('includes the delivery fee only when explicitly selected', () => {
    expect(calculateRefundTotal(order, makeSelection([], [], true)).amountMinorUnits).toBe(500)
    expect(calculateRefundTotal(order, makeSelection(['L1-2'])).amountMinorUnits).toBe(1390)
  })

  it('excludes refunded units from eligibility and rejects selecting them again', () => {
    expect(getRefundableUnits(order).map(({ unitId }) => unitId)).not.toContain('L1-1')

    const validation = validateRefundSelection(order, makeSelection(['L1-1']))
    expect(validation.isValid).toBe(false)
    expect(validation.errors).toContainEqual(expect.objectContaining({
      code: 'unit-already-refunded',
      unitId: 'L1-1',
    }))
    expect(() => calculateRefundTotal(order, makeSelection(['L1-1']))).toThrow(InvalidRefundSelectionError)
  })

  it('requires a parent unit to be selected before its add-on', () => {
    const validation = validateRefundSelection(
      order,
      makeSelection([], [{ unitId: 'L1-2', addonId: 'A1' }]),
    )
    expect(validation.isValid).toBe(false)
    expect(validation.errors).toContainEqual(expect.objectContaining({
      code: 'addon-parent-not-selected',
      message: 'Select unit L1-2 before selecting its add-on.',
    }))
  })

  it('rejects add-ons when their parent unit is already refunded, even if the add-on status is paid', () => {
    const validation = validateRefundSelection(
      order,
      makeSelection(['L2-2'], [{ unitId: 'L2-2', addonId: 'A2' }]),
    )
    expect(validation.isValid).toBe(false)
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: 'unit-already-refunded' }))
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: 'addon-parent-already-refunded' }))
  })

  it('identifies a reused add-on ID by its parent unit', () => {
    const selection = makeSelection(['L1-2'], [{ unitId: 'L1-2', addonId: 'A1' }])
    expect(validateRefundSelection(order, selection).isValid).toBe(true)
    expect(calculateRefundTotal(order, selection).amountMinorUnits).toBe(1590)
  })

  it('keeps reused add-on IDs separate when both parent units are eligible', () => {
    const updated = structuredClone(order)
    updated.items[0].units[0].status = 'paid'
    updated.items[0].units[0].addons[0].status = 'paid'
    const selection = makeSelection(['L1-1', 'L1-2'], [{ unitId: 'L1-2', addonId: 'A1' }])
    expect(calculateRefundTotal(updated, selection).amountMinorUnits).toBe(2980)
    expect(calculateRefundTotal(updated, {
      ...selection, selectedAddOns: [...selection.selectedAddOns, { unitId: 'L1-1', addonId: 'A1' }],
    }).amountMinorUnits).toBe(3180)
    expect(order.items[0].units[0].status).toBe('refunded')
  })

  it('rejects an already-refunded add-on even when its parent remains paid', () => {
    const updated = structuredClone(order)
    updated.items[0].units[1].addons[0].status = 'refunded'
    const selection = makeSelection(['L1-2'], [{ unitId: 'L1-2', addonId: 'A1' }])
    expect(getRefundableUnits(updated).find(({ unitId }) => unitId === 'L1-2')?.addOns).toEqual([])
    expect(validateRefundSelection(updated, selection).errors).toContainEqual(expect.objectContaining({ code: 'addon-already-refunded' }))
    expect(() => calculateRefundTotal(updated, selection)).toThrow(InvalidRefundSelectionError)
  })

  it('rejects ambiguous IDs in order data instead of charging an instance twice', () => {
    const duplicateUnits = structuredClone(order)
    duplicateUnits.items[2].units[0].unit_id = 'L1-2'
    expect(validateRefundSelection(duplicateUnits, makeSelection(['L1-2'])).errors)
      .toContainEqual(expect.objectContaining({ code: 'ambiguous-unit-id' }))
    const duplicateAddOns = structuredClone(order)
    duplicateAddOns.items[0].units[1].addons.push({ ...duplicateAddOns.items[0].units[1].addons[0] })
    expect(validateRefundSelection(duplicateAddOns, makeSelection(['L1-2'], [{ unitId: 'L1-2', addonId: 'A1' }])).errors)
      .toContainEqual(expect.objectContaining({ code: 'ambiguous-addon-id' }))
  })

  it('returns clear errors for unknown units and add-ons', () => {
    const selection = makeSelection(
      ['L99-9', 'L3-1'],
      [{ unitId: 'L3-1', addonId: 'A99' }],
    )
    const validation = validateRefundSelection(order, selection)
    expect(validation.isValid).toBe(false)
    expect(validation.errors).toContainEqual(expect.objectContaining({
      code: 'unknown-unit',
      message: 'Unit L99-9 does not exist in this order.',
    }))
    expect(validation.errors).toContainEqual(expect.objectContaining({
      code: 'unknown-addon',
      message: 'Add-on A99 does not belong to unit L3-1.',
    }))
    expect(() => calculateRefundTotal(order, selection)).toThrow('Unit L99-9 does not exist in this order.')
  })

  it('matches the supplied RM43.20 example when L1-2, L2-1, L3-1, their listed add-ons, and delivery are selected', () => {
    const selection = makeSelection(
      ['L1-2', 'L2-1', 'L3-1'],
      [
        { unitId: 'L1-2', addonId: 'A1' },
        { unitId: 'L2-1', addonId: 'A2' },
        { unitId: 'L2-1', addonId: 'A3' },
      ],
      true,
    )
    expect(calculateRefundTotal(order, selection).amountMinorUnits).toBe(4320)
  })

  it('calculates all currently eligible units, their eligible add-ons, and delivery as RM59.00', () => {
    const refundableUnits = getRefundableUnits(order)
    expect(refundableUnits.map(({ unitId }) => unitId)).toEqual([
      'L1-2',
      'L2-1',
      'L3-1',
      'L3-2',
      'L3-3',
    ])
    const selection = makeSelection(
      refundableUnits.map(({ unitId }) => unitId),
      refundableUnits.flatMap(({ unitId, addOns }) =>
        addOns.map(({ addon_id }) => ({ unitId, addonId: addon_id })),
      ),
      true,
    )

    expect(validateRefundSelection(order, selection).isValid).toBe(true)
    expect(calculateRefundTotal(order, selection).amountMinorUnits).toBe(5900)
  })
})
