import zusCoffeeLogo from '../../assets/images/zus-coffee-logo.png'

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="footer-main">
          <div className="footer-identity">
            <div className="footer-brand">
              <img src={zusCoffeeLogo} alt="" width={40} height={40} />
              <span className="text-wordmark">ZUS <span className="footer-brand-subtitle text-caption">COFFEE</span></span>
            </div>
            <p className="footer-title text-note">Operations Back Office</p>
            <p className="footer-description text-label">Streamlined order management and refund processing.</p>
          </div>
          <div className="footer-context">
            <p className="footer-title text-body">Refund Management</p>
            <span className="footer-demo-label text-detail">Technical Assessment Demo</span>
          </div>
        </div>
        <div className="footer-bottom text-detail">
          <span>© {new Date().getFullYear()} ZUS Coffee</span>
          <span>Operations Back Office</span>
        </div>
      </div>
    </footer>
  )
}
