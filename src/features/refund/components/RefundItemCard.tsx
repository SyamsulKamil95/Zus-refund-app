import type { OrderCurrency, OrderItem } from '../../order/types/order.types'
import { formatMoney } from '../../order/utils/orderCalculator'
import type { RefundAddOnSelection } from '../utils/refundCalculator'
import { RefundUnitRow } from './RefundUnitRow'

type RefundItemCardProps = {
  item: OrderItem
  currency: OrderCurrency
  selectedUnitIds: readonly string[]
  selectedAddOns: readonly RefundAddOnSelection[]
  onUnitToggle: (unitId: string, isSelected: boolean) => void
  onAddOnToggle: (unitId: string, addonId: string, isSelected: boolean) => void
}

export function RefundItemCard({
  item,
  currency,
  selectedUnitIds,
  selectedAddOns,
  onUnitToggle,
  onAddOnToggle,
}: RefundItemCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby={`refund-item-${item.line_id}`}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-detail font-semibold uppercase tracking-wider text-slate-500">Line {item.line_id} · Qty {item.units.length}</p>
          <h3 id={`refund-item-${item.line_id}`} className="mt-1 text-sm font-semibold leading-5 text-slate-800">{item.name}</h3>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-600">{formatMoney(item.unit_price, currency)} / unit</span>
      </header>
      <ul className="grid gap-2 p-3" aria-label={`Refundable units for ${item.name}`}>
        {item.units.map((unit) => (
          <RefundUnitRow
            key={unit.unit_id}
            item={item}
            unit={unit}
            currency={currency}
            isSelected={selectedUnitIds.includes(unit.unit_id)}
            selectedAddOns={selectedAddOns}
            onUnitToggle={onUnitToggle}
            onAddOnToggle={onAddOnToggle}
          />
        ))}
      </ul>
    </section>
  )
}
