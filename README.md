# ZUS Refund Flow — Phases 1–7

Back-office order details with refund selection, review, confirmation, and HTTP mock submission. Built with React, strict TypeScript, Vite, Tailwind CSS v4, Radix Dialog, Lucide React, MSW, Vitest, and React Testing Library. This assessment demo does not process payments and has not been deployed.

## Run locally

Use **Node.js 22.12.0 or later** (required by MSW 3 and the current toolchain). Verification used Node 24.12.0 and npm 11.7.0.

```sh
npm ci
npm run dev
```

Use the URL printed by Vite. Windows PowerShell users whose execution policy blocks `npm.ps1` can use `npm.cmd` without changing execution policy.

```sh
npm run test:run   # one deterministic Vitest run
npm test           # also runs once
npm run test:watch
npm run typecheck
npm run lint
npm run build
npm run preview   # serves dist locally; no backend needed
```

## Architecture

The default brand color is **#16277A**, sampled from the supplied reference. Shared Tailwind v4 `brand` palette tokens in `src/styles.css` style buttons, selection controls, focus states, summaries, and status badges throughout the app.

Typography uses Tailwind `text-*` utilities throughout the components, including responsive variants. The `@theme` block in `src/styles.css` defines the shared scale: named utilities such as `text-caption`, `text-body`, `text-section`, and `text-page` preserve the dashboard's existing sizes alongside the refund flow's `text-xs`/`text-sm` scale. There are no component-specific `font-size` declarations or arbitrary pixel text utilities. To increase all app text by 2px, set `--app-font-size-adjustment: 2px` in `:root`; it defaults to `0px`. This adjusts every text token without changing the root size that controls rem-based spacing. Change an individual `--text-*` theme token to adjust one typography role throughout the app.

The optional ISO `order_date` is validated in the data layer and displayed from the fetched order as a semantic `time` element. Formatting uses `en-MY` and `Asia/Kuala_Lumpur`, with an explicit MYT label. Orders without a date retain the "Not provided" fallback.

`src/components/layout/AppLayout.tsx` accepts React children and owns the shared header, skip link, main content container, and footer. `src/app/App.tsx` renders `<AppLayout><OrderPage /></AppLayout>`, keeping page content and refund state in `OrderPage`. `AppFooter.tsx` uses the existing logo and a dynamic year. The layout uses a minimum-height flex column; the footer follows `main` in normal document flow, including after demo tools. Header, main, and footer share a centered 1220px container. Existing brand tokens are supplemented by small surface, radius, border, and shadow tokens in `src/styles.css`. Metadata, item details, badges, and totals use a readable compact type scale, with reduced-motion support and navy focus/selection states.

The UI polish was visually checked in the Chromium in-app browser at 1440×900, 1024×768, 768×1024, 1280×600, and 390×844 across the page, selection, review, and confirmation views. The footer adapts to stacked mobile content, the summary stacks below 900px, and dialog bodies scroll independently of their actions. A production-preview failure/retry journey confirmed HTTP 503 preserves the draft and HTTP 201 triggers GET refresh with the historical total unchanged. Pending submission keeps focus on the confirmation dialog while buttons are disabled; the existing integration test covers this. Screen-reader speech and other browser engines still require manual acceptance checks.

```text
React components / hooks
  → src/services/orderApi.ts (native fetch, JSON validation, ApiError, AbortSignal)
  → GET /api/orders/:orderId or POST /api/orders/:orderId/refunds
  → src/mocks/handlers.ts (MSW HTTP handlers and status codes)
  → src/mocks/mockOrderStore.ts (validation, locking, atomic commit, receipts)
  → shared refund calculation and immutable order store
```

- `src/data/order.json` is the unchanged source fixture. `src/data/order.ts` validates its shape and exposes that validator for HTTP responses.
- `src/features/order` contains order types, display components, total/formatting utilities, the versioned store primitive, and the GET-loading hook.
- `src/features/refund` contains the pure calculator/validators, selection reducer, selection/review/confirmation components, and submission hook.
- `src/services/orderApi.ts` implements the existing `OrderApi` contract. Both methods use native `fetch()`, parse JSON, check HTTP status, and convert errors into typed `ApiError` values. React hooks do not call the mock store directly. No Axios dependency is used.
- `src/services/orderApi.types.ts` defines the contract; `refundRequest.ts` performs runtime request parsing at the mock boundary.
- `src/mocks/runtime.ts` owns **one** mock service/store shared by GET and POST handlers. It starts from a deep clone, reads return copies, and commits are atomic. React holds a fetched snapshot, not another authoritative store.
- `src/mocks/browser.ts` starts the browser worker. `src/mocks/node.ts` uses `setupServer()` with the same handlers in Vitest. Tests reset handlers, store, receipts, and scenarios between cases, using zero or controlled delays.

