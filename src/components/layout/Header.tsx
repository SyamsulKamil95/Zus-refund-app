import { ChevronRight, LayoutDashboard } from 'lucide-react'
import zusCoffeeLogo from '../../assets/images/zus-coffee-logo.png'

export function Header() {
  return (
    <header className="backoffice-header">
      <a className="backoffice-brand" href="#main-content" aria-label="ZUS Coffee back office home">
        <div className="footer-brand">
          <img src={zusCoffeeLogo} alt="" width={40} height={40} />
          <span className="text-wordmark">ZUS <span className="footer-brand-subtitle text-caption">COFFEE</span></span>
        </div>
        <span className="brand-divider" aria-hidden="true" />
        <span className="brand-context text-label">Back office</span>
      </a>
      <nav className="breadcrumb text-note max-[600px]:text-label" aria-label="Breadcrumb">
        <span>Orders</span>
        <ChevronRight size={14} aria-hidden="true" />
        <span>Order details</span>
      </nav>
      <div className="header-role text-label"><LayoutDashboard size={15} aria-hidden="true" /><span>Operations</span></div>
    </header>
  )
}
