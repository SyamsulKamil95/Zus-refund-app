import { useState } from 'react'
import { X } from 'lucide-react'
import { order } from '../../../data/order'
import { OrderHeader } from '../components/OrderHeader'
import { OrderInfo } from '../components/OrderInfo'
import { OrderItems } from '../components/OrderItems'
import { OrderSummary } from '../components/OrderSummary'

export default function OrderPage() {
  const [showRefundNotice, setShowRefundNotice] = useState(false)

  return (
    <div className="backoffice-app">
      <a className="skip-link" href="#main-content">Skip to order details</a>
      <OrderHeader />
      <main id="main-content" className="order-page-shell">
        <div className="page-title-row">
          <div>
            <p className="page-kicker">ORDER MANAGEMENT</p>
            <h1>Order details</h1>
            <p className="page-description">Review purchased items, unit payment statuses, and order totals.</p>
          </div>
          <span className="record-id">RECORD <strong>{order.order_id}</strong></span>
        </div>

        {showRefundNotice && (
          <div className="phase-notice" role="status">
            <span>Refund workflow will be implemented in the next phase.</span>
            <button type="button" aria-label="Dismiss refund notice" onClick={() => setShowRefundNotice(false)}><X size={16} /></button>
          </div>
        )}

        <OrderInfo order={order} />
        <div className="order-content-grid">
          <OrderItems order={order} />
          <OrderSummary order={order} onStartRefund={() => setShowRefundNotice(true)} />
        </div>
        <footer className="page-footer">ZUS Coffee <span>·</span> Order management</footer>
      </main>
    </div>
  )
}
