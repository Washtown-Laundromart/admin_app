# FreshFold Admin App Context

This is the admin Next.js app for both superadmin and branch users.

Stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Zustand
- shadcn-style local UI primitives in `components/ui`
- Lucide React icons
- Recharts for analytics
- jsPDF for browser-side PDF export

Backend connection:
- Browser code calls the same-origin Next.js proxy at `/api/freshfold`; it should not call Railway directly.
- Set `BACKEND_API_BASE_URL` in Vercel/local env for the proxy route. It can fall back to `NEXT_PUBLIC_API_BASE_URL` for compatibility.
- During local development the proxy defaults to `http://localhost:4000` if no backend URL env is set.
- Admin app must not hold Paystack/Relay/Bolt/Kwik secrets.
- Local `.env` points to the Railway backend for integration testing.
- `npm run dev` and `npm run start` do not pin a port; Next can select another available port.
- On Vercel, using the `/api/freshfold` proxy avoids browser CORS because Vercel calls Railway server-to-server.

Admin model:
- One admin app, not separate branch apps.
- `SUPER_ADMIN` sees all branches and corporate analytics.
- `BRANCH_ADMIN` and `BRANCH_STAFF` see only their assigned branch because the backend scopes their token by `branchId`.
- `BRANCH_ADMIN` and `BRANCH_STAFF` must not see the Branches tab; branch provisioning and branch user management are super-admin-only UI areas.

Implemented UI:
- Separate `/login` admin entry screen
- Main console redirects to `/login` when no admin token exists
- `/login` calls live backend auth and no longer enters demo mode or pre-fills demo credentials.
- Superadmin/branch dashboard loads live `/api/admin/analytics`, `/api/orders`, `/api/branches`, and `/api/admin/customers`.
- Recharts branch revenue chart uses backend analytics data.
- Date range controls
- CSV export calls `/api/admin/export.csv`; PDF export summarizes the currently loaded dashboard cards in-browser.
- Branch pipeline columns are grouped from live order status values.
- Order cards can move pickup requests to branch-arrived state, start pricing, and open billed/awaiting-payment orders back into the pricing workspace.
- Billing view shows live orders that are at-branch, pricing, or awaiting payment. It opens the same inspection/pricing workspace used from the Orders pipeline.
- The inspection/pricing workspace shows the customer's submitted items, notes, addresses, photos, branch/customer details, and a manual line-item pricing form. Pricing is always entered by branch staff after inspection, not generated automatically.
- Existing bills open in read-only billed state with inspected line items, total, current Paystack link, and a `Resend Paystack link` action that calls `/api/orders/:id/bill/payment-link`.
- Delivery fee input preloads from stored courier delivery-job fees when available, while still allowing manual/test courier fee entry if provider dispatch did not complete.
- Customer wash requests trigger pickup courier dispatch from the backend immediately. Admin order cards show pickup tracking details and only expose courier dispatch for return delivery when an order is ready.
- Logistics view shows live courier queues with empty states when no matching orders exist.
- Branch management can create live branches and branch admin/staff users through backend endpoints.
- Branch admin creation calls `POST /api/admin/users`; the backend now returns clear JSON errors for duplicate email, inactive/missing branch, and invalid form data.
- Admin/customer auth uses one backend `User` table, so an email already registered as a customer cannot be reused for a branch admin/staff account.
- Branch management loads `GET /api/admin/users` and shows active branches as paginated cards below the forms; selecting a branch shows its assigned branch admin and staff users.
- Branch user loading is non-blocking: if `/api/admin/users` is not deployed yet or fails, branch cards and branch dropdowns must still render from `/api/branches`.
- Branch creation geocodes the entered address/city/state through the backend `POST /api/geocode/address`, which uses Mapbox server-side, shows candidate matches, requires admin confirmation of latitude/longitude, and sends the confirmed coordinates in the `/api/branches` payload.
- Notifications composer sends real broadcast records to selected live customers through `POST /api/notifications/broadcast`.
- App-wide toast notifications live in `components/toast-provider.tsx`; keep messages clear for non-technical admins.

Next tasks:
- Add server-generated PDF endpoint if audit-grade exports are required.
- Add service catalog/preset pricing if Washtownnig wants standardized item/service price suggestions; manual inspection pricing remains the source of truth.
- Connect real email/push providers server-side; current notification composer creates in-app/email/push records only.
