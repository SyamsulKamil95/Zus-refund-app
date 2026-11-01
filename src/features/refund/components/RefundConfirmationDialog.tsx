import { useRef, useState, type RefObject } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { LoaderCircle, TriangleAlert } from 'lucide-react'
import type { OrderApi, RefundApiResponse } from '../../../services/orderApi.types'
import { formatMoney } from '../../order/utils/orderCalculator'
import { useRefundSubmission } from '../hooks/useRefundSubmission'
import { refundChannels, type RefundConfirmationRequest } from '../types/refundFlow.types'

type RefundConfirmationDialogProps = {
  request: RefundConfirmationRequest
  api: OrderApi
  onCancel: () => void
  onSuccess: (response: RefundApiResponse) => void
  returnFocusRef: RefObject<HTMLButtonElement | null>
}

export function RefundConfirmationDialog({ request, api, onCancel, onSuccess, returnFocusRef }: RefundConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [requestId] = useState(() => crypto.randomUUID())
  const { submit, isSubmitting, error } = useRefundSubmission(api, onSuccess)
  const channel = refundChannels.find(({ value }) => value === request.channel)?.label

  function handleSubmit() {
    void submit({
      requestId,
      orderId: request.orderId,
      selection: request.selection,
      reason: request.reason,
      channel: request.channel,
    })
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !isSubmitting) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-60 bg-slate-950/55" />
        <Dialog.Content
          className="refund-dialog fixed left-1/2 top-1/2 z-70 flex max-h-[calc(100dvh-32px)] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-clip rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none"
          onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus() }}
          onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus({ preventScroll: true }) }}
          onEscapeKeyDown={(event) => { if (isSubmitting) event.preventDefault() }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <header className="shrink-0 border-b border-slate-200 px-5 py-4">
            <Dialog.Title className="text-lg font-bold text-slate-900">Confirm Refund?</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-500">Check the details before submitting this refund.</Dialog.Description>
          </header>
          <div className="min-h-0 overflow-y-auto p-5" aria-busy={isSubmitting}>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-sm">
              <dt className="text-slate-500">Order ID</dt><dd className="text-right font-semibold text-slate-800">{request.orderId}</dd>
              <dt className="text-slate-500">Refund amount</dt><dd className="text-right text-lg font-bold text-brand-900">{formatMoney(request.total.amountMinorUnits / 100, request.total.currency)}</dd>
              <dt className="text-slate-500">Reason</dt><dd className="text-right text-slate-800">{request.reason}</dd>
              <dt className="text-slate-500">Channel</dt><dd className="text-right text-slate-800">{channel}</dd>
            </dl>
            <p className="mt-5 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <TriangleAlert size={18} className="shrink-0" aria-hidden="true" /> Confirming will submit this refund. Selected units cannot be refunded again.
            </p>
            {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          </div>
          <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4">
            {isSubmitting && <span role="status" className="sr-only">Submitting refund. Please wait.</span>}
            <button ref={cancelRef} type="button" onClick={onCancel} disabled={isSubmitting} className="refund-secondary-button min-h-11 rounded-lg border border-slate-300 px-4 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={isSubmitting} aria-busy={isSubmitting} className="refund-primary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 hover:bg-brand-900 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
              {isSubmitting && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
              {isSubmitting ? 'Submitting refund…' : 'Confirm Refund'}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
