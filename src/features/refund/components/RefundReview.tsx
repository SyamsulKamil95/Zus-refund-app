import type { FormEventHandler } from 'react'
import type { OrderJson } from '../../order/types/order.types'
import { formatMoney } from '../../order/utils/orderCalculator'
import { refundChannels, refundReasons, type RefundChannel, type RefundDraft, type RefundReason } from '../types/refundFlow.types'
import { getRefundReviewUnits, type RefundReviewErrors } from '../utils/refundReview'

type RefundReviewProps = {
  order: OrderJson
  draft: RefundDraft
  errors?: RefundReviewErrors
  onReasonChange: (reason: RefundReason | '') => void
  onChannelChange: (channel: RefundChannel) => void
  onConfirm: FormEventHandler<HTMLFormElement>
}

export function RefundReview({ order, draft, errors, onReasonChange, onChannelChange, onConfirm }: RefundReviewProps) {
  const units = getRefundReviewUnits(order, draft.selection)

  return (
    <div className="grid gap-5">
      <section aria-labelledby="refund-selected-items-heading" className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 id="refund-selected-items-heading" className="text-sm font-semibold text-slate-800">Selected items</h3>
        <ul className="mt-3 divide-y divide-slate-100">
          {units.map((unit) => (
            <li key={unit.unitId} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold leading-5 text-slate-800">{unit.itemName}</h4>
                  <p className="mt-1 text-xs text-slate-500">Unit {unit.unitId} · base price</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-800">{formatMoney(unit.itemUnitPrice, order.currency)}</span>
              </div>
              {unit.addOns.length > 0 && (
                <ul aria-label={`Selected add-ons for ${unit.unitId}`} className="mt-2 ml-3 grid gap-2 border-l border-slate-200 pl-3">
                  {unit.addOns.map((addOn) => (
                    <li key={JSON.stringify([unit.unitId, addOn.addon_id])} className="flex items-start justify-between gap-4 text-xs text-slate-600">
                      <span className="min-w-0 [overflow-wrap:anywhere]">{addOn.name}</span>
                      <span className="shrink-0 font-medium">{formatMoney(addOn.unit_price, order.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {draft.selection.includeDeliveryFee && (
          <div className={`flex justify-between gap-4 text-sm text-slate-700 ${units.length > 0 ? 'mt-3 border-t border-slate-200 pt-3' : 'mt-3'}`}>
            <span>Delivery fee</span>
            <strong>{formatMoney(order.delivery_fee, order.currency)}</strong>
          </div>
        )}
      </section>

      <form id="refund-review-form" onSubmit={onConfirm} noValidate className="grid gap-5 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label htmlFor="refund-reason" className="block text-sm font-semibold text-slate-800">Refund reason <span className="font-normal text-slate-500">(required)</span></label>
          <select
            id="refund-reason"
            name="refundReason"
            required
            value={draft.reason}
            aria-invalid={Boolean(errors?.reason)}
            aria-describedby={errors?.reason ? 'refund-reason-error' : undefined}
            onChange={(event) => onReasonChange(refundReasons.find((reason) => reason === event.currentTarget.value) ?? '')}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 aria-invalid:border-red-500"
          >
            <option value="" disabled>Select a reason</option>
            {refundReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
          </select>
          {errors?.reason && <p id="refund-reason-error" role="alert" className="mt-2 text-xs text-red-700">{errors.reason}</p>}
        </div>

        <fieldset role="radiogroup" aria-required="true" aria-describedby={errors?.channel ? 'refund-channel-error' : undefined}>
          <legend className="text-sm font-semibold text-slate-800">Refund channel <span className="font-normal text-slate-500">(required)</span></legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {refundChannels.map((channel) => (
              <label key={channel.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${draft.channel === channel.value ? 'border-brand-600 bg-brand-50 text-brand-950' : 'border-slate-300 text-slate-700'}`}>
                <input
                  type="radio"
                  name="refundChannel"
                  value={channel.value}
                  checked={draft.channel === channel.value}
                  required
                  aria-invalid={Boolean(errors?.channel)}
                  aria-describedby={errors?.channel ? 'refund-channel-error' : undefined}
                  onChange={() => onChannelChange(channel.value)}
                  className="size-4 shrink-0 accent-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                />
                {channel.label}
              </label>
            ))}
          </div>
          {errors?.channel && <p id="refund-channel-error" role="alert" className="mt-2 text-xs text-red-700">{errors.channel}</p>}
        </fieldset>
      </form>
    </div>
  )
}
