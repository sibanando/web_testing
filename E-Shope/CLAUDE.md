# CLAUDE.md — E-Shope (ApniDunia)

Project context and conventions for Claude Code assistance.

## Project Overview

Full-stack Indian e-commerce app with a unique saffron/amber brand identity (not Flipkart blue).
React 19 + Vite frontend, Node/Express backend, PostgreSQL 16.
Runs in Docker Compose (local dev) or Kubernetes/kind (staging/production).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, React Router 7, Axios, Lucide-react |
| Backend | Node.js 20, Express 4.18, `pg` (raw SQL, no ORM), JWT, bcryptjs, Multer |
| Security | helmet, express-rate-limit, morgan |
| Database | PostgreSQL 16 |
| Styling | All inline `style={{}}` — Tailwind is installed but **not used** |
| Containers | Docker Compose / Kubernetes (kind) |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) |

## Brand Colors

The site uses a warm saffron/amber palette — **not** Flipkart navy blue.

| Token | Value | Usage |
|-------|-------|-------|
| Brand primary | `#E85D04` | Buttons, active states, borders |
| Brand gradient | `#E85D04 → #FB8500` | CTAs, add-to-cart, nav search |
| Dark bg | `#1C1917` | Navbar |
| Page bg | `#FAFAF7` | Page background |
| Light accent | `#FFF5EB` / `#FFF0E4` | Hover backgrounds |
| Hover border | `#FDE0C0` | Card hover border |

## Key Files

```
backend/
  index.js                  # Express entry — helmet, morgan, rate limiters, graceful shutdown
  src/config/db.js          # Pool, initDb() — schema + seed (CREATE IF NOT EXISTS)
  src/middleware/auth.js    # verifyToken, requireAdmin — single source of JWT logic
  src/routes/
    authRoute.js            # register, login, OTP (crypto.randomInt), profile, Google/Microsoft OAuth
    adminRoute.js           # admin CRUD — requires verifyToken + requireAdmin
    sellerRoute.js          # seller CRUD — requires verifySeller middleware
    orderRoute.js           # create order + server-side pricing + stock decrement (pg transaction)
    productRoute.js         # public listing + admin-only creation
    paymentRoute.js         # mock UPI/PhonePe/GPay flows (in-memory — demo only)
    uploadRoute.js          # Multer image upload (requires JWT + seller/admin)

frontend/src/
  main.jsx                  # Root — wraps app in ErrorBoundary + providers
  App.jsx                   # Lazy routes + Suspense fallback
  context/AuthContext.jsx   # JWT state, login/register/OTP/loginWithToken helpers
  context/CartContext.jsx   # Cart in localStorage
  hooks/useResponsive.js    # Debounced resize → isMobile/isTablet/isDesktop
  components/
    Navbar.jsx              # Dark #1C1917 navbar, saffron search button
    Footer.jsx              # Dark footer, saffron accent bar
    ProductCard.jsx         # Warm cream image bg, saffron Add-to-Cart
    ErrorBoundary.jsx       # Auto-reloads on stale-chunk errors
  pages/
    Home.jsx                # Carousel, category grid, deal countdown
    Cart.jsx                # Per-product discount, delivery address
    Checkout.jsx            # Leaflet map, UPI QR polling, order creation
    Admin.jsx               # Admin-only; users tab shows auth method + filter
    SellerDashboard.jsx     # Seller-only (frontend + backend guarded)
    Login.jsx               # Email/password, Mobile OTP, Google, Microsoft login
    OAuthCallback.jsx       # /auth/callback — stores JWT from OAuth redirect, navigates home

k8s/
  *.yaml                    # Kubernetes manifests (namespace apnidunia)
  network-policy.yaml       # Restricts postgres to backend-only access
  deploy.sh / redeploy.sh   # Cluster management scripts

.github/workflows/ci.yml    # GitHub Actions: audit, build, docker validation
.env.example                # Copy to .env and fill in for local secrets
```

## Architecture Decisions

