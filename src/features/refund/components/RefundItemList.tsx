import { Truck } from 'lucide-react'
import type { OrderJson } from '../../order/types/order.types'
import { formatMoney } from '../../order/utils/orderCalculator'
import { StatusBadge } from '../../order/components/StatusBadge'
import type { RefundSelection } from '../utils/refundCalculator'
import { RefundItemCard } from './RefundItemCard'

type RefundItemListProps = {
  order: OrderJson
  selection: RefundSelection
  onUnitToggle: (unitId: string, isSelected: boolean) => void
  onAddOnToggle: (unitId: string, addonId: string, isSelected: boolean) => void
  onDeliveryToggle: (isSelected: boolean) => void
}

export function RefundItemList({ order, selection, onUnitToggle, onAddOnToggle, onDeliveryToggle }: RefundItemListProps) {
  const deliveryFeeIsRefunded = order.delivery_fee_status === 'refunded'

  return (
    <div className="grid gap-3">
      {order.items.map((item) => (
        <RefundItemCard
          key={item.line_id}
          item={item}
          currency={order.currency}
          selectedUnitIds={selection.selectedUnitIds}
          selectedAddOns={selection.selectedAddOns}
          onUnitToggle={onUnitToggle}
          onAddOnToggle={onAddOnToggle}
        />
      ))}

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3" aria-labelledby="refund-delivery-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="refund-delivery-fee"
            className={`flex min-w-0 flex-1 items-start gap-3 ${deliveryFeeIsRefunded ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <input
              id="refund-delivery-fee"
              type="checkbox"
              checked={selection.includeDeliveryFee}
              disabled={deliveryFeeIsRefunded}
              onChange={(event) => onDeliveryToggle(event.currentTarget.checked)}
              className="mt-0.5 size-4 shrink-0 accent-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            />
            <span>
              <span id="refund-delivery-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Truck size={15} aria-hidden="true" /> Delivery fee
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {deliveryFeeIsRefunded ? 'Already refunded · not eligible' : 'Optional · select independently'}
              </span>
            </span>
          </label>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {formatMoney(order.delivery_fee, order.currency)}
            <StatusBadge status={order.delivery_fee_status} compact />
          </span>
        </div>
      </section>
    </div>
  )
}
