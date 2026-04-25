# E-Shope Architecture

## System Overview

```
                         +-------------------+
                         |    Browser/Client  |
                         +--------+----------+
                                  |
              +-------------------+-------------------+
              |                   |                   |
     localhost:5555        localhost:8181       localhost:8080
      (Vite Dev)        (Docker Compose)     (K8s / kind)
              |                   |                   |
              v                   v                   v
     +--------+------+   +-------+-------+   +-------+-------+
     | Vite Dev      |   | Nginx (80)    |   | Ingress Nginx |
     | Server        |   | frontend      |   | Controller    |
     | (HMR + Proxy) |   | container     |   | (port 8080)   |
     +---------------+   +-------+-------+   +---+-------+---+
                                 |               |       |
                                 |          /api |       | /
                                 v               v       v
                         +-------+-------+ +-----+--+ +-+-------+
                         | backend-      | | backend | | frontend|
                         | service:5000  | | :5000   | | :80     |
                         +-------+-------+ +----+----+ +---------+
                                 |              |
                                 v              v
                         +-------+-------+ +----+--------+
                         | PostgreSQL    | | PostgreSQL   |
                         | :5432         | | :5432        |
                         | (container)   | | (pod)        |
                         +---------------+ +----+---------+
                                               |
                                          +----+--------+
                                          | PVC (20Gi)  |
                                          | local-path  |
                                          +-------------+
```

---

## Tech Stack

| Layer      | Technology                                      |
|------------|--------------------------------------------------|
| Frontend   | React 19, Vite 7, React Router 7, Axios          |
| Backend    | Node.js, Express 4.18, JWT, bcryptjs, multer     |
| Database   | PostgreSQL 16 (pg library, pure JS driver)        |
| UI         | Lucide-react icons, Leaflet maps, qrcode.react   |
| Styling    | Inline React `style={{}}` (Tailwind disabled)     |
| Containers | Docker, Docker Compose, nginx 1.27-alpine         |
| Orchestration | Kubernetes (kind), nginx-ingress, kustomize   |

---

## Project Structure

```
E-Shope/
├── backend/
│   ├── index.js                    # Express entry point, health check, route registration
│   ├── Dockerfile                  # node:20-alpine, npm ci --omit=dev
│   ├── uploads/                    # Multer image upload directory
│   └── src/
│       ├── config/
│       │   └── db.js               # PostgreSQL pool, initDb() schema + seed
│       ├── routes/
│       │   ├── authRoute.js        # Login, register, profile update
│       │   ├── productRoute.js     # Product listing, search, categories
│       │   ├── adminRoute.js       # Admin CRUD (products + users)
│       │   ├── sellerRoute.js      # Seller product CRUD + stats
│       │   ├── orderRoute.js       # Order creation (pg transactions)
│       │   ├── paymentRoute.js     # UPI QR, PhonePe, GPay (mock)
│       │   └── uploadRoute.js      # Image upload (multer, 5MB)
│       └── middleware/
│           └── auth.js             # JWT verification middleware
├── frontend/
│   ├── Dockerfile                  # Multi-stage: node build → nginx serve
│   ├── nginx.conf                  # SPA routing, /api proxy, /uploads proxy, gzip
│   ├── vite.config.js              # Port 5555, React plugin, vendor chunks
│   └── src/
│       ├── main.jsx                # BrowserRouter + AuthProvider + CartProvider
│       ├── App.jsx                 # Route definitions + layout
│       ├── index.css               # Global styles, animations, CSS variables
│       ├── pages/
│       │   ├── Home.jsx            # Carousel, categories, products, newsletter
│       │   ├── ProductDetail.jsx   # Product view, QR, related items
│       │   ├── Login.jsx           # Glassmorphism login/register
│       │   ├── Cart.jsx            # Cart items, price breakdown
│       │   ├── Checkout.jsx        # Address, Leaflet map, payment flow
│       │   ├── Admin.jsx           # Product + user management (admin only)
│       │   ├── SellerDashboard.jsx # Seller products, stats, profile
│       │   ├── UserProfile.jsx     # Profile edit, orders history
│       │   └── StaticPage.jsx      # 14 static pages (about, FAQ, etc.)
│       ├── components/
│       │   ├── Navbar.jsx          # Header, search, user menu, categories
│       │   ├── ProductCard.jsx     # Product card (image, price, discount)
│       │   ├── Footer.jsx          # Site footer
│       │   └── ErrorBoundary.jsx   # React error boundary
│       ├── context/
│       │   ├── AuthContext.jsx     # JWT auth state, login/register/logout
│       │   └── CartContext.jsx     # Cart state, add/remove/update
│       ├── services/
│       │   └── api.js             # Axios instance (baseURL, JWT interceptor)
│       └── hooks/
│           └── useResponsive.js   # isMobile / isTablet / isDesktop
├── k8s/                           # Kubernetes manifests + scripts
├── docker-compose.yml
├── start.sh                       # Docker Compose start
├── stop.sh                        # Docker Compose stop
└── ARCHITECTURE.md                # This file
```

