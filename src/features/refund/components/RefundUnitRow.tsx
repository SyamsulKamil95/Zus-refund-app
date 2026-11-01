import { Check, LockKeyhole, Minus } from 'lucide-react'
import type { OrderCurrency, OrderItem, OrderUnit } from '../../order/types/order.types'
import type { RefundAddOnSelection } from '../utils/refundCalculator'
import { formatMoney } from '../../order/utils/orderCalculator'
import { StatusBadge } from '../../order/components/StatusBadge'

type RefundUnitRowProps = {
  item: OrderItem
  unit: OrderUnit
  currency: OrderCurrency
  isSelected: boolean
  selectedAddOns: readonly RefundAddOnSelection[]
  onUnitToggle: (unitId: string, isSelected: boolean) => void
  onAddOnToggle: (unitId: string, addonId: string, isSelected: boolean) => void
}

export function RefundUnitRow({
  item,
  unit,
  currency,
  isSelected,
  selectedAddOns,
  onUnitToggle,
  onAddOnToggle,
}: RefundUnitRowProps) {
  const isRefunded = unit.status === 'refunded'
  const unitCheckboxId = `refund-unit-${unit.unit_id}`

  return (
    <li className={`rounded-lg border p-3 transition-colors ${isRefunded ? 'border-orange-100 bg-orange-50/60' : isSelected ? 'border-brand-200 bg-brand-50/60' : 'border-slate-200 bg-slate-50/70'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label
          htmlFor={unitCheckboxId}
          className={`flex min-w-0 flex-1 items-start gap-3 ${isRefunded ? 'cursor-not-allowed opacity-65' : 'cursor-pointer'}`}
        >
          <input
            id={unitCheckboxId}
            type="checkbox"
            checked={isSelected}
            disabled={isRefunded}
            onChange={(event) => onUnitToggle(unit.unit_id, event.currentTarget.checked)}
            className="mt-0.5 size-4 shrink-0 accent-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            aria-label={`Select ${unit.unit_id} (${item.name}) for refund`}
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-slate-800">{unit.unit_id}</span>
              <span className="text-xs text-slate-500">{formatMoney(item.unit_price, currency)}</span>
            </span>
            {isRefunded && <span className="mt-1 block text-xs text-orange-800">Already refunded · not eligible</span>}
          </span>
        </label>
        <StatusBadge status={unit.status} compact />
      </div>

      {unit.addons.length > 0 && (
        <ul className="mt-3 ml-7 grid gap-2 border-l border-slate-200 pl-3" aria-label={`Add-ons for unit ${unit.unit_id}`}>
          {unit.addons.map((addOn) => {
            const checkboxId = `refund-addon-${JSON.stringify([unit.unit_id, addOn.addon_id])}`
            const isAddOnSelected = selectedAddOns.some(
              (selectedAddOn) => selectedAddOn.unitId === unit.unit_id && selectedAddOn.addonId === addOn.addon_id,
            )
            const isAddOnDisabled = isRefunded || addOn.status === 'refunded' || !isSelected
            const disabledReason = isRefunded
              ? 'Unavailable: parent unit refunded'
              : addOn.status === 'refunded' ? 'Already refunded' : !isSelected ? 'Select the parent unit first' : ''

            return (
              <li key={JSON.stringify([unit.unit_id, addOn.addon_id])} className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={checkboxId}
                    className={`flex min-w-0 flex-wrap items-center gap-2 ${isAddOnDisabled ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer'}`}
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={isAddOnSelected}
                      disabled={isAddOnDisabled}
                      onChange={(event) => onAddOnToggle(unit.unit_id, addOn.addon_id, event.currentTarget.checked)}
                      className="size-3.5 shrink-0 accent-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                      aria-label={`Select ${addOn.name} for unit ${unit.unit_id}`}
                      aria-describedby={disabledReason ? `${checkboxId}-help` : undefined}
                    />
                    <span className="max-w-full text-xs text-slate-600 [overflow-wrap:anywhere]">{addOn.name}</span>
                    <span className="text-xs font-medium text-slate-700">{formatMoney(addOn.unit_price, currency)}</span>
                  </label>
                  {disabledReason && (
                    <p id={`${checkboxId}-help`} className={`mt-1 flex items-center gap-1 text-detail ${isRefunded ? 'font-medium text-orange-900' : 'text-slate-500'}`}>
                      {isRefunded && <LockKeyhole size={12} aria-hidden="true" />} {disabledReason}
                    </p>
                  )}
                </div>
                <span><span className="sr-only">Payment status: </span><StatusBadge status={addOn.status} compact /></span>
              </li>
            )
          })}
        </ul>
      )}
      {unit.addons.length === 0 && (
        <p className="mt-2 ml-7 flex items-center gap-1 text-xs text-slate-500">
          <Minus size={12} aria-hidden="true" /> No add-ons for this unit
        </p>
      )}
      {isSelected && (
        <span className="sr-only"><Check aria-hidden="true" /> {unit.unit_id} selected for refund</span>
      )}
    </li>
  )
}
