# Phase 7 Final QA — fetch and MSW

Audit date: **1 November 2026, Asia/Kuala_Lumpur**. Scope: current repository, native-fetch clients, MSW browser/Node integration, mock store, calculation engine, all refund steps, accessibility, responsive layouts, documentation, and production preview. No deployment, commit, or push was performed.

## A. Overall assessment readiness

**Ready for GitHub submission and Phase 8 deployment preparation as a mock assessment demo**, with the manual acceptance checks in section G carried forward. No critical blocker was found in the implemented scope after fixes. This is not approval for real payment processing or a complete WCAG/security certification.

The MSW migration is complete in the inspected execution path: React calls the native-fetch client; browser MSW handles both endpoints through one authoritative mock service/store; the Node server uses the same handlers in tests. Browser verification confirmed operation in development **and production preview without a backend**. The fixture is not used as temporary order UI before GET completes.

## B. Issues found and severity

| Severity | Finding and evidence | Result |
| --- | --- | --- |
| Critical | None identified in the reviewed scope. | No unresolved critical blocker. |
| Major | Demo visibility required both DEV and the query parameter. Production could never expose the documented tools; the baseline run failed its existing configuration test (96 passed, 1 failed). | Restored DEV **or** explicit `?demoTools=1`, gated by demo mode. Existing test and actual production opt-in now pass. |
| Minor | The fetch client accepted any 2xx status, including a receipt-shaped HTTP 202 as completed. Current handlers use 201, but a response-contract regression could announce completion incorrectly. A new test reproduced this. | Require GET 200 and refund POST 201. Unsupported successful statuses reject before completion. |
| Minor | Aborting during response JSON streaming was reclassified as invalid JSON. A new test reproduced `ApiError` instead of `AbortError`. | Preserve the signal's abort reason during/after JSON parsing. |
| Minor | Unit status labels/counts had contrast of approximately 3.10:1/2.39:1 on white; the product count was 4.12:1 on its background. | Reused the existing muted color: 5.65:1 for unit labels, 4.81:1 for product count. Layout unchanged. |
| Minor | Missing coverage for worker readiness/failure, real fetch remaining pending, and network failure/retry. | Added six focused regression/integration cases overall; retained all existing tests. |
| Minor | README still described production preview as unverified and listed the older 97-test result. | Updated to the current evidence and 103-test breakdown. |
| Verification gap | The reported Chrome 200 OK entry with an unavailable DevTools response body was not reproduced in the native Network panel. | Still a manual check, not claimed fixed or explained solely by StrictMode cancellation. |

## C. Focused fixes and changed files

- `src/mocks/mockConfig.ts` — restore documented development/production demo visibility.
- `src/services/orderApi.ts` — enforce the completed-response status contract and preserve streamed-body cancellation.
- `src/services/__tests__/orderApi.test.ts` — two new client regressions for 202 and cancellation.
- `src/services/__tests__/orderHttpApi.test.ts` — exercise the specifically requested `/api/orders/INVALID` 404 path in the existing unknown-order case.
- `src/features/refund/__tests__/refundWorkflow.test.tsx` — real pending fetch/loading/duplicate/dismissal protection and deterministic MSW network failure with retry.
- `src/main.test.tsx` — worker readiness blocks React mounting; failed startup announces an error and never mounts the API-loading app.
- `src/styles.css` — small contrast corrections for existing labels/counts.
- `README.md` and `QA_REPORT.md` — accurate behavior, results, limitations, and verification instructions.

No dependencies were added, no UI layout was redesigned, and no calculator/business rules were rewritten. `order.json` is byte-for-byte unchanged: SHA-256 `AF29D9801B83E5B335C0C5AC5AC5559ECB3B7337071E869F9AB34EA522EE0EDE`.

## D. Automated results

