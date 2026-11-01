import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles.css'
import { demoMode } from './mocks/mockConfig'

async function bootstrap() {
  if (demoMode) {
    const { startMockWorker } = await import('./mocks/browser')
    await startMockWorker()
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void bootstrap().catch(() => {
  const root = document.getElementById('root')
  if (root) {
    root.setAttribute('role', 'alert')
    root.textContent = 'The demo API could not start. Reload the page and check that mockServiceWorker.js is served over HTTPS or localhost.'
  }
})
