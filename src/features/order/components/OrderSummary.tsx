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
        <div><p className="section-eyebrow">PAYMENT OVERVIEW</p><h2 id="summary-heading">Order summary</h2></div>
      </div>
      <div className="summary-lines">
        <div className="summary-line"><span>Product subtotal</span><strong>{formatMoney(totals.subtotal, order.currency)}</strong></div>
        <div className="summary-line delivery-line">
          <span>Delivery fee <StatusBadge status={order.delivery_fee_status} compact /></span>
          <strong>{formatMoney(totals.deliveryFee, order.currency)}</strong>
        </div>
      </div>
      <div className="summary-total-line"><span>Total order amount</span><strong>{formatMoney(totals.total, order.currency)}</strong></div>
      <div className="summary-footnote"><CircleHelp size={14} aria-hidden="true" /><span>Amounts include add-ons at their per-unit prices.</span></div>
      <button ref={refundButtonRef} className="refund-button" type="button" onClick={onStartRefund}>
        <ArrowDownToLine size={16} aria-hidden="true" /> Refund
      </button>
    </aside>
  )
}
