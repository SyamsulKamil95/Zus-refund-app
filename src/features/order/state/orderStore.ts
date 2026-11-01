import type { OrderJson } from '../types/order.types'

export interface OrderSnapshot {
  order: OrderJson
  version: number
}

export function createOrderStore(initialOrder: OrderJson) {
  let snapshot: OrderSnapshot = { order: structuredClone(initialOrder), version: 0 }
  return {
    read: (): OrderSnapshot => structuredClone(snapshot),
    commit(order: OrderJson): OrderSnapshot {
      snapshot = { order: structuredClone(order), version: snapshot.version + 1 }
      return structuredClone(snapshot)
    },
  }
}
