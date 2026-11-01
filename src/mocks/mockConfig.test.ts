import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockControls, showDemoTools } from './mockConfig'

afterEach(() => vi.unstubAllEnvs())

describe('demo mock controls', () => {
  it.each([true, false])('requires explicit opt-in to show tools when DEV=%s', (isDevelopment) => {
    vi.stubEnv('DEV', isDevelopment)
    expect(showDemoTools('')).toBe(false)
    expect(showDemoTools('?demoTools=0')).toBe(false)
    expect(showDemoTools('?demoTools=1')).toBe(true)
  })

  it('does not show mock tools when demo mode is explicitly disabled', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    vi.resetModules()
    const config = await import('./mockConfig')
    expect(config.demoMode).toBe(false)
    expect(config.showDemoTools('?demoTools=1')).toBe(false)
  })

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
})