| Area | Classification | Passing tests |
| --- | --- | ---: |
| Refund calculator | Unit | 17 |
| Order calculator | Unit | 2 |
| Legacy development flag | Unit | 2 |
| Demo configuration | Unit | 4 |
| Isolated mock service/store | Unit | 23 |
| Fetch response contract | Unit | 2 |
| MSW HTTP/client integration | Integration | 19 |
| Order page | React integration | 4 |
| Selection/review | React integration | 16 |
| Complete refund workflow | React integration | 12 |
| Worker startup boundary | Startup integration | 2 |
| **Total** | **50 unit + 53 integration** | **103** |

All **11 test files pass**, with **0 failed tests**. All prior 97 cases remain, including the 17 calculator tests. Tests reset handlers/store/receipts/scenarios and clean up React. Main scenarios use actual source data; altered edge fixtures clone it. Delays are zero/controlled in HTTP tests; isolated service latency tests use fake timers. No random failure rate or test-order dependence was introduced.

- `npm run test:run` — passed; JSON reporter recorded 103/103.
- `npm run build` — passed, including strict TypeScript build diagnostics and Vite bundling.
- `npm run lint` — passed without errors/warnings.
- `npm run preview -- --host 127.0.0.1 --port 4180 --strictPort` — production browser journeys passed. This was local preview, not deployment.
- The preview served `mockServiceWorker.js` as JavaScript with HTTP 200; its content exactly matched the generated source worker.

## E. API, calculation, and retry verification

| Case | Result/evidence |
| --- | --- |
| GET supplied order | 200 JSON snapshot; HTTP tests and development/preview browser logs |
| GET `/api/orders/INVALID` | 404; HTTP/client integration test |
| Valid POST | 201 with authoritative receipt; tests and both browser modes |
| Malformed JSON/shape or path mismatch | 400; HTTP tests |
| Invalid/refunded/orphan/duplicate/unknown selection or unsupported reason/channel | 422; service/HTTP tests; UI error test retains the draft |
| Simulated service failure | 503; HTTP tests and production-preview failure/retry journey |
| Concurrent POSTs | One commit; overlapping request returns 409; HTTP/service tests |
| Identical successful request ID | Receipt replay, no extra commit; changed payload returns 409 |
| New request for refunded unit/delivery | 422; unit unavailable in refreshed UI |
| Network failure | `HttpResponse.error()` in MSW Node integration preserves the draft/order and allows retry; no browser toggle was added |
| Abort | Fetch signal forwarded; in-flight service abort releases lock/no commit; streamed-body abort keeps AbortError |
| Client-provided total | Ignored; API recalculates using the shared pure engine |

Browser and automated verification distinguish the final POST from opening confirmation: opening/Cancel/Escape do not submit. Loading appears until 201, blocks repeated submission/dismissal, and cannot announce success early. A controlled real fetch test confirms this independently of timer duration.

The default valid response delay is **1000 ms**, with **3000 ms** selected through the existing panel. The default service delay is checked with controlled timers. The production browser exercised the slow setting: loading/disabled controls remained visible, then 503 appeared. Failure consumed the one-shot setting, retained all five units/three add-ons/delivery/reason/channel, and returned the following request to normal mode. Retry created one RM59.00 refund and triggered a new GET; both dialogs closed and focus returned to Refund.

After 201, React refreshes through GET and does not fabricate statuses from the draft or install the POST snapshot. Refresh errors/stale versions hide old details and allow GET-only retry; an existing integration test checks no second POST occurs. The historical RM89.30 purchase total stays unchanged.

| Actual source-data selection | Expected and verified |
| --- | ---: |
| L1-2 + Extra Shot | RM15.90 |
| L2-1 + both add-ons | RM14.40 |
| L3-1 | RM7.90 |
| Established partial selection plus delivery | RM43.20 |
| All eligible remaining units/add-ons/delivery | RM59.00 |

All calculations sum integer minor units; decimal conversion is for display. Composite parent-unit/add-on IDs handle reused add-on IDs. Refunded parents and their paid add-ons remain ineligible. Delivery is optional and cannot be newly refunded twice.

