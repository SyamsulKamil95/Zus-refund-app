# ZUS Refund Flow — Phase 2

Back-office order details page built with React, TypeScript, Vite, Tailwind CSS v4, and Lucide React. The displayed order is assessment data; the Refund button only shows a next-phase placeholder.

## Run locally

```sh
npm install
npm run dev
```

## Scripts

- `npm run build` — TypeScript check and production build.
- `npm run lint` — ESLint checks.
- `npm test` — Vitest and React Testing Library checks.
- `npm run test:watch` — Vitest watch mode.

## Structure

- `src/app` — application entry component.
- `src/data` — source order JSON and typed data export.
- `src/features/order/types` — order interfaces.
- `src/features/order/utils` — currency formatting and total calculations.
- `src/features/order/components` — reusable order detail sections.
- `src/features/order/pages` — order details page.

## Phase 3 refund calculation assumptions

- Refundable value is calculated from paid parent units, their paid add-ons, and the delivery fee only when it is paid and explicitly selected.
- In the supplied `src/data/order.json`, unit `L2-2` is already refunded although its add-ons are marked paid. The parent-unit rule makes both add-ons ineligible.
- With the current order data, selecting every eligible unit, eligible add-on, and the paid delivery fee totals **RM59.00**. The screenshot's **RM77.30** is RM18.30 higher and does not reconcile with the supplied items, prices, and statuses; the specified partial selection does reconcile to RM43.20. The source JSON and calculation are left unchanged pending clarification of the expected data or rule.
