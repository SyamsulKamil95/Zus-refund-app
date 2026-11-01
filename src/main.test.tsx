import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'

const { startMockWorker, createRoot, render } = vi.hoisted(() => {
  const render = vi.fn()
  return { startMockWorker: vi.fn<() => Promise<void>>(), createRoot: vi.fn(() => ({ render })), render }
})

vi.mock('./mocks/browser', () => ({ startMockWorker }))
vi.mock('react-dom/client', () => ({ default: { createRoot } }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  document.body.innerHTML = '<div id="root"></div>'
})

describe('demo startup', () => {
  it('waits for the worker before mounting React and starting order loading', async () => {
    let ready!: () => void
    startMockWorker.mockImplementation(() => new Promise((resolve) => { ready = resolve }))
    await import('./main')
    await waitFor(() => expect(startMockWorker).toHaveBeenCalledTimes(1))
    expect(createRoot).not.toHaveBeenCalled()
    ready()
    await waitFor(() => expect(render).toHaveBeenCalledTimes(1))
  })

  it('announces startup failure and never mounts the API-loading application', async () => {
    startMockWorker.mockRejectedValue(new Error('Worker unavailable'))
    await import('./main')
    await waitFor(() => expect(document.getElementById('root')).toHaveAttribute('role', 'alert'))
    expect(document.getElementById('root')).toHaveTextContent('The demo API could not start.')
    expect(createRoot).not.toHaveBeenCalled()
  })
})
