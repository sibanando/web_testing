# E-Shope (ApniDunia)

A full-stack e-commerce application — React + Vite frontend, Node/Express backend, PostgreSQL database.

## Features

- Product catalog with categories, search, and filters
- Shopping cart and checkout with mock PhonePe / Google Pay / UPI QR
- **Dual login system** — Email + Password or Mobile + OTP (Flipkart-style)
- Admin panel (product & user management, role toggle)
- Seller panel with stats and product image upload
- Order management with transaction tracking

## Authentication

| Method | Flow |
|--------|------|
| Email + Password | Enter email & password → Sign In |
| Mobile + OTP | Enter 10-digit mobile → Request OTP → Enter 6-digit OTP → Verify & Login |

- OTP login auto-creates an account if the mobile number is new
- Registration supports both email and mobile, with Customer/Seller account types
- Demo OTP is shown on screen (no real SMS gateway — integrate Twilio/AWS SNS for production)

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React 19, Vite 7, Nginx       |
| Backend  | Node 20, Express, `pg`        |
| Database | PostgreSQL 16                 |
| Infra    | Kubernetes (kind) / Docker Compose |

---

## Run with Kubernetes (recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

### One-command deploy

```bash
# From project root
bash k8s/deploy.sh
```

Then open **http://localhost:8080**

### What the script does
1. Creates a kind cluster with ingress port mappings
2. Installs nginx ingress controller
3. Builds backend + frontend Docker images
4. Loads them into the kind cluster (no registry needed)
5. Applies all K8s manifests via kustomize
6. Waits for every pod to be `Ready`

### After code changes (fast reload)

```bash
bash k8s/redeploy.sh backend    # rebuild + reload backend only
bash k8s/redeploy.sh frontend   # rebuild + reload frontend only
bash k8s/redeploy.sh            # both
```

### Tear down

```bash
bash k8s/teardown.sh
```

### Kubernetes manifests (`k8s/`)

| File | Purpose |
|------|---------|
| `namespace.yaml` | `apnidunia` namespace |
| `postgres-secret.yaml` | DB credentials + JWT secret |
| `configmap.yaml` | Non-secret env vars |
| `postgres-pvc.yaml` | 20 Gi PVC (kind local-path provisioner) |
| `postgres-deployment.yaml` | Postgres 16, `PGDATA` subdir, Recreate strategy |
| `postgres-service.yaml` | ClusterIP on 5432 |
| `backend-deployment.yaml` | Express API, initContainer waits for pg |
| `backend-service.yaml` | ClusterIP on 5000 |
| `frontend-deployment.yaml` | Nginx serving Vite build |
| `frontend-service.yaml` | ClusterIP on 80 |
| `ingress.yaml` | Routes `/api` → backend, `/` → frontend |
| `kind-config.yaml` | Cluster config with port 8080→80 mapping |

### Access

| URL | Description |
|-----|-------------|
| http://localhost:8080 | Frontend |
| http://localhost:8080/api/health | Backend health |
| http://localhost:8080/admin | Admin panel |

---

## Run with Docker Compose (simple local dev)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8181 |
| Backend API | http://localhost:5000 |

---

## Demo Credentials

| Role | Email / Name | Password |
|------|-------------|----------|
| Admin | `sibanando` / `Sib@1984` | `Sib@1984` |
| Customer | `user@example.com` | `password123` |
| Seller | `seller@apnidunia.com` | `seller123` |

You can also log in with any 10-digit mobile number using the OTP flow (demo OTP is displayed on screen).

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email/phone + password |
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/send-otp` | Send OTP to mobile number |
| POST | `/api/auth/verify-otp` | Verify OTP and login |
| PUT | `/api/auth/profile/:id` | Update user profile |

### Products & Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (search, category, pagination) |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/user/:id` | Get user's orders |
| POST | `/api/upload` | Upload product image (5MB, images only) |

### Admin & Seller
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/admin/*` | Admin CRUD for products & users |
| GET/POST/PUT/DELETE | `/api/seller/*` | Seller product management + stats |

---

## Project structure

```
E-Shope/
├── backend/          # Express API
│   ├── index.js      # Entry point
│   ├── Dockerfile
│   ├── uploads/      # Product images (multer)
│   └── src/
│       ├── config/db.js
│       └── routes/
│           ├── authRoute.js      # Login, register, OTP
│           ├── adminRoute.js     # Admin CRUD
│           ├── sellerRoute.js    # Seller CRUD
│           ├── orderRoute.js     # Orders
│           └── uploadRoute.js    # Image upload
├── frontend/         # React + Vite
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── context/AuthContext.jsx
│       ├── pages/
│       │   ├── Login.jsx         # Email/Mobile dual login
│       │   ├── Home.jsx
│       │   ├── Admin.jsx
│       │   ├── SellerDashboard.jsx
│       │   └── ...
│       └── components/
├── k8s/              # Kubernetes manifests
│   ├── deploy.sh
│   ├── redeploy.sh
│   └── teardown.sh
└── docker-compose.yml
```

## Notes

- Database is seeded with demo users and 21 products on first start
- Auth uses JWT stored in LocalStorage (7-day expiry)
- Mobile OTP is simulated (in-memory store, shown in UI) — plug in Twilio/AWS SNS for production
- Tailwind is disabled — all styles use React inline `style={{}}`
- Product images are uploaded via multer and served statically from `/uploads/`
