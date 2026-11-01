import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldFailNextRefund } from './mockRefundFailure'

afterEach(() => vi.unstubAllEnvs())

describe('development refund failure configuration', () => {
  it('requires the explicit one-shot URL flag in development', () => {
    vi.stubEnv('DEV', true)
    expect(shouldFailNextRefund('?mockRefundFailure=once')).toBe(true)
    expect(shouldFailNextRefund('')).toBe(false)
    expect(shouldFailNextRefund('?mockRefundFailure=false')).toBe(false)
  })

  it('ignores the URL flag outside development', () => {
    vi.stubEnv('DEV', false)
    expect(shouldFailNextRefund('?mockRefundFailure=once')).toBe(false)
  })
})
