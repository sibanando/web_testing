# CLAUDE.md — E-Shope (ApniDunia)

Project context and conventions for Claude Code assistance.

## Project Overview

Full-stack Indian e-commerce app (Flipkart-inspired). React 19 + Vite frontend, Node/Express backend, PostgreSQL 16.
Runs in Docker Compose (local dev) or Kubernetes/kind (staging).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, React Router 7, Axios, Lucide-react |
| Backend | Node.js 20, Express 4.18, `pg` (raw SQL, no ORM), JWT, bcryptjs, Multer |
| Database | PostgreSQL 16 |
| Styling | All inline `style={{}}` — Tailwind is installed but not used |
| Containers | Docker Compose / Kubernetes (kind) |

## Key Files

```
backend/
  index.js                  # Express entry, CORS config, route mounting
  src/config/db.js          # Pool, initDb() — schema + seed (CREATE IF NOT EXISTS)
  src/middleware/auth.js    # verifyToken, requireAdmin — single source of JWT logic
  src/routes/
    authRoute.js            # register, login, OTP, profile (all JWT-protected mutations)
    adminRoute.js           # admin CRUD — requires verifyToken + requireAdmin
    sellerRoute.js          # seller CRUD — requires verifySeller middleware
    orderRoute.js           # create order + stock decrement (pg transaction)
    productRoute.js         # public listing + admin-only creation
    paymentRoute.js         # mock UPI/PhonePe/GPay flows (in-memory state)
    uploadRoute.js          # Multer image upload (requires JWT)

frontend/src/
  main.jsx                  # Root — wraps app in ErrorBoundary + providers
  context/AuthContext.jsx   # JWT state, login/register/OTP helpers
  context/CartContext.jsx   # Cart in localStorage
  hooks/useResponsive.js    # Debounced resize → isMobile/isTablet/isDesktop
  components/ProductCard.jsx # Uses product.rating/discount/reviews from DB
  pages/
    Home.jsx                # Carousel, category grid, deal countdown (localStorage-persisted)
    Cart.jsx                # Per-product discount from DB, not a flat 15%
    Checkout.jsx            # Leaflet map, UPI QR polling, order creation
    Admin.jsx               # Admin-only (frontend + backend guarded)
    SellerDashboard.jsx     # Seller-only (frontend + backend guarded)
    Login.jsx               # Reads ?tab=register&seller=1 query params
```

## Architecture Decisions

- **No ORM** — all queries are raw SQL via `pg`. Use parameterised queries (`$1`, `$2`).
- **No migrations** — schema lives in `initDb()` with `CREATE TABLE IF NOT EXISTS`. Additive changes go in the migration block below the main schema.
- **Shared auth middleware** — always import `verifyToken`/`requireAdmin` from `src/middleware/auth.js`. Never duplicate JWT logic in route files.
- **Inline styles only** — do not add Tailwind classes. All styling uses React `style={{}}`.
- **Mock payments** — `paymentRoute.js` simulates UPI/PhonePe/GPay with `setTimeout`. Do not treat as real payment integration.
- **Stock decrement** — happens inside the order creation transaction (`orderRoute.js`). Always use `GREATEST(0, stock - qty)`.

## Security Rules

- Every mutation endpoint that modifies user data must have `verifyToken`.
- Admin routes must have both `verifyToken` AND `requireAdmin`.
- Profile/resource update endpoints must verify `req.user.id === parseInt(req.params.id)` unless `req.user.is_admin`.
- Never return OTP values in API responses — log to server console only.
- CORS allowed origins come from `ALLOWED_ORIGINS` env var (comma-separated).
- Never hardcode JWT_SECRET in route files — always use `src/middleware/auth.js`.

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

## Running Locally

```bash
# Docker Compose (recommended)
docker compose up --build -d
# Frontend: http://localhost:5555  Backend: http://localhost:5000

# After code changes — rebuild
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

OTP login: any 10-digit number → OTP printed to backend console (`docker compose logs backend`).

## Common Gotchas

- `products.price` is the **already-discounted** selling price. Original price = `price / (1 - discount/100)`.
- `products.images` is a JSON string (`TEXT` column). Always `JSON.parse()` before use.
- `is_admin` and `is_seller` are `INTEGER` (0/1), not `BOOLEAN`.
- The deal-of-day countdown expiry is stored in `localStorage` key `deal_expiry`.
- Login page reads `?tab=register&seller=1` to pre-select register+seller mode.
