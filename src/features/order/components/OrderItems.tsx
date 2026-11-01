import type { OrderJson } from '../types/order.types'
import { OrderItemCard } from './OrderItemCard'

type OrderItemsProps = { order: OrderJson }

export function OrderItems({ order }: OrderItemsProps) {
  return (
    <section className="items-section" aria-labelledby="items-heading">
      <div className="section-heading-row">
        <div>
          <p className="section-eyebrow">PURCHASE BREAKDOWN</p>
          <h2 id="items-heading">Order items <span>{order.items.length}</span></h2>
        </div>
        <p className="items-units-total">{order.items.reduce((total, item) => total + item.units.length, 0)} units in this order</p>
      </div>
      <div className="order-items-list">
        {order.items.map((item, index) => (
          <OrderItemCard item={item} currency={order.currency} displayIndex={index + 1} key={item.line_id} />
        ))}
      </div>
    </section>
  )
}