---

## Database Schema

```sql
┌──────────────────────────────┐
│           users              │
├──────────────────────────────┤
│ id          SERIAL PK        │
│ name        VARCHAR(100)     │
│ email       VARCHAR(100) UQ  │
│ password    TEXT (bcrypt)     │
│ is_admin    INT (0/1)        │
│ is_seller   INT (0/1)        │
│ created_at  TIMESTAMP        │
└──────────┬───────────────────┘
           │ 1
           │
           │ N
┌──────────┴───────────────────┐       ┌──────────────────────────────┐
│          orders              │       │         products             │
├──────────────────────────────┤       ├──────────────────────────────┤
│ id          SERIAL PK        │       │ id          SERIAL PK        │
│ user_id     INT FK→users     │       │ name        VARCHAR(200)     │
│ total       DECIMAL(10,2)    │       │ price       DECIMAL(10,2)    │
│ status      VARCHAR(50)      │       │ description TEXT              │
│ address     TEXT              │       │ category    VARCHAR(50)      │
│ phone       VARCHAR(20)      │       │ images      TEXT (JSON)       │
│ payment_method VARCHAR(50)   │       │ rating      DECIMAL(2,1)     │
│ transaction_id VARCHAR(100)  │       │ reviews     INT               │
│ created_at  TIMESTAMP        │       │ discount    INT               │
└──────────┬───────────────────┘       │ stock       INT               │
           │ 1                         │ seller_id   INT FK→users      │
           │                           │ created_at  TIMESTAMP         │
           │ N                         └──────────┬───────────────────┘
┌──────────┴───────────────────┐                  │
│       order_items            │                  │
├──────────────────────────────┤                  │
│ id          SERIAL PK        │                  │
│ order_id    INT FK→orders    ├──────────────────┘
│ product_id  INT FK→products  │
│ quantity    INT               │
│ price       DECIMAL(10,2)    │
└──────────────────────────────┘
```

### Seed Data
- **Admin**: sibanando / Sib@1984 (is_admin=1)
- **Demo User**: user@example.com / password123
- **Demo Seller**: seller@apnidunia.com / seller123 (is_seller=1)
- **Products**: 21 items across 10 categories

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Path                   | Auth | Description                          |
|--------|------------------------|------|--------------------------------------|
| POST   | `/api/auth/register`   | No   | Register user (supports is_seller)   |
| POST   | `/api/auth/login`      | No   | Login, returns JWT + user            |
| PUT    | `/api/auth/profile/:id`| JWT  | Update name/email/password           |

### Products (`/api/products`)

| Method | Path                            | Auth | Description                      |
|--------|---------------------------------|------|----------------------------------|
| GET    | `/api/products`                 | No   | List (filter: category, search)  |
| GET    | `/api/products/:id`             | No   | Single product detail            |
| GET    | `/api/products/categories/list` | No   | Distinct category names          |
| POST   | `/api/products`                 | No   | Create product (public)          |

### Admin (`/api/admin`)

| Method | Path                     | Auth      | Description                     |
|--------|--------------------------|-----------|---------------------------------|
| GET    | `/api/admin/users`       | JWT+Admin | List all users                  |
| PUT    | `/api/admin/users/:id`   | JWT+Admin | Edit user / toggle seller role  |
| DELETE | `/api/admin/users/:id`   | JWT+Admin | Delete user                     |
| PUT    | `/api/admin/products/:id`| JWT+Admin | Edit product                    |
| DELETE | `/api/admin/products/:id`| JWT+Admin | Delete product                  |

