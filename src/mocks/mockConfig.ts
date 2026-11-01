export const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false'

export function showDemoTools(search: string): boolean {
  return demoMode && (import.meta.env.DEV || new URLSearchParams(search).get('demoTools') === '1')
}

interface MockScenario { latencyMs: number; failNextRefund: boolean }

export function createMockControls(initial: Partial<MockScenario> = {}) {
  let normalLatencyMs = initial.latencyMs ?? 1000
  let state: MockScenario = { latencyMs: 1000, failNextRefund: false, ...initial }
  const listeners = new Set<() => void>()
  function update(next: MockScenario) { state = next; listeners.forEach((listener) => listener()) }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => state,
    setLatency(latencyMs: 1000 | 3000) { update({ ...state, latencyMs }) },
    armFailure(armed = true) { update({ ...state, failNextRefund: armed }) },
    takeRefundScenario() {
      const scenario = state
      if (state.failNextRefund) update({ latencyMs: normalLatencyMs, failNextRefund: false })
      return scenario
    },
    reset(next: Partial<MockScenario> = {}) {
      normalLatencyMs = next.latencyMs ?? 1000
      update({ latencyMs: normalLatencyMs, failNextRefund: false, ...next })
    },
  }
}