The preview was reloaded after the full refund: the fixture reset and loaded again through GET. A separate RM13.40 parent-plus-Oat-Milk refund then updated those two statuses only. Unselected syrup and delivery stayed paid. L2-2's original refunded-parent/paid-add-on inconsistency remained unchanged. Paid add-ons stranded by an unselected parent refund remain ineligible as documented. The RM77.30 screenshot discrepancy remains documented; RM59.00 is supported by the supplied data.

## F. UI, accessibility, and responsiveness

Actual browser: connected Chromium-based in-app browser. No claim of native Chrome DevTools or other browser-engine acceptance testing.

| Viewport | Order | Selection | Review | Confirmation |
| --- | --- | --- | --- | --- |
| 1440 × 900 | Passed | Passed | Passed | Passed |
| 1024 × 768 | Passed | Passed | Passed | Passed |
| 768 × 1024 | Passed | Passed | Passed | Passed |
| 1280 × 600 | Passed | Passed | Passed | Passed |

All 16 combinations were visually inspected and captured with DOM geometry. No unwanted horizontal overflow, clipped step headings, truncated amounts, or inaccessible footers were found with the supplied data. Selection/review bodies scroll separately; their footer stays visible. At 1280×600, keyboard focus reached the reason/channel controls, body scroll advanced, and outer-dialog scroll remained zero. Long supplied item names wrap.

Accessibility/interaction checks completed through code, RTL, and representative browser keyboard interactions:

- Named/described Radix dialogs; headings and labelled checkboxes/select/radio group.
- Space selected an eligible checkbox; refunded parents/add-ons stayed disabled with explanations even when their payment badge says Paid.
- Required review validation announced errors and focused the missing reason field. Reason/channel have no default; Other requires no explanation.
- Back/Next preserved selection, reason, and channel. Closing/reopening resets the draft (integration tests).
- Confirmation initially focused Cancel. Shift+Tab wrapped to Confirm and Tab returned to Cancel. Escape restored review focus/data. During slow submission, Escape was blocked and buttons disabled.
- Error alerts and loading/success live regions remain present. No screen-reader speech was claimed from DOM inspection.
- Small text-contrast defects were corrected without changing layout; this was representative measurement, not exhaustive WCAG certification.

No console errors or warnings were observed in inspected development/production journeys. Normal MSW request logs recorded GET 200, POST 503/201, and following GET 200. Development StrictMode can produce an aborted/repeated initial GET; final POST is event-driven and was not duplicated.

## G. Remaining manual checks and limitations

1. **Native Chrome DevTools:** record fresh Fetch/XHR requests, inspect payloads and Response/Preview for GET 200, POST 201/422/503. Recheck the user's reported unavailable response body on a 200 entry; that exact panel issue remains unresolved. The IAB console/HTTP tests do not prove native DevTools body visibility.
2. NVDA/VoiceOver speech and navigation, forced-colors, 200% text/zoom, Firefox/Safari, and physical tablet/touch behavior were not exercised. Supplied names were tested; arbitrary extreme content requires separate acceptance testing.
3. Before publishing, verify the intended host's HTTPS, Vite base path, worker JavaScript MIME/scope, and SPA rewrite ordering. Actual hosting is untested because deployment is out of scope.
4. A fresh clean-checkout `npm ci` was not run. The working installed dependency tree passed all commands. The earlier audit's 12 moderate development-tooling advisories were not refreshed or force-fixed; triage them separately.
5. The working tree contains uncommitted/untracked implementation files, including the worker and mocks. Ensure all required source/config/worker files are included in the eventual GitHub submission; no staging/commit/push was done here.
6. In-memory mock state and idempotency records reset on reload/HMR and are not shared across tabs. No real backend/payment/authentication/storage or distributed concurrency is claimed. Aborting a request after a server has committed cannot undo that transaction; durable backend idempotency/reconciliation remains future work.

