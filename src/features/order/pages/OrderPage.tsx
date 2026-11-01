import { useEffect, useRef, useState } from 'react'
import { order as orderReference } from '../../../data/order'
import { createOrderApi } from '../../../services/orderApi'
import type { OrderApi, RefundApiResponse } from '../../../services/orderApi.types'
import { DemoToolsPanel } from '../../../mocks/DemoToolsPanel'
import { showDemoTools } from '../../../mocks/mockConfig'
import { RefundModal } from '../../refund/components/RefundModal'
import { OrderHeader } from '../components/OrderHeader'
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

  function handleRefundSuccess(response: RefundApiResponse) {
    restoreFocusRef.current = true
    reload(response.version)
    setSuccessMessage(`Refund of ${formatMoney(response.refund.amountMinorUnits / 100, response.refund.currency)} completed successfully.`)
  }

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
          <span className="record-id">RECORD <strong>{orderReference.order_id}</strong></span>
        </div>
        {successMessage && <p role="status" className="phase-notice">{successMessage}</p>}
        {isLoading ? (
          <div className="order-info-card" aria-live="polite"><p>{successMessage ? 'Refreshing order details…' : 'Loading order details…'}</p></div>
        ) : loadError ? (
          <div role="alert" className="phase-notice"><span>{loadError}</span><button ref={retryButtonRef} type="button" className="order-refresh-button" onClick={() => reload()}>Retry</button></div>
        ) : order && (
          <>
            <OrderInfo order={order} />
            <div className="order-content-grid">
              <OrderItems order={order} />
              <OrderSummary order={order} refundButtonRef={refundButtonRef} onStartRefund={() => { setSuccessMessage(''); setIsRefundModalOpen(true) }} />
            </div>
          </>
        )}
        <footer className="page-footer">ZUS Coffee <span>·</span> Order management</footer>
        {showDemoTools(window.location.search) && <DemoToolsPanel />}
      </main>
      {order && !isLoading && !loadError && <RefundModal order={order} api={api} open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen} onRefundSuccess={handleRefundSuccess} />}
    </div>
  )
}
