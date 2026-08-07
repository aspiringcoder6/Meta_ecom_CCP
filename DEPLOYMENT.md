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