### Seller (`/api/seller`)

| Method | Path                       | Auth       | Description                    |
|--------|----------------------------|------------|--------------------------------|
| GET    | `/api/seller/products`     | JWT+Seller | List own products              |
| POST   | `/api/seller/products`     | JWT+Seller | Create product (own)           |
| PUT    | `/api/seller/products/:id` | JWT+Seller | Edit own product               |
| DELETE | `/api/seller/products/:id` | JWT+Seller | Delete own product             |
| GET    | `/api/seller/stats`        | JWT+Seller | Revenue, orders, product count |
| PUT    | `/api/seller/profile/:id`  | JWT+Seller | Update seller profile          |

### Orders (`/api/orders`)

| Method | Path                       | Auth | Description                          |
|--------|----------------------------|------|--------------------------------------|
| POST   | `/api/orders`              | No   | Create order (pg transaction)        |
| GET    | `/api/orders/user/:userId` | No   | User's order history (STRING_AGG)    |

### Payments (`/api/payment`)

| Method | Path                   | Auth | Description                          |
|--------|------------------------|------|--------------------------------------|
| POST   | `/api/payment/upi-qr`  | No   | Generate UPI QR deep-link            |
| POST   | `/api/payment/verify`   | No   | Mock verify (1.5s, 95% success)      |
| POST   | `/api/payment/phonepe`  | No   | PhonePe deep-link                    |
| POST   | `/api/payment/gpay`     | No   | Google Pay deep-link                 |

### Upload (`/api/upload`)

| Method | Path           | Auth | Description                            |
|--------|----------------|------|----------------------------------------|
| POST   | `/api/upload`  | No   | Image upload (5MB, jpeg/png/gif/webp)  |

### Health (`/`)

| Method | Path       | Description                  |
|--------|------------|------------------------------|
| GET    | `/health`  | Health check (no DB query)   |
| GET    | `/`        | App info + product count     |

---

## Frontend Routes

| Path             | Page              | Auth Required | Description                           |
|------------------|-------------------|---------------|---------------------------------------|
| `/`              | Home              | No            | Product catalog, categories, search   |
| `/product/:id`   | ProductDetail     | No            | Product view, related items, QR       |
| `/cart`          | Cart              | No            | Shopping cart, price summary           |
| `/checkout`      | Checkout          | No            | Address, map, payment (UPI/GPay)       |
| `/login`         | Login             | No            | Login tab (glassmorphism)              |
| `/register`      | Login             | No            | Register tab                           |
| `/profile`       | UserProfile       | Yes           | Profile edit, order history            |
| `/admin`         | Admin             | is_admin=1    | Product + user management              |
| `/seller`        | SellerDashboard   | is_seller=1   | Seller products, stats, profile        |
| `/page/:slug`    | StaticPage        | No            | 14 static pages (about, FAQ, etc.)     |

---

## Docker Images

| Image                    | Base               | Size   | Purpose            |
|--------------------------|--------------------|--------|--------------------|
| `e-shope-backend:latest` | node:20-alpine     | 208MB  | Express API server |
| `e-shope-frontend:latest`| nginx:1.27-alpine  | 74.5MB | Nginx + React SPA  |
| `postgres:16-alpine`     | (official)         | 395MB  | PostgreSQL database|

### Frontend Build (Multi-stage)

```
Stage 1 (builder): node:20-alpine
  ├── ARG VITE_API_URL=/api       ← baked into JS bundle
  ├── npm ci
  └── npm run build → dist/

Stage 2 (serve): nginx:1.27-alpine
  ├── COPY dist/ → /usr/share/nginx/html
  └── COPY nginx.conf → /etc/nginx/conf.d/default.conf
```

### Frontend Nginx Config

```
location /          → try_files $uri $uri/ /index.html  (SPA fallback)
location /api/      → proxy_pass http://backend-service:5000/api/
location /uploads/  → proxy_pass http://backend-service:5000/uploads/
gzip on             → JS, CSS, JSON, SVG
```

