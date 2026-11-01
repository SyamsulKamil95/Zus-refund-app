import { Plus } from 'lucide-react'
import { ProductImage } from '../../../components/ui/ProductImage'
import type { OrderAddOn, OrderItem } from '../types/order.types'
import { formatMoney, getItemSubtotalCents } from '../utils/orderCalculator'
import { StatusBadge } from './StatusBadge'

type OrderItemCardProps = {
  item: OrderItem
  currency: 'MYR'
  displayIndex: number
  imageSrc?: string
}

function getDistinctAddOns(item: OrderItem): OrderAddOn[] {
  const distinct = new Map<string, OrderAddOn>()
  for (const unit of item.units) {
    for (const addOn of unit.addons) {
      distinct.set(`${addOn.addon_id}-${addOn.unit_price}`, addOn)
    }
  }
  return [...distinct.values()]
}

export function OrderItemCard({ item, currency, displayIndex, imageSrc }: OrderItemCardProps) {
  const lineTotal = getItemSubtotalCents(item) / 100
  const distinctAddOns = getDistinctAddOns(item)

  return (
    <article className="order-item-card" aria-labelledby={`item-title-${item.line_id}`}>
      <div className="item-card-main">
        <div className={`product-symbol product-symbol-${displayIndex}`}><ProductImage src={imageSrc} name={item.name} /></div>
        <div className="product-main-copy">
          <div className="item-line-label text-caption">LINE {item.line_id}</div>
          <h3 id={`item-title-${item.line_id}`} className="text-product">{item.name}</h3>
          <div className="product-price-detail text-label">
            <span>{formatMoney(item.unit_price, currency)} <small className="text-detail">base unit price</small></span>
            <span className="price-divider" aria-hidden="true" />
            <span>Quantity: {item.units.length}</span>
          </div>
          {distinctAddOns.length > 0 ? (
            <ul className="addon-list" aria-label={`Add-ons for ${item.name}`}>
              {distinctAddOns.map((addOn) => (
                <li className="text-detail" key={`${addOn.addon_id}-${addOn.unit_price}`}>
                  <Plus size={12} aria-hidden="true" />
                  <span>{addOn.name}</span>
                  <span className="addon-price">{formatMoney(addOn.unit_price, currency)} <small className="text-caption">/ unit</small></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-addons text-label">No add-ons</p>
          )}
        </div>
        <div className="line-total-block">
          <span className="text-detail">Line total</span>
          <strong className="text-product">{formatMoney(lineTotal, currency)}</strong>
          <small className="text-caption">{item.units.length} units, add-ons included</small>
        </div>
      </div>

      <div className="unit-status-section">
        <div className="unit-status-heading text-detail"><span>Individual units &amp; add-on statuses</span><span>{item.units.length} units</span></div>
        <ul className="unit-list" aria-label={`Payment status for ${item.name} units`}>
          {item.units.map((unit) => (
            <li className={`unit-row unit-${unit.status}`} key={unit.unit_id}>
              <div className="unit-row-heading">
                <span className="unit-id text-label">{unit.unit_id}</span>
                <StatusBadge status={unit.status} compact />
              </div>
              {unit.addons.length > 0 ? (
                <ul className="unit-addon-list" aria-label={`Add-on statuses for ${unit.unit_id}`}>
                  {unit.addons.map((addOn) => (
                    <li key={addOn.addon_id}>
                      <span className="unit-addon-name text-detail">{addOn.name}</span>
                      <span className="unit-addon-price text-detail">{formatMoney(addOn.unit_price, currency)}</span>
                      <StatusBadge status={addOn.status} compact />
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="unit-no-addons text-detail">No add-ons</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
