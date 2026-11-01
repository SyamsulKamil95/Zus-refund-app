export type PaymentStatus = 'paid' | 'refunded'
export type OrderStatus = 'completed'
export type OrderCurrency = 'MYR'

export interface OrderAddOn {
  addon_id: string
  name: string
  unit_price: number
  status: PaymentStatus
}

export interface OrderUnit {
  unit_id: string
  status: PaymentStatus
  addons: OrderAddOn[]
}

export interface OrderItem {
  line_id: string
  base_product_id: string
  name: string
  unit_price: number
  units: OrderUnit[]
}

export interface OrderJson {
  order_id: string
  order_date?: string
  status: OrderStatus
  currency: OrderCurrency
  delivery_fee: number
  delivery_fee_status: PaymentStatus
  items: OrderItem[]
}