### Backend Build

```
node:20-alpine
  ├── npm ci --omit=dev
  ├── COPY . .
  └── CMD ["node", "index.js"]
```

---

## Deployment Environments

### 1. Local Development (npm)

```
Frontend:  cd frontend && npm run dev       → http://localhost:5555
Backend:   node index.js                    → http://localhost:5000
Database:  PostgreSQL on localhost:5432
```

### 2. Docker Compose

```
bash start.sh       → builds + starts all services
bash stop.sh        → docker compose down

Frontend:  http://localhost:8181  (nginx container)
Backend:   http://localhost:5000  (exposed port)
Database:  internal (pg_data volume)
```

```yaml
# docker-compose.yml
services:
  postgres:   postgres:16-alpine, healthcheck: pg_isready
  backend:    ./backend, depends_on: postgres (healthy)
  frontend:   ./frontend (VITE_API_URL=/api), depends_on: backend
network:      app-network (bridge)
volumes:      pg_data (persistent)
```

### 3. Kubernetes (kind)

```
bash k8s/deploy.sh          → full deploy (cluster + ingress + manifests)
bash k8s/redeploy.sh [all]  → rebuild + reload after code changes
bash k8s/start.sh           → resume pods (after stop)
bash k8s/stop.sh            → scale to 0 (data preserved)
bash k8s/teardown.sh        → delete cluster entirely

App:  http://localhost:8080
```

---

## Kubernetes Architecture

### Namespace: `apnidunia`