- **No ORM** — all queries are raw SQL via `pg`. Use parameterised queries (`$1`, `$2`).
- **No migrations** — schema lives in `initDb()` with `CREATE TABLE IF NOT EXISTS`. Additive changes go in the migration block below the main schema.
- **Shared auth middleware** — always import `verifyToken`/`requireAdmin` from `src/middleware/auth.js`. Never duplicate JWT logic in route files.
- **Inline styles only** — do not add Tailwind classes. All styling uses React `style={{}}`.
- **Mock payments** — `paymentRoute.js` simulates UPI/PhonePe/GPay with `setTimeout`. Do not treat as real payment integration. All payment routes require `verifyToken`.
- **Server-side order pricing** — `orderRoute.js` fetches product prices from the DB and ignores any price/total sent by the client. Never trust client-supplied prices.
- **Stock decrement** — happens inside the order creation transaction (`orderRoute.js`). Always use `GREATEST(0, stock - qty)`. Stock is checked before decrement; out-of-stock returns 400.
- **Crypto OTP** — OTP is generated with `crypto.randomInt` (not `Math.random`). Stored in-memory Map; replace with Redis for multi-replica deployments. OTP is invalidated immediately on any wrong guess (prevents brute-force within the validity window).
- **Rate limiting** — `express-rate-limit` applied globally (200 req/15 min), tighter on auth (20/15 min), and OTP send+verify (3/min each). In-memory store only — use `rate-limit-redis` for multi-replica K8s.
- **Graceful shutdown** — SIGTERM/SIGINT handlers close the HTTP server cleanly before exit.
- **Upload restriction** — `/api/upload` requires `verifyToken` + is_seller or is_admin. Regular customers cannot upload files.
- **Google/Microsoft OAuth** — Authorization Code Flow via `GET /api/auth/google` and `GET /api/auth/microsoft`. No extra npm packages; uses Node's built-in `fetch` to exchange the code and call the provider's userinfo endpoint. A random 16-byte state parameter (in-memory Map) guards against CSRF. After verifying user identity the backend issues our JWT and redirects to `FRONTEND_URL/auth/callback?token=...&user=...`. The `OAuthCallback.jsx` page reads those params, stores them, and navigates to home or `/seller`.
- **OAuth account linking** — `findOrCreateOAuthUser()` first checks by `(oauth_provider, oauth_id)`, then by email. If a matching email already exists the OAuth credentials are linked to that account silently; no duplicate users are created.
- **OAuth state store** — same in-memory Map pattern as OTP store (`oauthStateStore`). Replace with Redis for multi-replica K8s.
- **OAuth graceful degradation** — if `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (or Microsoft equivalents) are absent, clicking the button redirects back to `/login?oauth_error=..._not_configured` with a friendly message rather than crashing.

## Security Rules

- Every mutation endpoint that modifies user data must have `verifyToken`.
- Admin routes must have both `verifyToken` AND `requireAdmin`.
- Payment routes must have `verifyToken` — never expose payment session creation/polling to unauthenticated callers.
- Upload route requires `verifyToken` + seller/admin check (`requireSellerOrAdmin` in `uploadRoute.js`).
- Profile/resource update endpoints must verify `req.user.id === parseInt(req.params.id)` unless `req.user.is_admin`.
- Never return OTP values in API responses — log to server console only.
- Never trust client-supplied prices or totals in orders — always resolve from DB.
- CORS: `ALLOWED_ORIGINS` must be exact origin strings (e.g. `https://yourdomain.com`). The check uses strict `===` — not `startsWith`, which can be bypassed with crafted subdomains.
- Never hardcode JWT_SECRET in route files — always use `src/middleware/auth.js`.
- In `NODE_ENV=production`, the app exits at startup if JWT_SECRET is the default value.
- Never expose raw `err.message` in 500 responses — use generic messages and log internally.
- Password minimum length is 8 characters (enforced in `authRoute.js` register handler).
- DB SSL (`DB_SSL=true`) uses `rejectUnauthorized: true` — self-signed/invalid certs are rejected.

## Known Limitations (non-blocking for production)

- **Rate limiter is in-memory** — doesn't sync across K8s replicas. Add `rate-limit-redis` for horizontal scaling.
- **OTP store is in-memory** — doesn't survive restarts or sync across replicas. Replace with Redis + TTL for HA.
- **OAuth state store is in-memory** — same as OTP store; replace with Redis for HA.
- **OAuth token in redirect URL** — `FRONTEND_URL/auth/callback?token=JWT` exposes the token in browser history. Acceptable for demo; production should use a short-lived one-time code exchange instead.
- **CSP disabled** — `contentSecurityPolicy: false` in helmet config. Enable and tune for hardened production.
- **Payment is mock** — integrate Razorpay or Cashfree for real transactions.

