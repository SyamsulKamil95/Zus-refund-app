import { BadgeCheck, CircleDollarSign, RotateCcw } from 'lucide-react'
import type { PaymentStatus } from '../types/order.types'

type StatusBadgeProps = {
  status: PaymentStatus | 'completed'
  compact?: boolean
}

const statusLabels: Record<StatusBadgeProps['status'], string> = {
  paid: 'Paid',
  refunded: 'Refunded',
  completed: 'Completed',
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const Icon = status === 'refunded' ? RotateCcw : status === 'completed' ? BadgeCheck : CircleDollarSign

  return (
    <span className={`status-badge status-${status} ${compact ? 'status-compact text-caption' : 'text-label'}`}>
      <Icon size={compact ? 12 : 14} aria-hidden="true" />
      {statusLabels[status]}
    </span>
  )
}
