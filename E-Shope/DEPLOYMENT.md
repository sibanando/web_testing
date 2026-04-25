# Deployment Guide — E-Shope (ApniDunia)

---

## Quick Start

### Docker Compose (local dev / demo)

```bash
# First time or after code changes
docker compose up --build -d

# Stop
docker compose down

# Logs
docker compose logs -f backend
docker compose logs -f frontend
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5555 |
| Backend API | http://localhost:5000 |
| Health check | http://localhost:5000/health |

---

### Kubernetes / kind (staging)

```bash
# Full deploy (creates cluster, installs ingress, builds images, applies manifests)
bash k8s/deploy.sh

# Open app
http://localhost:8080
```

#### Useful k8s scripts

| Script | What it does |
|--------|-------------|
| `k8s/deploy.sh` | Full deploy from scratch |
| `k8s/redeploy.sh [backend\|frontend]` | Rebuild + reload one or both images |
| `k8s/start.sh` | Resume pods (after stop, data preserved) |
| `k8s/stop.sh` | Scale all pods to 0 |
| `k8s/teardown.sh` | Delete kind cluster entirely |

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Express listen port |
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/apnidunia` | PostgreSQL connection string |
| `JWT_SECRET` | `apnidunia_secret_2024` | JWT signing secret — **change in production** |
| `DB_SSL` | (unset) | Set `true` to enable SSL for managed DBs |
| `ALLOWED_ORIGINS` | `http://localhost,http://localhost:5173,...` | Comma-separated CORS origins |

### Frontend (build-time Vite)

| Variable | Dev | Docker/K8s |
|----------|-----|-----------|
| `VITE_API_URL` | `http://localhost:5000/api` | `/api` |

### PostgreSQL

| Variable | Value |
|----------|-------|
| `POSTGRES_DB` | `apnidunia` |
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | `apnidunia_pg_2024` |

> **Production**: Move all secrets out of `docker-compose.yml` into a `.env` file (gitignored) or Kubernetes Sealed Secrets.

---

## Docker Images

| Image | Base | Purpose |
|-------|------|---------|
| `e-shope-backend` | `node:20-alpine` | Express API |
| `e-shope-frontend` | `nginx:1.27-alpine` | Nginx + React SPA |
| `postgres:16-alpine` | official | Database |

### Frontend build (multi-stage)

```
Stage 1 — node:20-alpine
  VITE_API_URL baked in at build time
  npm ci → npm run build → dist/

Stage 2 — nginx:1.27-alpine
  COPY dist/ → /usr/share/nginx/html
  nginx.conf: SPA fallback, /api proxy, /uploads proxy, gzip
```

---

## Database

### Schema (auto-created on first start)

Defined in `backend/src/config/db.js` → `initDb()`. Uses `CREATE TABLE IF NOT EXISTS` — safe to call on restart.

Tables: `users`, `products`, `orders`, `order_items`

Indexes automatically created:
- `idx_products_category`
- `idx_products_seller_id`
- `idx_orders_user_id`
- `idx_order_items_order_id`
- `idx_order_items_product_id`

### Seed data (auto-seeded if tables empty)

| Role | Email | Password |
|------|-------|----------|
| Admin | sibanando@apnidunia.com | Sib@1984 |
| Customer | user@example.com | password123 |
| Seller | seller@apnidunia.com | seller123 |

21 products across 10 categories are seeded automatically.

### Manual seed restore

```bash
# Docker Compose (mounts automatically)
docker compose down -v && docker compose up --build -d

# Or apply directly
psql -U postgres -d apnidunia -f db-seed.sql
```

---

## Nginx (Frontend)

```nginx
location /          # SPA fallback → index.html
location /api/      # proxy_pass → backend-service:5000/api/
location /uploads/  # proxy_pass → backend-service:5000/uploads/
gzip on             # JS, CSS, JSON, SVG
```

Static assets cached for 1 year (`Cache-Control: max-age=31536000, immutable`).

---

## Kubernetes Resources

### Namespace: `apnidunia`

| Resource | Name | Details |
|----------|------|---------|
| Deployment | postgres | 1 replica, Recreate strategy |
| Deployment | backend | 1 replica, initContainer waits for pg |
| Deployment | frontend | 2 replicas |
| Service | postgres-service | ClusterIP :5432 |
| Service | backend-service | ClusterIP :5000 |
| Service | frontend-service | ClusterIP :80 |
| Ingress | apnidunia-ingress | `/api` → backend, `/` → frontend |
| PVC | postgres-pvc | 20Gi, ReadWriteOnce, local-path |
| ConfigMap | apnidunia-config | PORT=5000 |
| Secret | postgres-secret | DB creds + JWT_SECRET |

### Resource limits

| Pod | CPU req/limit | Memory req/limit |
|-----|--------------|-----------------|
| postgres | 100m / 500m | 256Mi / 512Mi |
| backend | 100m / 500m | 128Mi / 512Mi |
| frontend | 25m / 200m | 32Mi / 128Mi |

### Health probes

| Pod | Readiness | Liveness |
|-----|-----------|---------|
| postgres | `pg_isready` (15s init, 5s interval) | `pg_isready` (60s init, 10s interval) |
| backend | `GET /health` (10s init, 5s interval) | `GET /health` (30s init, 15s interval) |
| frontend | `GET /` (10s init, 10s interval) | `GET /` (30s init, 20s interval) |

---

## After Code Changes

### Docker Compose

```bash
docker compose up --build -d
```

### Kubernetes

```bash
bash k8s/redeploy.sh backend    # backend only
bash k8s/redeploy.sh frontend   # frontend only
bash k8s/redeploy.sh            # both
```

---

## Production Checklist

- [ ] Set `JWT_SECRET` to a strong random value (not the default)
- [ ] Set `POSTGRES_PASSWORD` to a strong password
- [ ] Add `ALLOWED_ORIGINS` to restrict CORS to your domain
- [ ] Move secrets to `.env` (gitignored) or Kubernetes Sealed Secrets
- [ ] Replace local-path PVC with a cloud StorageClass (EBS / GCP PD / Azure Disk)
- [ ] Configure TLS with cert-manager + Let's Encrypt
- [ ] Integrate a real payment gateway (Razorpay recommended for India)
- [ ] Replace OTP simulation with Twilio or AWS SNS
- [ ] Add a `NetworkPolicy` to restrict postgres access to the backend pod only
- [ ] Push Docker images to a container registry (ECR / GCR / ACR)
- [ ] Switch JWT storage from localStorage to httpOnly cookies