The old `src/services/mockOrderApi.ts` moved behind MSW as `src/mocks/mockOrderStore.ts`. Its validation/calculation/status-update behavior is reused rather than duplicated.

## MSW locally and in the deployed demo

MSW gives this backend-free demo an HTTP boundary inspectable in DevTools. The current MSW 3 API uses `http`/`HttpResponse` from `msw/http`, `delay` from `msw/utils/delay`, `setupWorker` from `msw/browser`, and `setupServer` from `msw/node`.

**`VITE_DEMO_MODE` defaults to `true`, including production builds.** `.env.example` documents the setting; copying it is optional. This intentionally supports the hosted assessment. `src/main.tsx` **awaits worker startup before mounting React**, so the first GET is intercepted. Startup failure displays an error instead of loading against a nonexistent backend.

`public/mockServiceWorker.js` is generated by the official CLI and copied to `dist/mockServiceWorker.js` by Vite. Keep it in source control and serve it as JavaScript over HTTPS or localhost. Its URL and the default API base respect Vite's `BASE_URL`, including a configured hosting subdirectory. Unknown `/api/*` endpoints return mocked JSON 404s. The host must serve the worker before any SPA fallback rewrites it to HTML.

After upgrading MSW, regenerate the matching worker:

```sh
npm exec msw init public -- --save
```

