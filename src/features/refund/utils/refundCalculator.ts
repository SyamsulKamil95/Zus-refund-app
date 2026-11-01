import type { OrderAddOn, OrderCurrency, OrderItem, OrderJson, OrderUnit } from '../../order/types/order.types'

export interface RefundAddOnSelection {
  unitId: string
  addonId: string
}

export interface RefundSelection {
  selectedUnitIds: readonly string[]
  selectedAddOns: readonly RefundAddOnSelection[]
  includeDeliveryFee: boolean
}

export interface RefundableUnit {
  lineId: string
  unitId: string
  itemName: string
  itemUnitPrice: number
  addOns: OrderAddOn[]
}

export type RefundValidationErrorCode =
  | 'unknown-unit'
  | 'ambiguous-unit-id'
  | 'duplicate-unit'
  | 'unit-already-refunded'
  | 'unknown-addon-parent'
  | 'addon-parent-already-refunded'
  | 'addon-parent-not-selected'
  | 'unknown-addon'
  | 'ambiguous-addon-id'
  | 'addon-already-refunded'
  | 'duplicate-addon'
  | 'delivery-fee-already-refunded'

export interface RefundValidationError {
  code: RefundValidationErrorCode
  message: string
  unitId?: string
  addonId?: string
}

export interface RefundValidationResult {
  isValid: boolean
  errors: RefundValidationError[]
}

export interface RefundTotal {
  currency: OrderCurrency
  amountMinorUnits: number
}

interface UnitEntry {
  item: OrderItem
  unit: OrderUnit
}

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}

function buildUnitIndex(order: OrderJson): Map<string, UnitEntry[]> {
  const unitsById = new Map<string, UnitEntry[]>()

  for (const item of order.items) {
    for (const unit of item.units) {
      const entries = unitsById.get(unit.unit_id) ?? []
      entries.push({ item, unit })
      unitsById.set(unit.unit_id, entries)
    }
  }

  return unitsById
}

function getAddOnInstanceKey(selection: RefundAddOnSelection): string {
  return JSON.stringify([selection.unitId, selection.addonId])
}

export function getRefundableUnits(order: OrderJson): RefundableUnit[] {
  return order.items.flatMap((item) =>
    item.units
      .filter((unit) => unit.status === 'paid')
      .map((unit) => ({
        lineId: item.line_id,
        unitId: unit.unit_id,
        itemName: item.name,
        itemUnitPrice: item.unit_price,
        addOns: unit.addons.filter((addOn) => addOn.status === 'paid').map((addOn) => ({ ...addOn })),
      })),
  )
}