## H. Final recommendation

Proceed with GitHub submission and Phase 8 planning for the **assessment demo**, carrying section G's checks forward before publishing. The migration, automatic checks, production-preview refund journey, and requested viewport matrix pass after targeted fixes. No Phase 8 work or deployment was started.

---

# Historical pre-MSW audit

The following report is retained for history. Its 71-test count and direct-function API references describe the earlier implementation, not the current results above.

Audit date: 1 November 2026, Asia/Kuala_Lumpur. Scope: the assessment application, including its in-memory mock API. No deployment was performed.

## 1. Assessment readiness

The assessment flow passes the final automated checks and the browser journeys described below. No known critical or major application defects remain from this audit. It is ready for Phase 8 deployment preparation as a mock assessment demo, with the manual acceptance checks and deliberate backend limitations recorded below.

## 2. Findings by severity

| Severity | Finding | Resolution |
| --- | --- | --- |
| Critical | None identified in the reviewed scope. | No claim of an exhaustive security or accessibility certification. |
| Major | A request cancelled after its latency timer resolved could still commit before the awaiting function resumed. A new regression test reproduced the incorrect successful commit. | Added a second `AbortSignal` check after the delay, before reading/committing order state. The test now passes and verifies version 0/order data are preserved. |
| Major | Several normal-text order labels had insufficient contrast, and the loading button inherited a dark disabled text color on its dark background. | Darkened muted text and refunded badges; kept loading text white at full opacity. Representative old label contrasts were 2.38–3.44:1. Corrected muted text is approximately 5.21:1 on the canvas and 5.65:1 on white; the refunded badge improved from 4.40:1 to 5.73:1. |
| Minor | Loading had a spinner/busy state but no explicit live status outside the busy content. | Added a screen-reader status message outside the busy details region. Verified its DOM placement and text; actual screen-reader speech still requires manual testing. |
| Minor | Order add-on names used ellipsis/nowrap, which could conceal longer names. | Enabled wrapping for add-on names and safe wrapping for long product names without changing the overall layout. |
| Minor | Request parsing used a post-validation array assertion and forwarded extra add-on object fields. | Replaced it with typed predicates and explicitly copied the two permitted add-on identifier fields. |

## 3. Files changed

- `src/services/mockOrderApi.ts` — cancellation check after latency.
- `src/services/refundRequest.ts` — typed request guards and explicit identifier copies.
- `src/styles.css` — text contrast, loading-button readability, and name wrapping.
- `src/features/refund/components/RefundItemCard.tsx` — readable line/quantity label color.
- `src/features/refund/components/RefundUnitRow.tsx` — long-name wrapping and no-add-on label contrast.
- `src/features/refund/components/RefundReview.tsx` — safe add-on name wrapping.
- `src/features/refund/components/RefundSummary.tsx` — solid readable count text.
- `src/features/refund/components/RefundConfirmationDialog.tsx` — explicit loading announcement and readable disabled submission control.
- `src/services/__tests__/mockOrderApi.test.ts` — cancellation race and complete remaining-refund lifecycle coverage.
- `src/features/refund/__tests__/refundCalculator.test.ts` — explicit croissant value, reused eligible add-on IDs, refunded add-ons, and ambiguous source-ID coverage.
- `src/features/refund/__tests__/refundWorkflow.test.tsx` — loading announcement assertion and another refund after success, including focus restoration.
- `README.md` — runtime requirements, scripts, assumptions, QA references, and future improvements.
- `QA_REPORT.md` — this report.

No dependencies were added. No source order JSON fields or statuses were edited. Its SHA-256 before/after the audit is `AF29D9801B83E5B335C0C5AC5AC5559ECB3B7337071E869F9AB34EA522EE0EDE`.

## 4. Calculation verification

