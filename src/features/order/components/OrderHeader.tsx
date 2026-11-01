import { Coffee, ChevronRight, LayoutDashboard } from 'lucide-react'

export function OrderHeader() {
  return (
    <header className="backoffice-header">
      <a className="backoffice-brand" href="#main-content" aria-label="ZUS Coffee back office home">
        <span className="backoffice-brand-icon"><Coffee size={19} strokeWidth={2.1} aria-hidden="true" /></span>
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
