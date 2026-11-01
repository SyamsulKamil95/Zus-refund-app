import { CalendarDays, Hash, WalletCards } from 'lucide-react'
import type { OrderJson } from '../types/order.types'
import { formatOrderDate } from '../utils/orderDate'
import { StatusBadge } from './StatusBadge'

type OrderInfoProps = { order: OrderJson }

export function OrderInfo({ order }: OrderInfoProps) {
  return (
    <section className="order-info-card" aria-labelledby="order-info-heading">
      <div className="order-info-topline">
        <div>
          <p className="section-eyebrow">ORDER OVERVIEW</p>
          <h2 id="order-info-heading">Order information</h2>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <dl className="order-meta-grid">
        <div className="order-meta-cell">
          <dt><Hash size={14} aria-hidden="true" /> Order ID</dt>
          <dd>{order.order_id}</dd>
        </div>
        <div className="order-meta-cell">
          <dt><CalendarDays size={14} aria-hidden="true" /> Order date</dt>
          <dd className={order.order_date ? undefined : 'meta-missing'}>
            {order.order_date ? <time dateTime={order.order_date}>{formatOrderDate(order.order_date)} MYT</time> : 'Not provided'}
          </dd>
        </div>
        <div className="order-meta-cell">
          <dt><WalletCards size={14} aria-hidden="true" /> Currency</dt>
          <dd>{order.currency}</dd>
        </div>
      </dl>
    </section>
  )
}