| Selection from the supplied order | Expected | Verified |
| --- | ---: | --- |
| No selection | RM0.00 | Unit and component tests |
| L1-2 + Extra Shot | RM15.90 | Unit/component tests |
| L2-1 + both add-ons | RM14.40 | Unit tests |
| L3-1 | RM7.90 | Explicit refund-unit test and production preview journey |
| L1-2 + Extra Shot, L2-1 + both add-ons, L3-1, delivery | RM43.20 | Unit tests and development browser failure/retry journey |
| All eligible units, eligible add-ons, delivery | RM59.00 | Unit/component/service tests and all four browser viewport review/confirmation checks |

Prices are converted individually to integer sen before summation. UI calculations and authoritative API calculations use the same engine. Decimal conversion is for display. Client-supplied totals are ignored. The historical product subtotal remains RM84.30 and the purchase total RM89.30 after refunds.

Coverage also includes duplicate/unknown unit and add-on IDs in requests, ambiguous source unit/add-on identifiers, add-ons without selected parents, refunded parents with paid add-ons, refunded add-ons on paid parents, delivery inclusion/exclusion, deselecting a parent, and reused add-on IDs across two eligible units. Additional edge fixtures clone the source; the main scenarios use the supplied order.

## 5. Full workflow and API results

The following passed through integration tests and representative real browser interactions:

- Order details load; Refund opens selection; eligible units can be selected independently.
- Add-ons start unchecked and disabled until their parent is selected. Refunded parents and their add-ons stay unavailable.
- Selection, review, and confirmation totals agree. Review requires both reason and channel, with no default channel or required Other text.
- Back preserves selection and review fields. Cancel/Escape in confirmation closes only that dialog and restores review focus/data. Opening confirmation sends no refund request.
- Double-click submission is blocked; Cancel and Escape cannot dismiss a pending confirmation. The service independently rejects concurrent requests.
- The development-only one-shot URL flag produced an error with unchanged order statuses. Back/Next preserved the full draft. Retry completed RM43.20, closed both dialogs, updated selected statuses, and retained RM89.30 as the purchase total.
- The same browser session then allowed a different RM7.90 refund. Previously refunded units and delivery were unavailable. The automated second-refund test also verifies unselected add-ons remain paid and cannot be selected once their parent is refunded.
- Direct API tests reject malformed, unknown, duplicate, orphan, already-refunded, and invalid reason/channel requests. The complete RM59.00 request leaves no eligible units and rejects a subsequent new request for the same units.
- An identical successful idempotency key replays its existing receipt without committing twice; a changed payload using that key is rejected. A new key attempting an already-refunded unit is rejected.
- Aborts and abandoned responses are handled, and an older GET cannot overwrite a newer refund version.

The final production build was also served locally with `?mockRefundFailure=once`. Its first refund succeeded normally, confirming the flag is ignored. The flag string and former checkbox label were absent from compiled JavaScript. No application console errors or warnings were observed in the inspected development/production journeys.

## 6. Accessibility findings

Verified by code inspection, RTL, and browser keyboard interaction:

- Radix titles/descriptions give the selection and nested confirmation dialogs accessible names/descriptions.
- Step headings receive focus. Invalid review submission focuses the reason field first, then the first channel radio when needed.
- Confirmation initially focuses Cancel. Tab/Shift+Tab remain inside it. Escape returns to review when idle and is blocked during submission.
- Successful closure restores focus to the original Refund button. Reopening starts a fresh draft.
- Checkboxes, the native reason select, and radio group have labels. Disabled add-ons explain the parent restriction without rewriting their original payment status.
- Validation/API errors use alerts. Loading exposes a status message outside the busy details region; buttons are disabled during submission.
- Corrected representative text colors meet the normal-text 4.5:1 target on their measured backgrounds. Disabled controls and decorative icons were not treated as normal-text contrast failures.

This was not an exhaustive WCAG audit. Actual NVDA/VoiceOver announcements, forced-colors mode, text zoom, and all control-boundary contrast combinations remain manual acceptance items.

