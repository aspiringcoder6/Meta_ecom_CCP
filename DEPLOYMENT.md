# Render deployment

## Frontend — Static Site

- Root Directory: `client`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Environment variable: `VITE_API_URL=https://<backend-service>.onrender.com`

`VITE_API_URL` is embedded during the Vite build. Redeploy the frontend after changing it.

Add this rule under **Redirects/Rewrites** so React Router routes work when refreshed:

| Source | Destination | Action |
|---|---|---|
| `/*` | `/index.html` | `Rewrite` |

## Backend — Web Service

- Root Directory: `server`
- Build Command: `npm ci --include=dev && npm run build`
- Pre-Deploy Command on paid services: `npm run prisma:deploy`
- Start Command: `npm start`
- Free-service Start Command: `npm run prisma:deploy && npm start`
- Health Check Path: `/api/health`

Required environment variables:

- `DATABASE_URL`: Render PostgreSQL internal URL.
- `CLIENT_ORIGIN`: frontend public origin, without a trailing slash.
- `JWT_SECRET`: long random secret.
- `NODE_ENV=production`.

Do not set the local-only `DIRECT_URL` or a fixed `PORT` on Render.

## Brand Review on Render Free

Brand links are public: neither opening `/client-review/:token` nor submitting a review requires an Admin login or staff cookies. Tokens are permanent unless deliberately revoked or their Campaign is deleted. Share the link returned by the backend; the frontend no longer generates browser-only demo links when the backend cannot be reached.

Render Free web services sleep after 15 minutes without inbound traffic. The next HTTP request wakes the service, which can take about a minute. An Admin opening the application can wake it first, making a Brand link appear to work only after the Admin logs in. See [Render's Free service limitations](https://render.com/docs/free).

The public review page now allows 90 seconds per initial GET, retries once on connection/temporary server errors, and shows a loading/retry message instead of claiming the link is invalid. Submissions wait up to 120 seconds; failed or partially saved edits remain available for retry. Free cold starts still exist; an always-on paid backend is needed if the Brand portal must open immediately after long idle periods.

When troubleshooting a shared link:

- Confirm the frontend SPA rewrite above, including direct visits to `/client-review/:token`.
- Confirm `VITE_API_URL` points to the deployed backend and `CLIENT_ORIGIN` includes the frontend's actual origin. Changing `VITE_API_URL` requires a frontend rebuild.
- Compare backend request/startup logs with the time the Brand opened the link. An explicit `REVIEW_LINK_INVALID` response means a missing/revoked link; connection failures or 5xx errors do not.

Brand drafts (decisions, notes, products and deliverable feedback) are stored only in that browser's local storage, separately for each review token. Reopening the same link in the same browser restores unsent changes. Only acknowledged saves are removed from the draft. Drafts are not sent to the team until the Brand submits, and they are not synchronized between devices. Do not share a browser profile containing confidential Brand drafts; use **Xóa bản nháp** to discard them. Storage errors are shown on the page.

Campaign Managers can create/edit/delete/import Creator data, including campaign Internal Listings. Account creation, approval and role administration remain Admin-only.

## Brand collaboration workspace — October 17, 2026

Deploy the backend before the frontend. This update **does require** migration `20261017100000_brand_shipping_workspace`:

1. Back up the production database through your database provider.
2. Run `npm run prisma:deploy` from `server` (or keep it in the Render Pre-Deploy / Free Start Command above).
3. Deploy the backend, then rebuild/redeploy the frontend. No new environment variables are required.

The migration preserves existing Creators, Campaigns, permanent review tokens and Deliverables. It adds per-assignment revisions, shipment records, append-only shipment history, and per-user read markers. It has been exercised against an isolated PostgreSQL-compatible database, not the production database.

Brand Review now has **Duyệt KOC**, **Giao & nhận hàng**, and **Duyệt nội dung**. The new `/api/public/reviews/:token/workspace` API serves 25/50/100 KOCs per page and loads Deliverable JSON only for the active Deliverables tab. Thin scalar public listing fields are filtered/sorted on the server (including computed quote prices); very large campaigns can still benefit from further database-query pagination optimization. Public responses whitelist approved fields and no longer include internal Cost, Extra, AGI, contact, PIC, financial notes, or review tokens. Existing public endpoints remain available with safe projections.

Shipment edits autosave after an 800ms pause. Up to 20 pending shipments are sent per client batch; the server accepts up to 200 and reports individual failed rows without undoing successful rows. Local shipment drafts are scoped separately for Brand links and staff accounts. Team confirmation of KOC receipt is distinct from Brand-reported delivery. Brand changes to products/status/tracking invalidate an earlier confirmation. Shipment products describe physical shipments and do not automatically alter the Campaign's video requirements.

Campaigns use Server-Sent Events for lightweight version changes instead of full-campaign polling every 3 seconds. One version check is shared per watched Campaign per API process. A 15-second lightweight version fallback covers networks that block event streams. Hidden tabs disconnect; visibility reconnects recover missed changes. Keep SSE streaming enabled in any additional reverse proxy (no buffering). Render requires no extra service/environment for these HTTP event streams. Staff streams reconnect at least every two minutes to recheck session permissions; revoked Brand links are rechecked during heartbeats and all subsequent API requests.

Opening a notification links to `?tab=shipping&unread=1`. Shipment changes accumulate in one notification per Campaign and recipient. **Đã xem thay đổi** records exactly the Brand revision that the signed-in user has seen; another staff member's unread state is not cleared. A later Brand update becomes unread again.

Frontend listing/feedback drafts migrate from the previous local format and remain available across pages. Concurrent changes are rejected with a comparison UI, not silently overwritten. Never treat a local draft as a submitted Brand decision. Backend row autosaves return only the affected Creator; unrelated rows, active inputs and pending changes are retained.

Upgrading the backend off Free is still recommended for live Brand use: these code changes do not remove Render Free cold starts. Frontend Static Site hosting can remain unchanged.