```
┌─────────────────────────────────────────────────────────────────┐
│                    kind cluster: eshope                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ingress-nginx (namespace)                    │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │  ingress-nginx-controller                        │    │   │
│  │  │  hostPort 80 → containerPort 80                  │    │   │
│  │  │  (maps to localhost:8080 via kind extraPortMap)   │    │   │
│  │  └──────────────────┬───────────────────────────────┘    │   │
│  └──────────────────────┼───────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────────────┼───────────────────────────────────┐   │
│  │              apnidunia (namespace)                        │   │
│  │                      │                                    │   │
│  │            ┌─────────┴──────────┐                         │   │
│  │            │  Ingress           │                         │   │
│  │            │  /api → backend    │                         │   │
│  │            │  /    → frontend   │                         │   │
│  │            └────┬──────────┬────┘                         │   │
│  │                 │          │                               │   │
│  │      ┌──────────┘          └──────────┐                   │   │
│  │      v                                v                   │   │
│  │  ┌───────────────────┐  ┌─────────────────────┐          │   │
│  │  │ backend-service   │  │ frontend-service     │          │   │
│  │  │ ClusterIP :5000   │  │ ClusterIP :80        │          │   │
│  │  └────────┬──────────┘  └──────────┬──────────┘          │   │
│  │           │                        │                      │   │
│  │           v                        v                      │   │
│  │  ┌────────────────┐  ┌──────────────────────┐            │   │
│  │  │ backend pod    │  │ frontend pods (x2)   │            │   │
│  │  │ 1 replica      │  │ 2 replicas           │            │   │
│  │  │ e-shope-backend│  │ e-shope-frontend     │            │   │
│  │  │ :latest        │  │ :latest              │            │   │
│  │  │                │  └──────────────────────┘            │   │
│  │  │ initContainer: │                                      │   │
│  │  │ wait-for-pg    │                                      │   │
│  │  └────────┬───────┘                                      │   │
│  │           │                                               │   │
│  │           v                                               │   │
│  │  ┌───────────────────┐                                    │   │
│  │  │ postgres-service  │                                    │   │
│  │  │ ClusterIP :5432   │                                    │   │
│  │  └────────┬──────────┘                                    │   │
│  │           │                                               │   │
│  │           v                                               │   │
│  │  ┌────────────────┐     ┌───────────────┐                │   │
│  │  │ postgres pod   │────>│ PVC (20Gi)    │                │   │
│  │  │ 1 replica      │     │ ReadWriteOnce │                │   │
│  │  │ postgres:16    │     │ local-path    │                │   │
│  │  │ -alpine        │     └───────────────┘                │   │
│  │  │ Recreate       │                                      │   │
│  │  │ strategy       │                                      │   │
│  │  └────────────────┘                                      │   │
│  │                                                           │   │
│  │  ┌──────────────────┐  ┌──────────────────┐              │   │
│  │  │ ConfigMap        │  │ Secret           │              │   │
│  │  │ apnidunia-config │  │ postgres-secret  │              │   │
│  │  │ PORT=5000        │  │ DB creds + JWT   │              │   │
│  │  └──────────────────┘  └──────────────────┘              │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### K8s Resources Summary

| Resource       | Name              | Details                                    |
|----------------|-------------------|--------------------------------------------|
| Namespace      | apnidunia         | All app resources                          |
| Deployment     | postgres          | 1 replica, Recreate strategy               |
| Deployment     | backend           | 1 replica, initContainer (wait-for-pg)     |
| Deployment     | frontend          | 2 replicas                                 |
| Service        | postgres-service  | ClusterIP :5432                            |
| Service        | backend-service   | ClusterIP :5000                            |
| Service        | frontend-service  | ClusterIP :80                              |
| Ingress        | apnidunia-ingress | /api→backend, /→frontend                   |
| PVC            | postgres-pvc      | 20Gi, ReadWriteOnce, local-path            |
| ConfigMap      | apnidunia-config  | PORT=5000                                  |
| Secret         | postgres-secret   | DB creds, DATABASE_URL, JWT_SECRET         |

### Resource Limits

| Pod      | CPU Request | CPU Limit | Memory Request | Memory Limit |
|----------|-------------|-----------|----------------|--------------|
| postgres | 100m        | 500m      | 256Mi          | 512Mi        |
| backend  | 100m        | 500m      | 128Mi          | 512Mi        |
| frontend | 25m         | 200m      | 32Mi           | 128Mi        |

### Health Probes

| Pod      | Readiness                     | Liveness                      |
|----------|-------------------------------|-------------------------------|
| postgres | pg_isready (15s init, 5s)     | pg_isready (60s init, 10s)    |
| backend  | GET /health (10s init, 5s)    | GET /health (30s init, 15s)   |
| frontend | GET / (10s init, 10s)         | GET / (30s init, 20s)         |

---

## Authentication Flow

```
┌────────┐     POST /api/auth/login      ┌──────────┐
│ Client │ ──────────────────────────────>│ Backend  │
│        │     { email, password }        │          │
│        │                                │ bcrypt   │
│        │     { token, user }            │ compare  │
│        │ <──────────────────────────────│          │
└───┬────┘                                └──────────┘
    │
    │  Store token in localStorage
    │  Set AuthContext state
    │
    │  All subsequent API calls:
    │  Authorization: Bearer <token>
    │
    v
