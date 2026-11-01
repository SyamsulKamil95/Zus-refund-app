import { ChevronRight, LayoutDashboard } from 'lucide-react'
import zusCoffeeLogo from '../../../assets/images/zus-coffee-logo.png'

export function OrderHeader() {
  return (
    <header className="backoffice-header">
      <a className="backoffice-brand" href="#main-content" aria-label="ZUS Coffee back office home">
        <img className="backoffice-brand-logo" src={zusCoffeeLogo} alt="ZUS Coffee logo" width={32} height={32} />
        <span>ZUS<span className="brand-subtitle">COFFEE</span></span>
        <span className="brand-divider" aria-hidden="true" />
        <span className="brand-context">Back office</span>
      </a>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span>Orders</span>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">Order details</span>
      </nav>
      <div className="header-role"><LayoutDashboard size={15} aria-hidden="true" /><span>Operations</span></div>
    </header>
  )
}
