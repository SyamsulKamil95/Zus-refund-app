import { useEffect, useReducer, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import type { OrderJson } from '../../order/types/order.types'
import type { OrderApi, RefundApiResponse } from '../../../services/orderApi.types'
import { createRefundFlowState, refundFlowReducer } from '../state/refundFlowReducer'
import type { RefundConfirmationRequest } from '../types/refundFlow.types'
import { calculateRefundTotal, validateRefundSelection } from '../utils/refundCalculator'
import { getRefundSelectionErrors, prepareRefundConfirmation } from '../utils/refundReview'
import { RefundItemList } from './RefundItemList'
import { RefundReview } from './RefundReview'
import { RefundSummary } from './RefundSummary'
import { RefundConfirmationDialog } from './RefundConfirmationDialog'

type RefundModalProps = {
  order: OrderJson
  open: boolean
  onOpenChange: (open: boolean) => void
  api: OrderApi
  onRefundSuccess?: (response: RefundApiResponse) => void
  onRequestConfirmation?: (request: RefundConfirmationRequest) => void
}

export function RefundModal({ order, open, onOpenChange, onRequestConfirmation, api, onRefundSuccess }: RefundModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]" />
        {open && <RefundFlow order={order} api={api} onRequestConfirmation={onRequestConfirmation} onSuccess={(response) => { onRefundSuccess?.(response); onOpenChange(false) }} />}
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Mounting a new flow on each opening resets drafts for every close mechanism.
function RefundFlow({ order, api, onRequestConfirmation, onSuccess }: Pick<RefundModalProps, 'order' | 'api' | 'onRequestConfirmation'> & { onSuccess: (response: RefundApiResponse) => void }) {
  const [state, dispatch] = useReducer(refundFlowReducer, undefined, createRefundFlowState)
  const [confirmationRequest, setConfirmationRequest] = useState<RefundConfirmationRequest | null>(null)
  const reviewConfirmRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const previousStepRef = useRef(state.step)
  const isReview = state.step === 'review'
  const selectionErrors = getRefundSelectionErrors(order, state.selection)
  const hasSelection = state.selection.selectedUnitIds.length > 0 || state.selection.includeDeliveryFee
  const total = validateRefundSelection(order, state.selection).isValid
    ? calculateRefundTotal(order, state.selection)
    : null
  const confirmation = prepareRefundConfirmation(order, state)
  const reviewErrors = state.validationAttempts > 0 && !confirmation.isValid ? confirmation.errors : undefined

  useEffect(() => {
    if (previousStepRef.current !== state.step) {
      if (bodyRef.current) bodyRef.current.scrollTop = 0
      headingRef.current?.focus({ preventScroll: true })
      previousStepRef.current = state.step
    }
  }, [state.step])

  useEffect(() => {
    if (state.validationAttempts > 0) {
      bodyRef.current?.querySelector<HTMLElement>('[data-selection-error], select[aria-invalid="true"], input[aria-invalid="true"]')?.focus()
    }
  }, [state.validationAttempts])

  function handleNext() {
    if (getRefundSelectionErrors(order, state.selection).length === 0) dispatch({ type: 'next' })
  }

  function handleConfirm() {
    const result = prepareRefundConfirmation(order, state)
    if (!result.isValid) {
      dispatch({ type: 'validation-failed' })
      return
    }
    onRequestConfirmation?.(result.request)
    setConfirmationRequest(result.request)
  }

  return (
    <Dialog.Content
      className="refund-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[min(900px,calc(100dvh-32px))] w-[min(760px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-clip rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl shadow-slate-950/20 focus:outline-none"
      onOpenAutoFocus={(event) => {
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        event.preventDefault()
        headingRef.current?.focus({ preventScroll: true })
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        returnFocusRef.current?.focus({ preventScroll: true })
      }}
      onEscapeKeyDown={(event) => { if (confirmationRequest) event.preventDefault() }}
      onInteractOutside={(event) => { if (confirmationRequest) event.preventDefault() }}
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <div>
          <p className="text-detail font-semibold uppercase tracking-[0.1em] text-brand-700">Order {order.order_id} · Step {isReview ? '2' : '1'} of 2</p>
          <Dialog.Title className="mt-1 text-xl font-bold tracking-tight text-slate-900">Initiate Refund</Dialog.Title>
          <Dialog.Description className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
            {isReview ? 'Review the selected items, then choose a refund reason and channel.' : 'Select paid units to refund. Add-ons are optional and can only be selected with their unit.'}
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <button type="button" disabled={Boolean(confirmationRequest)} aria-label="Close refund modal" className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
            <X size={18} aria-hidden="true" />
          </button>
        </Dialog.Close>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="rounded text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700">
            {isReview ? 'Review refund' : 'Items eligible for refund'}
          </h2>
          {!isReview && <p className="mt-1 text-xs text-slate-500">Choose units individually. Add-ons are not selected automatically.</p>}
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-detail font-semibold text-slate-500">{order.currency}</span>
      </div>

      <div ref={bodyRef} className="refund-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        {hasSelection && selectionErrors.length > 0 && (
          <div role="alert" data-selection-error tabIndex={-1} className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 focus:outline-2 focus:outline-red-700">
            <p className="font-semibold">Update your refund selection before continuing.</p>
            <ul className="mt-1 list-inside list-disc">{selectionErrors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}
        {isReview ? (
          <RefundReview
            order={order}
            draft={state}
            errors={reviewErrors}
            onReasonChange={(reason) => dispatch({ type: 'set-reason', reason })}
            onChannelChange={(channel) => dispatch({ type: 'set-channel', channel })}
            onConfirm={(event) => { event.preventDefault(); handleConfirm() }}
          />
        ) : (
          <RefundItemList
            order={order}
            selection={state.selection}
            onUnitToggle={(unitId, selected) => dispatch({ type: 'toggle-unit', unitId, selected })}
            onAddOnToggle={(unitId, addonId, selected) => dispatch({ type: 'toggle-addon', unitId, addonId, selected })}
            onDeliveryToggle={(selected) => dispatch({ type: 'toggle-delivery', selected })}
          />
        )}
      </div>

      <footer className="refund-modal-footer grid shrink-0 gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
        {total ? <RefundSummary selection={state.selection} total={total} /> : <p className="text-sm text-red-700">Refund total unavailable. Update your selection.</p>}
        <div className="flex justify-end gap-2">
          {isReview ? (
            <button type="button" disabled={Boolean(confirmationRequest)} onClick={() => dispatch({ type: 'back' })} className="refund-secondary-button text-body inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
              <ArrowLeft size={15} aria-hidden="true" /> Back
            </button>
          ) : (
            <Dialog.Close asChild>
              <button type="button" className="refund-secondary-button text-body min-h-11 rounded-lg border border-slate-300 bg-white px-4 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Cancel</button>
            </Dialog.Close>
          )}
          {isReview ? (
            <button key="confirm" ref={reviewConfirmRef} disabled={Boolean(confirmationRequest)} type="submit" form="refund-review-form" className="refund-primary-button text-body inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-800 px-4 transition hover:bg-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Confirm Refund</button>
          ) : (
            <button key="next" type="button" onClick={(event) => { event.preventDefault(); handleNext() }} disabled={selectionErrors.length > 0} className="refund-primary-button text-body inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 transition hover:bg-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              Next <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </footer>
      {confirmationRequest && <RefundConfirmationDialog request={confirmationRequest} api={api} returnFocusRef={reviewConfirmRef} onCancel={() => setConfirmationRequest(null)} onSuccess={onSuccess} />}
    </Dialog.Content>
  )
}
