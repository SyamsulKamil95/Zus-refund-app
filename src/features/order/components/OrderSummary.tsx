import { ArrowDownToLine, CircleHelp, ReceiptText } from 'lucide-react'
import type { RefObject } from 'react'
import type { OrderJson } from '../types/order.types'
import { calculateOrderTotals, formatMoney } from '../utils/orderCalculator'
import { StatusBadge } from './StatusBadge'

type OrderSummaryProps = { order: OrderJson; onStartRefund: () => void; refundButtonRef?: RefObject<HTMLButtonElement | null> }

export function OrderSummary({ order, onStartRefund, refundButtonRef }: OrderSummaryProps) {
  const totals = calculateOrderTotals(order)

  return (
    <aside className="order-summary" aria-labelledby="summary-heading">
      <div className="summary-title-row">
        <span className="summary-icon"><ReceiptText size={17} aria-hidden="true" /></span>
        <div><p className="section-eyebrow text-caption">PAYMENT OVERVIEW</p><h2 id="summary-heading" className="text-section max-[600px]:text-section-sm">Order summary</h2></div>
      </div>
      <div className="summary-lines">
        <div className="summary-line text-label"><span>Product subtotal</span><strong className="text-note">{formatMoney(totals.subtotal, order.currency)}</strong></div>
        <div className="summary-line delivery-line text-label">
          <span>Delivery fee <StatusBadge status={order.delivery_fee_status} compact /></span>
          <strong className="text-note">{formatMoney(totals.deliveryFee, order.currency)}</strong>
        </div>
      </div>
      <div className="summary-total-line text-note"><span>Total order amount</span><strong className="text-total">{formatMoney(totals.total, order.currency)}</strong></div>
      <div className="summary-footnote text-detail"><CircleHelp size={14} aria-hidden="true" /><span>Amounts include add-ons at their per-unit prices.</span></div>
      <button ref={refundButtonRef} className="refund-button text-body" type="button" onClick={onStartRefund}>
        <ArrowDownToLine size={16} aria-hidden="true" /> Refund
      </button>
    </aside>
  )
}
