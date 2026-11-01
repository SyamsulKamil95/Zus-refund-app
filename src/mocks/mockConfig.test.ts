import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockControls, showDemoTools } from './mockConfig'

afterEach(() => vi.unstubAllEnvs())

describe('demo mock controls', () => {
  it('supports normal and slow latency without submitting requests', () => {
    const controls = createMockControls()
    expect(controls.getSnapshot()).toEqual({ latencyMs: 1000, failNextRefund: false })
    controls.setLatency(3000)
    expect(controls.takeRefundScenario()).toEqual({ latencyMs: 3000, failNextRefund: false })
    expect(controls.getSnapshot().latencyMs).toBe(3000)
    controls.setLatency(1000)
    expect(controls.getSnapshot().latencyMs).toBe(1000)
  })

  it('consumes a failure once and returns the next request to the normal scenario', () => {
    const controls = createMockControls()
    controls.setLatency(3000)
    controls.armFailure()
    expect(controls.takeRefundScenario()).toEqual({ latencyMs: 3000, failNextRefund: true })
    expect(controls.takeRefundScenario()).toEqual({ latencyMs: 1000, failNextRefund: false })
  })

  it('allows a failure to be disarmed and test delays to be controlled', () => {
    const controls = createMockControls({ latencyMs: 0 })
    controls.armFailure()
    controls.armFailure(false)
    expect(controls.takeRefundScenario()).toEqual({ latencyMs: 0, failNextRefund: false })
  })

  it('shows tools in development and requires an explicit opt-in in production', () => {
    vi.stubEnv('DEV', true)
    expect(showDemoTools('')).toBe(true)
    vi.stubEnv('DEV', false)
    expect(showDemoTools('')).toBe(false)
    expect(showDemoTools('?demoTools=0')).toBe(false)
    expect(showDemoTools('?demoTools=1')).toBe(true)
  })
})
