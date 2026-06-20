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
- Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`.
- During local development it defaults to `http://localhost:4000`.
- Admin app must not hold Paystack/Uber/Bolt/Kwik secrets.

Admin model:
- One admin app, not separate branch apps.
- `SUPER_ADMIN` sees all branches and corporate analytics.
- `BRANCH_ADMIN` and `BRANCH_STAFF` see only their assigned branch because the backend scopes their token by `branchId`.

Implemented UI:
- Separate `/login` admin entry screen
- Main console redirects to `/login` when no admin token exists
- Superadmin analytics dashboard
- Recharts branch revenue chart
- Date range controls
- CSV and PDF export controls
- Branch pipeline columns
- Billing/reassignment concept screen
- Branch/logistics/settings placeholders matching the backend architecture
- Notifications composer under the `Notifications` nav item.
- Composer supports in-app/email/push channel selection, bold/italic/underline markup insertion, image selection for email broadcast UI, audience selection, and preview.

Next tasks:
- Wire dashboard to `/api/admin/analytics`.
- Add real branch creation and branch-admin invite forms.
- CSV export uses a token-aware `fetch` download when signed in.
- Add server-generated PDF endpoint if audit-grade exports are required.
- Wire notification composer to `POST /api/notifications/broadcast` and connect real email/push providers server-side.
