import { useSyncExternalStore } from 'react'
import { mockRuntime } from './runtime'

export function DemoToolsPanel() {
  const controls = mockRuntime.controls
  const scenario = useSyncExternalStore(controls.subscribe, controls.getSnapshot)
  return (
    <aside aria-label="Demo API testing tools" className="mt-5 rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-700">
      <p className="font-semibold">Demo API tools · MSW mock backend</p>
      <p className="mt-1 text-xs text-slate-600">Test controls only. Changing a scenario does not submit a refund or change order data.</p>
      <fieldset className="mt-3 flex flex-wrap gap-4">
        <legend className="mb-2 text-xs font-semibold">Response speed</legend>
        {[{ value: 1000, label: 'Normal response (~1000 ms)' }, { value: 3000, label: 'Slow response (~3000 ms)' }].map(({ value, label }) => (
          <label key={value} className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="mockLatency" checked={scenario.latencyMs === value} onChange={() => controls.setLatency(value === 3000 ? 3000 : 1000)} className="size-4 accent-brand-700" />{label}
          </label>
        ))}
      </fieldset>
      <label className="mt-3 flex items-center gap-2">
        <input type="checkbox" checked={scenario.failNextRefund} onChange={(event) => controls.armFailure(event.currentTarget.checked)} className="size-4 accent-brand-700" />
        Fail next refund request (HTTP 503)
      </label>
      <p className="mt-2 text-xs text-slate-600" aria-live="polite">{scenario.failNextRefund ? 'One failure is armed. The following request returns to the normal scenario.' : 'No failure is armed.'}</p>
    </aside>
  )
}