export function validateRefundSelection(
  order: OrderJson,
  selection: RefundSelection,
): RefundValidationResult {
  const errors: RefundValidationError[] = []
  const unitsById = buildUnitIndex(order)
  const selectedUnitIds = new Set(selection.selectedUnitIds)
  const seenUnitIds = new Set<string>()
  const seenAddOnKeys = new Set<string>()

  for (const unitId of selection.selectedUnitIds) {
    if (seenUnitIds.has(unitId)) {
      errors.push({ code: 'duplicate-unit', unitId, message: `Unit ${unitId} is selected more than once.` })
      continue
    }
    seenUnitIds.add(unitId)

    const matchingUnits = unitsById.get(unitId)
    if (!matchingUnits?.length) {
      errors.push({ code: 'unknown-unit', unitId, message: `Unit ${unitId} does not exist in this order.` })
      continue
    }
    if (matchingUnits.length > 1) {
      errors.push({ code: 'ambiguous-unit-id', unitId, message: `Unit ID ${unitId} is not unique in this order.` })
      continue
    }
    if (matchingUnits[0].unit.status === 'refunded') {
      errors.push({ code: 'unit-already-refunded', unitId, message: `Unit ${unitId} has already been refunded.` })
    }
  }

  for (const selectedAddOn of selection.selectedAddOns) {
    const key = getAddOnInstanceKey(selectedAddOn)
    if (seenAddOnKeys.has(key)) {
      errors.push({
        code: 'duplicate-addon',
        unitId: selectedAddOn.unitId,
        addonId: selectedAddOn.addonId,
        message: `Add-on ${selectedAddOn.addonId} for unit ${selectedAddOn.unitId} is selected more than once.`,
      })
      continue
    }
    seenAddOnKeys.add(key)

    const matchingUnits = unitsById.get(selectedAddOn.unitId)
    if (!matchingUnits?.length) {
      errors.push({
        code: 'unknown-addon-parent',
        unitId: selectedAddOn.unitId,
        addonId: selectedAddOn.addonId,
        message: `Add-on ${selectedAddOn.addonId} refers to unknown unit ${selectedAddOn.unitId}.`,
      })
      continue
    }
    if (matchingUnits.length > 1) {
      errors.push({
        code: 'ambiguous-unit-id',
        unitId: selectedAddOn.unitId,
        addonId: selectedAddOn.addonId,
        message: `Unit ID ${selectedAddOn.unitId} is not unique in this order.`,
      })
      continue
    }

    const { unit } = matchingUnits[0]
    if (unit.status === 'refunded') {
      errors.push({
        code: 'addon-parent-already-refunded',
        unitId: selectedAddOn.unitId,
        addonId: selectedAddOn.addonId,
        message: `Add-on ${selectedAddOn.addonId} cannot be refunded because unit ${selectedAddOn.unitId} was already refunded.`,
      })
      continue
    }
    if (!selectedUnitIds.has(selectedAddOn.unitId)) {
      errors.push({
        code: 'addon-parent-not-selected',
        unitId: selectedAddOn.unitId,
        addonId: selectedAddOn.addonId,
        message: `Select unit ${selectedAddOn.unitId} before selecting its add-on.`,
      })
      continue
    }

    const matchingAddOns = unit.addons.filter(({ addon_id }) => addon_id === selectedAddOn.addonId)
    if (!matchingAddOns.length) {
      errors.push({
        code: 'unknown-addon',
        unitId: selectedAddOn.unitId,
        addonId: selectedAddOn.addonId,
        message: `Add-on ${selectedAddOn.addonId} does not belong to unit ${selectedAddOn.unitId}.`,
      })
      continue
    }
    if (matchingAddOns.length > 1) {
      errors.push({
        code: 'ambiguous-addon-id',
        unitId: selectedAddOn.unitId,
        addonId: selectedAddOn.addonId,
        message: `Add-on ID ${selectedAddOn.addonId} is not unique within unit ${selectedAddOn.unitId}.`,
      })
      continue
    }
    if (matchingAddOns[0].status === 'refunded') {
      errors.push({
        code: 'addon-already-refunded',
        unitId: selectedAddOn.unitId,
        addonId: selectedAddOn.addonId,
        message: `Add-on ${selectedAddOn.addonId} for unit ${selectedAddOn.unitId} has already been refunded.`,
      })
    }
  }

  if (selection.includeDeliveryFee && order.delivery_fee_status === 'refunded') {
    errors.push({
      code: 'delivery-fee-already-refunded',
      message: 'The delivery fee has already been refunded.',
    })
  }

  return { isValid: errors.length === 0, errors }
}

export class InvalidRefundSelectionError extends Error {
  constructor(readonly errors: RefundValidationError[]) {
    super(errors.map(({ message }) => message).join(' '))
    this.name = 'InvalidRefundSelectionError'
  }
}

export function calculateRefundTotal(
  order: OrderJson,
  selection: RefundSelection,
): RefundTotal {
  const validation = validateRefundSelection(order, selection)
  if (!validation.isValid) throw new InvalidRefundSelectionError(validation.errors)

  const selectedUnitIds = new Set(selection.selectedUnitIds)
  const selectedAddOnKeys = new Set(selection.selectedAddOns.map(getAddOnInstanceKey))
  let amountMinorUnits = 0

  for (const item of order.items) {
    for (const unit of item.units) {
      if (!selectedUnitIds.has(unit.unit_id)) continue

      amountMinorUnits += toMinorUnits(item.unit_price)
      for (const addOn of unit.addons) {
        const key = getAddOnInstanceKey({ unitId: unit.unit_id, addonId: addOn.addon_id })
        if (selectedAddOnKeys.has(key)) amountMinorUnits += toMinorUnits(addOn.unit_price)
      }
    }
  }

  if (selection.includeDeliveryFee) amountMinorUnits += toMinorUnits(order.delivery_fee)

  return { currency: order.currency, amountMinorUnits }
}