## Environment Variables

Copy `.env.example` to `.env` for local overrides. Docker Compose reads `.env` automatically.

| Variable | Default (dev) | Production requirement |
|----------|--------------|----------------------|
| `JWT_SECRET` | `apnidunia_secret_2024` | **Must change** — exits if default in prod |
| `DATABASE_URL` | local postgres | Full connection string |
| `POSTGRES_PASSWORD` | `apnidunia_pg_2024` | **Must change** |
| `ALLOWED_ORIGINS` | (open) | Set to your domain(s) |
| `FAST2SMS_API_KEY` | (empty → console log) | Get free key at fast2sms.com |
| `DB_SSL` | false | `true` for managed cloud DBs |
| `FRONTEND_URL` | `http://localhost:5555` | Set to production frontend origin |
| `BACKEND_URL` | `http://localhost:5000` | Set to production backend origin |
| `GOOGLE_CLIENT_ID` | (empty → button shows "not configured" error) | console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | (empty) | console.cloud.google.com |
| `MICROSOFT_CLIENT_ID` | (empty → button shows "not configured" error) | portal.azure.com App registration |
| `MICROSOFT_CLIENT_SECRET` | (empty) | portal.azure.com |
| `MICROSOFT_TENANT_ID` | `common` | `common` for personal+work, or tenant GUID |

## Database Patterns

```js
// Always use parameterised queries
await db.query('SELECT * FROM products WHERE id = $1', [id]);

// Transactions (orders)
const client = await db.connect();
await client.query('BEGIN');
// ... queries ...
await client.query('COMMIT');
client.release();

// Indexes exist on: products.category, products.seller_id,
//   orders.user_id, order_items.order_id, order_items.product_id
```

### users table columns

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | TEXT NOT NULL | |
| `email` | TEXT UNIQUE | nullable (phone-only users) |
| `phone` | TEXT UNIQUE | nullable (email-only users) |
| `password` | TEXT | nullable for OAuth-only accounts |
| `is_admin` | INTEGER (0/1) | |
| `is_seller` | INTEGER (0/1) | |
| `oauth_provider` | TEXT | `'google'` or `'microsoft'`; null for email/phone accounts |
| `oauth_id` | TEXT | provider's unique user ID (`sub` for Google, `id` for Microsoft) |
| `created_at` | TIMESTAMP | |

## Running Locally

```bash
# Option A — Docker Compose (recommended)
cp .env.example .env          # then fill in any overrides
docker compose up --build -d
# Frontend: http://localhost:5555  Backend: http://localhost:5000

# After code changes
docker compose up --build -d

# Logs
docker compose logs -f backend
docker compose logs -f frontend
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | sibanando@apnidunia.com | Sib@1984 |
| Customer | user@example.com | password123 |
| Seller | seller@apnidunia.com | seller123 |

**OTP login:** enter any 10-digit number → if `FAST2SMS_API_KEY` is set, OTP is sent via SMS; otherwise it is printed to backend logs (`docker compose logs backend`).

## Common Gotchas

- `products.price` is the **already-discounted** selling price. Original price = `price / (1 - discount/100)`.
- `products.images` is a JSON string (`TEXT` column). Always `JSON.parse()` before use.
- `is_admin` and `is_seller` are `INTEGER` (0/1), not `BOOLEAN`.
- The deal-of-day countdown expiry is stored in `localStorage` key `deal_expiry`.
- Login page reads `?tab=register&seller=1` to pre-select register+seller mode.
- After a `docker compose up --build`, do a **hard refresh** (`Ctrl+Shift+R`) to clear the browser's cached `index.html`. The nginx `no-cache` header on `index.html` prevents this in normal usage; old tabs may still need a refresh.
- The ErrorBoundary auto-reloads once on stale-chunk errors (uses `sessionStorage` flag to avoid loops).
- OAuth users registered via Google/Microsoft get `password = NULL` in the DB. Do not attempt `bcrypt.compareSync` on their password — the login route will correctly reject an empty password field. Admins can set a password from the Admin panel if needed.
- New OAuth users register as **Customer** (`is_seller = 0`) by default. Admin must upgrade them to Seller from the Users tab if required.
- The `BACKEND_URL` / `FRONTEND_URL` env vars default to localhost in dev. In production both must be set to the public HTTPS URLs, and those URLs must be registered as authorised redirect URIs in the Google/Microsoft developer consoles.
