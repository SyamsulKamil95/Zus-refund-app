import { useEffect, useRef, useState } from 'react'
import { order as orderReference } from '../../../data/order'
import { createOrderApi } from '../../../services/orderApi'
import type { OrderApi, RefundSubmissionResult } from '../../../services/orderApi.types'
import { DemoToolsPanel } from '../../../mocks/DemoToolsPanel'
import { showDemoTools } from '../../../mocks/mockConfig'
import { RefundModal } from '../../refund/components/RefundModal'
import { OrderInfo } from '../components/OrderInfo'
import { OrderItems } from '../components/OrderItems'
import { OrderSummary } from '../components/OrderSummary'
import { useOrder } from '../hooks/useOrder'
import { formatMoney } from '../utils/orderCalculator'

export default function OrderPage({ api: providedApi }: { api?: OrderApi }) {
  const [api] = useState(() => providedApi ?? createOrderApi())
  const { order, isLoading, loadError, reload } = useOrder(api, orderReference.order_id)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const refundButtonRef = useRef<HTMLButtonElement>(null)
  const retryButtonRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef(false)

  useEffect(() => {
    if (restoreFocusRef.current && !isLoading) {
      if (loadError) retryButtonRef.current?.focus()
      else if (order) { refundButtonRef.current?.focus(); restoreFocusRef.current = false }
    }
  }, [order, isLoading, loadError])

  function handleRefundSuccess(response: RefundSubmissionResult) {
    restoreFocusRef.current = true
    reload(response.version)
    setSuccessMessage(`Refund of ${formatMoney(response.refund.refundAmount, response.refund.currency)} completed successfully.`)
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="page-kicker text-caption">ORDER MANAGEMENT</p>
          <h1 className="text-page max-[600px]:text-page-sm">Order details</h1>
          <p className="page-description text-body max-[600px]:text-note">Review purchased items, unit payment statuses, and order totals.</p>
        </div>
        <span className="record-id text-caption">RECORD <strong className="text-label">{orderReference.order_id}</strong></span>
      </div>
      {successMessage && <p role="status" className="phase-notice text-note">{successMessage}</p>}
      {isLoading ? (
        <div className="order-info-card" aria-live="polite"><p>{successMessage ? 'Refreshing order details…' : 'Loading order details…'}</p></div>
      ) : loadError ? (
        <div role="alert" className="phase-notice text-note"><span>{loadError}</span><button ref={retryButtonRef} type="button" className="order-refresh-button" onClick={() => reload()}>Retry</button></div>
      ) : order && (
        <>
          <OrderInfo order={order} />
          <div className="order-content-grid">
            <OrderItems order={order} />
            <OrderSummary order={order} refundButtonRef={refundButtonRef} onStartRefund={() => { setSuccessMessage(''); setIsRefundModalOpen(true) }} />
          </div>
        </>
      )}
      {showDemoTools(window.location.search) && <DemoToolsPanel />}
      {order && !isLoading && !loadError && <RefundModal order={order} api={api} open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen} onRefundSuccess={handleRefundSuccess} />}
    </>
  )
}
