import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export async function startMockWorker() {
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledFrame({ frame, defaults }) {
      if (typeof frame.data === 'object' && frame.data !== null &&
        'request' in frame.data && frame.data.request instanceof Request &&
        new URL(frame.data.request.url).pathname.includes('/api/')) defaults.error()
    },
  })
}
