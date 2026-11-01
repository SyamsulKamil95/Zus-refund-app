import { CircleDollarSign } from 'lucide-react'
import { formatMoney } from '../../order/utils/orderCalculator'
import type { RefundSelection, RefundTotal } from '../utils/refundCalculator'

type RefundSummaryProps = {
  selection: RefundSelection
  total: RefundTotal
}

export function RefundSummary({ selection, total }: RefundSummaryProps) {
  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-4" aria-labelledby="refund-total-heading" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="refund-total-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-800">
            <CircleDollarSign size={15} aria-hidden="true" /> Refund total
          </p>
          <p className="mt-1 text-xs text-brand-800">
            {selection.selectedUnitIds.length} {selection.selectedUnitIds.length === 1 ? 'unit' : 'units'}
            {selection.selectedAddOns.length > 0 && ` · ${selection.selectedAddOns.length} ${selection.selectedAddOns.length === 1 ? 'add-on' : 'add-ons'}`}
            {selection.includeDeliveryFee && ' · delivery'}
          </p>
        </div>
        <strong className="text-xl font-bold tracking-tight text-brand-950">
          {formatMoney(total.amountMinorUnits / 100, total.currency)}
        </strong>
      </div>
    </section>
  )
}
