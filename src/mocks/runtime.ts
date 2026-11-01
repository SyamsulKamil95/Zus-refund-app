import { order } from '../data/order'
import { shouldFailNextRefund } from '../dev/mockRefundFailure'
import { createMockControls } from './mockConfig'
import { createMockOrderService } from './mockOrderStore'

// Both HTTP handlers share this one authoritative service/store instance.
export const mockRuntime = {
  service: createMockOrderService(order),
  controls: createMockControls({ failNextRefund: typeof window !== 'undefined' && shouldFailNextRefund(window.location.search) }),
  reset(latencyMs = 0) {
    this.service = createMockOrderService(order)
    this.controls.reset({ latencyMs })
  },
}
