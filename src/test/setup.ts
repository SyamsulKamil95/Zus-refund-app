import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { server } from '../mocks/node'
import { mockRuntime } from '../mocks/runtime'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => mockRuntime.reset(0))
afterEach(() => { cleanup(); server.resetHandlers() })
afterAll(() => server.close())