┌────────┐     GET /api/products          ┌──────────┐
│ Client │ ──────────────────────────────>│ Backend  │
│        │     Authorization: Bearer ...  │          │
│        │                                │ verify   │
│        │     [{ products }]             │ JWT      │
│        │ <──────────────────────────────│          │
└────────┘                                └──────────┘
```

- **JWT Secret**: `apnidunia_secret_2024`
- **Token Expiry**: 7 days
- **Storage**: localStorage (client-side)
- **Middleware**: `verifyToken()` extracts user from Bearer token

---

## Payment Flow (Mock)

```
┌────────┐  1. Select payment method   ┌──────────┐
│ Client │ ────────────────────────────>│ Backend  │
│        │  POST /api/payment/upi-qr   │          │
│        │  { amount, orderId }         │          │
│        │                              │ Generate │
│        │  { qrString, upiLink }      │ UPI link │
│        │ <────────────────────────────│          │
│        │                              └──────────┘
│        │  2. Display QR code
│        │     (qrcode.react)
│        │
│        │  3. User clicks "I've Paid"
│        │
│        │  POST /api/payment/verify    ┌──────────┐
│        │ ────────────────────────────>│ Backend  │
│        │  { transactionId }           │          │
│        │                              │ Mock     │
│        │  { success: true }           │ 1.5s     │
│        │ <────────────────────────────│ 95% pass │
│        │                              └──────────┘
│        │  4. POST /api/orders (create order)
└────────┘
```

**Supported Methods**: UPI QR, PhonePe, Google Pay (all mock/simulated)

---

## Environment Variables

### Backend

| Variable      | Default                                            | Description          |
|---------------|-----------------------------------------------------|----------------------|
| PORT          | 5000                                                | Server port          |
| DATABASE_URL  | postgresql://postgres:password@localhost:5432/apnidunia | PostgreSQL URI |
| JWT_SECRET    | apnidunia_secret_2024                               | JWT signing key      |
| DB_SSL        | (unset)                                             | Set "true" for SSL   |

### Frontend (build-time)

| Variable      | Dev                            | Docker/K8s | Description       |
|---------------|--------------------------------|------------|-------------------|
| VITE_API_URL  | http://localhost:5000/api      | /api       | API base URL      |

### PostgreSQL

| Variable            | Value                  |
|---------------------|------------------------|
| POSTGRES_DB         | apnidunia              |
| POSTGRES_USER       | postgres               |
| POSTGRES_PASSWORD   | apnidunia_pg_2024      |
| PGDATA              | /var/lib/postgresql/data/pgdata (K8s only) |

---

## Color Scheme

### Main Site (Flipkart-inspired)
| Element     | Color     |
|-------------|-----------|
| Primary     | `#2874f0` |
| Yellow CTA  | `#ffe500` |
| Success     | `#388e3c` |
| Page BG     | `#f1f3f6` |
| Footer BG   | `#172337` |

### Login Page (Glassmorphism)
| Element      | Value                              |
|--------------|------------------------------------|
| Background   | `#0f0c29 → #302b63 → #24243e`     |
| Accent       | `#6366f1 → #8b5cf6`               |
| Card         | `rgba(255,255,255,0.05)` + blur(20px) |

---

## Key Design Decisions

1. **Inline styles only** - Tailwind CSS pipeline broken with Vite 7; all layout uses React `style={{}}`
2. **No migration tool** - Schema defined in `initDb()` with `CREATE TABLE IF NOT EXISTS` (idempotent)
3. **Shared Docker images** - Same `e-shope-*` images used by both Docker Compose and K8s
4. **initContainer** - Backend waits for postgres via `pg_isready` loop (prevents crash-restart)
5. **Recreate strategy** - Postgres uses Recreate (not RollingUpdate) due to ReadWriteOnce PVC
6. **PGDATA subdirectory** - `/var/lib/postgresql/data/pgdata` avoids "directory not empty" error
7. **Frontend replicas=2** - Static files scale freely; backend=1 for local dev
8. **Mock payments** - No real payment gateway; simulated with 95% success rate
9. **`--no-cache` rebuilds** - Docker layer cache can serve stale JS bundles after code changes

---

## Scripts Reference

| Script                | Description                                         |
|-----------------------|-----------------------------------------------------|
| `start.sh`           | Docker Compose build + start                        |
| `stop.sh`            | Docker Compose down                                 |
| `k8s/deploy.sh`      | Full K8s deploy (cluster → ingress → load → apply)  |
| `k8s/redeploy.sh`    | Rebuild image + reload into kind (backend/frontend/all) |
| `k8s/start.sh`       | Resume pods after stop (scale up)                   |
| `k8s/stop.sh`        | Pause pods (scale to 0, data preserved)             |
| `k8s/teardown.sh`    | Delete kind cluster entirely                        |

---

## Production Considerations

1. **Secrets**: Move to Sealed Secrets or External Secrets Operator (currently in git)
2. **Storage**: Replace local-path with cloud StorageClass (EBS/GCP PD/Azure Disk)
3. **TLS**: Configure cert-manager + Let's Encrypt (TLS section in ingress.yaml is commented out)
4. **Network Policy**: Restrict postgres access to backend pod only
5. **Registry**: Push images to container registry (ECR/GCR/ACR) instead of `kind load`
6. **HA**: Use managed K8s (EKS/GKE/AKS) with multi-node, not single-node kind
7. **JWT**: Move from localStorage to httpOnly cookies for XSS protection
8. **Payments**: Integrate real payment gateway (Razorpay/Stripe)
