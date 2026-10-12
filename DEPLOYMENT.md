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

Campaign Managers can now create/edit/delete/import Creator data, including campaign Internal Listings. Account creation, approval and role administration remain Admin-only. Deploy both frontend and backend for these changes; no new database migration is required for this update.
