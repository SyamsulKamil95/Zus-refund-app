export function shouldFailNextRefund(search: string): boolean {
  return import.meta.env.DEV && new URLSearchParams(search).get('mockRefundFailure') === 'once'
}