## 7. Responsive browser audit

Actual visual screenshots and DOM geometry were checked in the connected Chromium-based in-app browser, covering 16 viewport/screen combinations:

| Viewport | Order page | Selection | Review | Confirmation |
| --- | --- | --- | --- | --- |
| Desktop 1440 × 900 | Passed | Passed | Passed | Passed |
| Laptop 1024 × 768 | Passed | Passed | Passed | Passed |
| Tablet 768 × 1024 | Passed | Passed | Passed | Passed |
| Short 1280 × 600 | Passed | Passed | Passed | Passed |

For the supplied data, no unwanted horizontal overflow, clipped modal headings, truncated refund amounts, or hidden modal action footers were found. Selection/review bodies scroll independently, including after focusing controls at the bottom; the outer dialog stays at scroll position zero. Long supplied product names wrap, and source add-on names are not clipped. The page itself scrolls vertically as expected.

Wrapping for arbitrary longer/unbroken names was inspected in code rather than tested with changed source data. Other browser engines and physical touch devices were not visually tested. Local screenshots and a 16-entry geometry record were captured during the audit; these are QA artifacts, not application assets.

## 8. Automated test counts and quality

All prior 64 tests were retained. Seven meaningful regression/edge tests were added.

| Test area | Passing tests |
| --- | ---: |
| Refund calculator | 17 |
| Order calculator | 2 |
| Development flag configuration | 2 |
| Mock API service | 23 |
| Refund selection/review components | 16 |
| Complete refund workflow | 9 |
| Order page components | 2 |
| **Total** | **71** |

This is 44 utility/configuration/service tests and 27 React component/integration tests across seven files. Tests create isolated service/store instances, use source-data clones for modified fixtures, clean up React renders, and use fake timers or controlled promises for latency/race checks. No random failure behavior was introduced.

## 9. Build, TypeScript, and lint

- `npm run test:run` — passed, 71/71 tests, 7/7 files. A JSON test report was also generated.
- `npm run build` — passed (`tsc -b` and Vite production bundling).
- `npm run typecheck` — passed with strict TypeScript settings, no diagnostics.
- `npm run lint` — passed with no reported errors or warnings.

Environment: Node 24.12.0, npm 11.7.0. A fresh dependency installation was not rerun during this audit.

## 10. Remaining limitations and tradeoffs

- This is an in-memory single-order assessment mock. Reload clears order/refund/idempotency state; separate page instances do not share durable state.
- No real backend, payment provider, authentication, or durable distributed transaction/idempotency layer is implemented.
- The data contract is completed MYR orders with two-decimal prices, globally unique unit IDs, and unique add-on IDs within each unit.
- L2-2 remains refunded while its add-ons retain paid statuses. They remain ineligible because their parent is refunded. The RM77.30 screenshot still does not reconcile with the supplied data; RM59.00 is the initial supported remaining value.
- A refund of a parent does not silently refund its unselected add-ons. They retain paid statuses but become ineligible through this flow. This business implication requires owner acceptance before real payment use.
- UI totals/validation are derived repeatedly for seven units; no premature memoization or broad refactor was warranted. High-volume performance was not benchmarked.

## 11. Manual verification still required

- Screen-reader speech/navigation with NVDA and VoiceOver, especially status/error announcements and nested-dialog transitions.
- Firefox/Safari, physical tablet/touch use, 200% text/zoom, and forced-colors/high-contrast acceptance checks.
- A clean checkout/install (`npm ci`) and the intended hosting environment's preview/build smoke test.
- Business-owner approval of unselected add-on handling, plus real backend/security/payment acceptance testing if the application progresses beyond the mock assessment.

## 12. Phase 8 decision

Ready to proceed to Phase 8 preparation for deployment of the assessment demo, with these manual checks and mock limitations carried forward. This report does not approve real financial production processing or claim full assistive-technology/browser coverage. No deployment was started and no public deployment URL is claimed.