Official references: [browser integration](https://mswjs.io/guides/integrations/browser), [Node integration](https://mswjs.io/guides/integrations/node).

## HTTP endpoints

| Method | Path | Success response |
| --- | --- | --- |
| GET | `/api/orders/:orderId` | **200**, `{ order, version }` |
| POST | `/api/orders/:orderId/refunds` | **201**, `{ order, version, refund }` |

These browser requests are intercepted by MSW, not server routes. Command-line curl does not use the browser service worker. Node tests intercept fetch using MSW's Node integration.

Example POST body (no client-calculated amount is needed):

```json
{
  "requestId": "e641ec03-6baf-4d76-8e5d-4c45122c3d37",
  "orderId": "ORD-10482",
  "selection": {
    "selectedUnitIds": ["L1-2"],
    "selectedAddOns": [{ "unitId": "L1-2", "addonId": "A1" }],
    "includeDeliveryFee": false
  },
  "reason": "Quality issue",
  "channel": "in-app-credit"
}
```

HTTP 201 JSON response, abbreviated to omit the full order:

```ts
{
  order: updatedOrder, // complete OrderJson
  version: 1,
  refund: {
    refundId: 'RF-1',
    requestId: 'e641ec03-6baf-4d76-8e5d-4c45122c3d37',
    orderId: 'ORD-10482',
    currency: 'MYR',
    amountMinorUnits: 1590
  }
}
```

Example HTTP 422 JSON response:

```json
{
  "error": {
    "code": "INVALID_REFUND_SELECTION",
    "message": "The selected items are no longer eligible for refund. Review your selection.",
    "details": ["Unit L1-2 has already been refunded."]
  }
}
```

| HTTP status | Meaning |
| --- | --- |
| 200 | Order fetched |
| 201 | Refund created (or existing idempotent receipt replayed) |
| 400 | Malformed JSON/structure or path/body order mismatch |
| 404 | Unknown order or endpoint |
| 409 | Overlapping refund or request ID reused for different details |
| 422 | Invalid, unknown, duplicate, refunded, orphan, or empty selection; unsupported reason/channel |
| 503 | One-shot simulated service unavailable |

The fetch client retains status/code/details on `ApiError`; the UI distinguishes eligibility errors from temporary service failure. Malformed success payloads are rejected instead of rendered. Network errors also stop loading and allow retry. An aborted handler may internally return 499, while an aborted client fetch rejects with `AbortError`.

## Calculation and state behavior

- UI and API validation share `prepareRefundConfirmation` and Phase 3's `calculateRefundTotal`/`validateRefundSelection`. The API validates **current** state after the delay and recalculates the authoritative amount. Extra client total fields are ignored.
- Money arithmetic uses integer minor units (sen). Decimal conversion happens for display only. Prices and eligibility come from the order data.
- Add-ons use composite parent-unit/add-on identifiers. Only paid parents, their selected paid add-ons, and explicitly selected paid delivery are eligible. Selecting a parent never selects add-ons automatically; deselecting it clears its selected add-ons.
- Initial loading renders no temporary fixture data. GET errors provide Retry.
- HTTP 201 closes both dialogs, announces the receipt amount, and triggers a **new GET** for authoritative status display. React does not fabricate statuses or install the POST order snapshot. If refresh fails or returns an older version, the receipt remains, stale details are hidden, and Retry repeats GET without another POST.
- Only selected units/add-on instances and explicitly selected delivery change to refunded. Historical prices/totals and unrelated statuses stay unchanged.
- Failed POSTs do not commit changes, close dialogs, or show success. The complete draft remains available for retry or return to review.
- A synchronous client guard prevents repeated clicks before React rerenders. A store lock prevents overlapping POST commits. An identical completed request ID replays its receipt **without processing twice**; changing its payload returns 409. A new request for an already-refunded unit returns 422.
- Fetch and mock delays accept `AbortSignal`. Hooks abort abandoned work and ignore stale responses. Cancellation is checked before commit; browser cancellation after commit cannot undo it. Versions and request-sequence checks protect GET state.

## Demo testing controls

The **Demo API tools · MSW mock backend** panel sits below the Order page, outside the refund dialogs. It appears automatically in development. In a production build or hosted assessment, opt in with **`?demoTools=1`**. Without the parameter, production shows the normal interface while MSW still handles API requests.

1. **Normal response (~1000 ms):** default GET/POST delay.
2. **Slow response (~3000 ms):** select before opening the refund flow. The final Confirm button displays a spinner/loading label; repeat submission and dismissal are disabled. The subsequent GET refresh also uses this delay.
3. **Fail next refund request (HTTP 503):** arm before opening the flow, then submit. The next parsed POST consumes the flag once and returns HTTP 503 for an otherwise valid request without changing order data. The following scenario resets to normal latency/no failure; retry succeeds. GETs and cancelling confirmation do not consume it. Invalid requests can still return their validation status first.

Changing settings does not submit or change order data. Pending requests retain their captured scenario. Shape-validation and lock errors may return immediately. There are no random failures. Tests control latency separately to avoid waiting 1–3 seconds per case.

The previous `?mockRefundFailure=once` shortcut remains supported **in development only**; the panel is preferred. HTTP 422 is reproducible by sending an invalid selection to the mock POST (covered by HTTP tests); the UI blocks known-invalid drafts.

## Chrome DevTools inspection

1. Open **DevTools → Network → Fetch/XHR** before reloading.
2. Reload and select `ORD-10482`: inspect GET, status 200, and the JSON snapshot.
3. Complete selection/review/confirmation. Select `refunds`: inspect POST, Request Payload, HTTP 201, and the receipt in Response. A following GET refreshes the order.
4. Enable slow response or one-shot failure and repeat: inspect pending POST or HTTP 503. Retry returns 201 followed by GET 200.

Chrome may label responses as coming from a ServiceWorker; this is expected. React StrictMode in development may start/abort an initial GET and issue another. POST runs only from final confirmation, never from an effect. Production does not replay that StrictMode effect.

If Chrome says **Failed to load response data** on a **200 OK** entry, distinguish that completed request from the separate cancelled StrictMode request. Clear the Network list, temporarily turn off Preserve log, reload with DevTools open, and inspect the fresh completed entry. The application parses/validates JSON before displaying the order. The previously reported missing DevTools response body has not been reproduced or resolved by this audit; verify it in the evaluator's Chrome version. MSW browser logs and HTTP tests confirm responses, but are not a substitute for checking that Response panel.

## Selection, review, and accessibility

Both steps remain in the existing Radix dialog. The reducer stores selection/reason/channel and derives totals. Back preserves the draft; closing the outer modal discards it. Reopening starts empty. The labelled reason select is native because Radix Select is not installed; required channel radios have no default. Other needs no free-text explanation.

Opening confirmation never submits. Cancel/Escape close only confirmation and restore focus to review. During POST, buttons and dismissal controls are disabled. After successful GET refresh, focus returns to Refund; refresh errors focus Retry. Live status/error regions announce loading, success, and failure. Headers/footers remain outside the scrolling body; earlier clipping and disabled-state fixes are preserved.

## Assumptions and limitations

- The supplied data marks **L2-2's parent refunded while its add-ons remain paid**. Both add-ons are ineligible under the parent rule; their original statuses are preserved.
- All eligible remaining units/add-ons plus delivery total **RM59.00**. The screenshot's **RM77.30** is RM18.30 higher and does not reconcile with the data. The specified partial selection is **RM43.20**. No data/calculation is changed to force a screenshot total.
- Unselected paid add-ons stay paid after their parent refund, then become ineligible and cannot be refunded separately later. This follows the established requirement and needs business clarification for a real product.
- Historical purchase total remains **RM89.30**, independent of refund eligibility.
- The current contract supports completed MYR orders, paid/refunded statuses, and two-decimal prices. Unit IDs must be unique per order; add-on IDs can repeat across parents but must be unique within a parent. Ambiguous IDs are rejected.
- State/receipts live in the page's JavaScript session and reset on full reload (also potentially after hot-module replacement). Tabs do not share a database. No localStorage, authentication, real payments, or distributed transactions are implemented.
- ServiceWorker support and HTTPS or localhost are required. Hosting must serve the worker correctly. Mock runtime code is intentionally included in production demo assets; hiding tools without the URL parameter is presentation, not a security boundary.

## Replacing MSW with a real backend

Set **`VITE_DEMO_MODE=false`** at build time, set **`VITE_API_BASE_URL`** to a real API base ending in `/api/` (or retain the same-origin default), and rebuild. No worker starts and the panel is hidden. The same fetch client, hooks, and UI remain. Keep the JSON/HTTP contract or adapt the client at this boundary. A real backend must supply authoritative validation, durable idempotency, authentication/authorization, and payment transactions. Remove any previously registered mock worker when testing this switch on the same origin. Do not disable demo mode on a backend-free deployment.

## Current Phase 7 verification

- **103 tests pass across 11 files:** 50 isolated utility/configuration/client/service tests and 53 HTTP/React/startup integration tests. All existing 97 cases, including the 17 calculator tests, are preserved. Six cases add worker readiness/failure, streamed-body cancellation, unexpected HTTP 202, pending native fetch protection, and MSW network failure/retry coverage. Tests reset stores/handlers without mutating imported fixtures.
- TypeScript/build and ESLint pass. The generated worker is included in production output.
- Actual development browser: GET 200, POST 201 for RM7.90, GET refresh, automatic demo panel, no observed console errors/warnings.
- Actual production-preview browser: worker initialization and GET 200 without a backend; hidden default tools and working `?demoTools=1`; slow POST/loading/dismissal protection; HTTP 503 with the complete draft preserved; retry HTTP 201 for RM59.00; authoritative GET refresh; second refund blocked. Reload reset the fixture, then a separate RM13.40 refund preserved unselected syrup/delivery statuses and the RM89.30 historical total. No console errors/warnings were observed in these journeys.
- Actual production-preview screenshots and geometry cover Order/selection/review/confirmation at **1440×900, 1024×768, 768×1024, and 1280×600**. No unwanted horizontal overflow, clipped step headings, truncated amounts, or hidden action footers were found for the supplied data. Keyboard validation, Back, nested focus trapping/Escape, form scrolling, and focus restoration were checked.
- **Chrome DevTools request/payload/response-body inspection remains manual.** The connected Chromium in-app browser exposes page/console inspection, not the native Chrome Network panel. Screen-reader speech, Firefox/Safari, physical touch devices, text zoom, and actual hosting HTTPS/worker scope also require acceptance checks.
- The earlier dependency audit reported **12 moderate advisories in development ESLint/minimatch tooling**. No dependencies were changed or audit fixes forced during this QA pass; dependency advisory status was not refreshed. Review the tooling advisory before deployment preparation.
- [QA_REPORT.md](./QA_REPORT.md) contains the current findings, exact test breakdown, browser evidence, remaining acceptance checks, and the historical audit.

Future improvements: a persistent authenticated backend, business clarification for stranded paid add-ons, CI browser regression tests, and assistive-technology testing. No deployment was performed.

## Migration file inventory

Created:

```text
.env.example
public/mockServiceWorker.js
src/services/orderApi.ts
src/services/__tests__/orderHttpApi.test.ts
src/mocks/browser.ts
src/mocks/node.ts
src/mocks/handlers.ts
src/mocks/runtime.ts
src/mocks/mockConfig.ts
src/mocks/mockConfig.test.ts
src/mocks/DemoToolsPanel.tsx
```

Moved and adapted:

```text
src/services/mockOrderApi.ts       → src/mocks/mockOrderStore.ts
src/services/mockOrderApi.types.ts → src/services/orderApi.types.ts
```

Modified (the refund dialog/hook changes are API type imports; their layout and existing flow are preserved):

```text
package.json
package-lock.json
vite.config.ts
eslint.config.mjs
src/main.tsx
src/vite-env.d.ts
src/data/order.ts
src/test/setup.ts
src/services/refundRequest.ts
src/services/__tests__/mockOrderApi.test.ts
src/features/order/hooks/useOrder.ts
src/features/order/pages/OrderPage.tsx
src/features/order/pages/OrderPage.test.tsx
src/features/order/components/OrderSummary.tsx
src/features/refund/hooks/useRefundSubmission.ts
src/features/refund/components/RefundModal.tsx
src/features/refund/components/RefundModal.test.tsx
src/features/refund/components/RefundConfirmationDialog.tsx
src/features/refund/__tests__/refundWorkflow.test.tsx
README.md
QA_REPORT.md
```

The source fixture was subsequently updated by the project owner with `order_date`. Its current SHA-256 is `379D806EBDDF9A242396A4B6C6E06452396BF40FC527854A630A750DE7A3FE60`; the historical QA report records the earlier fixture hash. The theme/date changes do not modify this source file. The pure refund calculator and its 17 tests were not rewritten.
