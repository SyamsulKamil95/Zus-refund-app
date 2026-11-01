import type { ReactNode } from 'react'
import { AppFooter } from './AppFooter'
import { Header } from './Header'

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="backoffice-app">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header />
      <main id="main-content" className="app-main">
        {children}
      </main>
      <AppFooter />
    </div>
  )
}
