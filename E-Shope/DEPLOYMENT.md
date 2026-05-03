# Deployment Guide — E-Shope (ApniDunia)

## Table of Contents
1. [Quick Start — Docker Compose](#1-quick-start--docker-compose)
2. [Environment Variables](#2-environment-variables)
3. [Object Storage — MinIO](#3-object-storage--minio)
4. [Kubernetes / kind (local staging)](#4-kubernetes--kind-local-staging)
5. [Production Kubernetes (cloud)](#5-production-kubernetes-cloud)
6. [Enabling TLS / HTTPS](#6-enabling-tls--https)
7. [SMS OTP Setup](#7-sms-otp-setup)
8. [Email (SMTP) Setup](#8-email-smtp-setup)
9. [OAuth Social Login Setup](#9-oauth-social-login-setup)
10. [Database](#10-database)
11. [CI/CD — GitHub Actions](#11-cicd--github-actions)
12. [After Code Changes](#12-after-code-changes)
13. [Security Hardening](#13-security-hardening)
14. [Production Checklist](#14-production-checklist)

---

## 1. Quick Start — Docker Compose

```bash
# 1. Copy env template
cp .env.example .env
# Edit .env — at minimum change JWT_SECRET and POSTGRES_PASSWORD

# 2. Build and start all services
docker compose up --build -d

# 3. Open
open http://localhost:5555          # frontend
curl http://localhost:5000/health   # backend liveness
curl http://localhost:5000/ready    # backend + DB readiness
```

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:5555 | React app via nginx |
| Backend API | http://localhost:5000 | Express, direct access |
| MinIO Console | http://localhost:9001 | Object storage UI |
| Uptime Kuma | http://localhost:3001 | Uptime monitoring dashboard |
| Liveness | http://localhost:5000/health | |
| Readiness | http://localhost:5000/ready | Checks DB connection |

> MinIO default credentials: user `apnidunia` / password `apnidunia_minio_2024` — change in production.

```bash
docker compose down          # stop (keep data)
docker compose down -v       # stop + wipe all volumes (DB, MinIO, Redis)
docker compose logs -f backend
docker compose logs -f frontend
```

---

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in all values.

| Variable | Default | Production |
|----------|---------|------------|
| `JWT_SECRET` | `apnidunia_secret_2024` | **REQUIRED** — `openssl rand -hex 64` |
| `POSTGRES_PASSWORD` | `apnidunia_pg_2024` | **REQUIRED** — strong password |
| `DATABASE_URL` | built from POSTGRES_PASSWORD | Full DSN for external DB |
| `ALLOWED_ORIGINS` | open | `https://yourdomain.com` |
| `FAST2SMS_API_KEY` | (empty = console log) | Free key at fast2sms.com |
| `DB_SSL` | `false` | `true` for RDS / Cloud SQL / Azure |
| `NODE_ENV` | (unset) | `production` |
| `PORT` | `5000` | Leave as-is |
| `FRONTEND_URL` | `http://localhost:5555` | `https://yourdomain.com` |
| `BACKEND_URL` | `http://localhost:5000` | `https://api.yourdomain.com` |
| `REDIS_URL` | `redis://redis:6379` | Managed Redis URL in production |
| `MINIO_ENDPOINT` | `http://minio:9000` | Internal MinIO address (docker/k8s) |
| `MINIO_ACCESS_KEY` | `apnidunia` | **Must change** in production |
| `MINIO_SECRET_KEY` | `apnidunia_minio_2024` | **Must change** in production |
| `MINIO_BUCKET` | `apnidunia` | Bucket name |
| `SMTP_HOST` | (empty — email disabled) | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `587` | 465 for SSL, 587 for STARTTLS |
| `SMTP_USER` | (empty) | SMTP username / email |
| `SMTP_PASS` | (empty) | SMTP password / app password |
| `SMTP_FROM` | `ApniDunia <noreply@apnidunia.com>` | From address for outbound email |
| `GOOGLE_CLIENT_ID` | (empty — button shows "not configured") | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | (empty) | From Google Cloud Console |
| `MICROSOFT_CLIENT_ID` | (empty — button shows "not configured") | From Azure App registration |
| `MICROSOFT_CLIENT_SECRET` | (empty) | From Azure App registration |
| `MICROSOFT_TENANT_ID` | `common` | `common` or your tenant GUID |

### Frontend build-time variable

| Variable | Dev | Docker / K8s |
|----------|-----|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | `/api` (nginx proxies it) |

> The backend exits at startup if `NODE_ENV=production` and `JWT_SECRET` is the default value.

---

## 3. Object Storage — MinIO

MinIO is included in `docker-compose.yml` and starts automatically. Product images are uploaded to MinIO, resized to 800px WebP by Sharp, and served via the nginx `/uploads/` proxy — so image URLs are always host-independent (`/uploads/<filename>`).

### How it works

```
Browser → nginx :5555/uploads/foo.webp
       → nginx proxies to → http://minio:9000/apnidunia/foo.webp
```

Stored DB values are `/uploads/<filename>`, **never** `http://IP:port/...`. If you find old baked-in URLs, migrate them:

```sql
UPDATE products
SET images = regexp_replace(
    images,
    'https?://[^/"]+/[^/"]+/([^"]+)',
    '/uploads/\1',
    'g'
)
WHERE images ~ 'https?://';
```

### MinIO Console

Access at http://localhost:9001 (dev) or expose port 9001 through your ingress in production.

Default login: `apnidunia` / `apnidunia_minio_2024` — **change both before production**.

### Production: swap to S3-compatible cloud storage

Set `MINIO_ENDPOINT` to your S3-compatible endpoint (AWS S3, Cloudflare R2, Backblaze B2, etc.) and set the matching keys. The nginx proxy rule stays the same — it always points to `minio:9000` internally; update the proxy target in `frontend/nginx.conf` if your storage is external.

---

## 4. Kubernetes / kind (local staging)

### Prerequisites
```bash
# kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
# kubectl — https://kubernetes.io/docs/tasks/tools/
```

### Full deploy from scratch
```bash
bash k8s/deploy.sh
# Opens at http://localhost:8080
```

### Scripts

| Script | What it does |
|--------|-------------|
| `k8s/deploy.sh` | Create cluster, install ingress, build images, apply manifests |
| `k8s/redeploy.sh [backend\|frontend]` | Rebuild + rolling-reload one or both services |
| `k8s/start.sh` | Resume pods after `stop.sh` |
| `k8s/stop.sh` | Scale all pods to 0 |
| `k8s/teardown.sh` | Delete the kind cluster entirely |

```bash
# Manual apply
kubectl apply -k k8s/
```

---

## 5. Production Kubernetes (cloud)

### Build and push images

```bash
REGISTRY=ghcr.io/your-org/e-shope  # or ECR / GCR / ACR

docker build -t $REGISTRY/backend:latest ./backend
docker push $REGISTRY/backend:latest

docker build --build-arg VITE_API_URL=/api \
  -t $REGISTRY/frontend:latest ./frontend
docker push $REGISTRY/frontend:latest
```

Update `k8s/backend-deployment.yaml` and `k8s/frontend-deployment.yaml`:
```yaml
image: ghcr.io/your-org/e-shope/backend:latest
imagePullPolicy: Always
```

### Manage secrets securely

**Option A — kubectl secret (simplest)**
```bash
kubectl create namespace apnidunia --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic app-secret \
  --namespace apnidunia \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -hex 32) \
  --from-literal=JWT_SECRET=$(openssl rand -hex 64) \
  --from-literal=MINIO_ACCESS_KEY=apnidunia-prod \
  --from-literal=MINIO_SECRET_KEY=$(openssl rand -hex 32) \
  --from-literal=DATABASE_URL="postgresql://postgres:YOURPASS@postgres-service:5432/apnidunia"
```

**Option B — Sealed Secrets (GitOps safe)**
```bash
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system
kubeseal --format yaml < k8s/postgres-secret.yaml > k8s/sealed-secret.yaml
# sealed-secret.yaml is safe to commit
```

**Option C — External Secrets Operator (AWS/GCP/Azure vaults)**
```bash
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system --create-namespace
# Then configure ExternalSecret CRDs pointing at your vault
```

### Deploy
```bash
kubectl apply -k k8s/
kubectl rollout status deployment/backend  -n apnidunia
kubectl rollout status deployment/frontend -n apnidunia
```

### Install nginx ingress controller
```bash
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer
```

---

## 6. Enabling TLS / HTTPS

### Install cert-manager
```bash
helm install cert-manager cert-manager/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true
```

### Create ClusterIssuer
```yaml
# k8s/cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your@email.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```
```bash
kubectl apply -f k8s/cluster-issuer.yaml
```

### Uncomment TLS in `k8s/ingress.yaml`
```yaml
annotations:
  cert-manager.io/cluster-issuer: "letsencrypt-prod"
  nginx.ingress.kubernetes.io/ssl-redirect: "true"
  nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
tls:
  - hosts: [apnidunia.com, www.apnidunia.com]
    secretName: apnidunia-tls
```
```bash
kubectl apply -f k8s/ingress.yaml
```

---

## 7. SMS OTP Setup

By default, OTP is printed to the backend log. To deliver real SMS to Indian numbers:

1. Sign up free at [fast2sms.com](https://fast2sms.com)
2. **Dashboard → Dev API** → copy API key
3. Set `FAST2SMS_API_KEY=your_key` in `.env` (Docker) or K8s secret
4. Rebuild/redeploy

When key is absent: `docker compose logs backend` shows the OTP.

---

## 8. Email (SMTP) Setup

Email is optional. When `SMTP_HOST` is not set, email features (order confirmations, notifications) are silently skipped.

### Gmail example
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password   # Google → Account → Security → App passwords
SMTP_FROM=ApniDunia <you@gmail.com>
```

### Other providers
Use the SMTP credentials from your provider (SendGrid, Mailgun, AWS SES, Zoho, etc.). For port 465 (implicit TLS) set `SMTP_SECURE=true`.

---

## 9. OAuth Social Login Setup

Users can sign in with **Google (Gmail)** or **Microsoft (Outlook/Work)** accounts. The flow uses the server-side Authorization Code grant — no extra npm packages required.

Both buttons degrade gracefully: if the credentials are absent they redirect back to `/login` with a readable error message. No crashes, no blank screens.

### Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. **Create credentials → OAuth 2.0 Client ID** → Application type: **Web application**
3. Add to **Authorised redirect URIs**:
   - Dev: `http://localhost:5000/api/auth/google/callback`
   - Prod: `https://api.yourdomain.com/api/auth/google/callback`
4. Copy **Client ID** and **Client secret** into `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```
5. Also enable the **Google People API** (or **OAuth2 API**) on the project.

### Microsoft OAuth (Outlook / Work accounts)

1. Go to [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID → App registrations → New registration**
2. Name: `ApniDunia` — Supported account types: **Accounts in any organisational directory and personal Microsoft accounts**
3. **Redirect URI** → Platform: **Web**:
   - Dev: `http://localhost:5000/api/auth/microsoft/callback`
   - Prod: `https://api.yourdomain.com/api/auth/microsoft/callback`
4. After creation, go to **Certificates & secrets → New client secret** — copy the value immediately
5. Copy into `.env`:
   ```
   MICROSOFT_CLIENT_ID=your_application_id
   MICROSOFT_CLIENT_SECRET=your_secret_value
   MICROSOFT_TENANT_ID=common
   ```
   Use `common` to accept both personal and work/school accounts. Replace with a specific tenant GUID to restrict to one organisation.

### Production-only variables

These default to localhost in dev — only required for production:
```
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

The OAuth callback URLs registered in Google/Microsoft consoles must match `BACKEND_URL/api/auth/{google,microsoft}/callback` exactly.

### How account linking works

| Scenario | Result |
|----------|--------|
| New email via OAuth | New Customer account created |
| Email already exists (registered via email/password) | OAuth credentials linked to existing account |
| Same provider + account used again | Existing account found by `(provider, oauth_id)` — no duplicate |
| New OAuth user is a seller | Admin must upgrade from Users tab in Admin panel |

---

## 10. Database

### Auto-schema (CREATE TABLE IF NOT EXISTS on every start)

Tables: `users`, `products`, `orders`, `order_items`, `delivery_agents`, `deliveries`,
`wishlists`, `reviews`, `support_tickets`, `loyalty_points`, `notifications`

Indexes auto-created on: `products.category`, `products.seller_id`, `orders.user_id`, `order_items.order_id`

### Seed data (applied once, if tables are empty)

| Role | Email / Phone | Password |
|------|--------------|----------|
| Admin | sibanando@apnidunia.com | Sib@1984 |
| Customer | user@example.com | password123 |
| Seller | seller@apnidunia.com | seller123 |
| Delivery Agent | phone: 9876543210 | agent123 |

21 products across 10 categories.

### Reset database
```bash
# Docker Compose
docker compose down -v && docker compose up --build -d

# Kubernetes
kubectl delete pvc postgres-pvc -n apnidunia
kubectl apply -f k8s/postgres-pvc.yaml
kubectl rollout restart deployment/postgres -n apnidunia
```

### External managed database (RDS, Cloud SQL, Azure)
1. Set `DATABASE_URL` to the full managed DSN
2. Set `DB_SSL=true`
3. Remove `postgres-deployment.yaml`, `postgres-service.yaml`, `postgres-pvc.yaml`, `postgres-pv.yaml` from your apply

---

## 11. CI/CD — GitHub Actions

`.github/workflows/ci.yml` runs on push to `main` / `develop` and on PRs to `main`:

| Job | Steps |
|-----|-------|
| `backend` | `npm ci` → `npm audit --audit-level=high` → check for hardcoded secrets |
| `frontend` | `npm ci` → `npm run build` → `npm audit` |
| `docker` | Build both images via Buildx (validates Dockerfiles, no push) |

### Enable image publishing to GHCR

Uncomment the `publish` job in `.github/workflows/ci.yml`. It uses `GITHUB_TOKEN` automatically — no extra secrets needed.

---

## 12. After Code Changes

### Docker Compose
```bash
# Rebuild only what changed
docker compose up --build -d backend    # backend only
docker compose up --build -d frontend   # frontend only
docker compose up --build -d            # everything

# Hard-refresh browser (Ctrl+Shift+R) after frontend changes
# If nginx cached stale DNS after backend restart:
docker exec e-shope-frontend-1 nginx -s reload
```

### Kubernetes
```bash
bash k8s/redeploy.sh backend    # backend only
bash k8s/redeploy.sh frontend   # frontend only
bash k8s/redeploy.sh            # both

# Or rolling restart after pushing new image
kubectl rollout restart deployment/backend  -n apnidunia
kubectl rollout restart deployment/frontend -n apnidunia
```

---

## 13. Security Hardening

### Vulnerabilities fixed

| Severity | Issue | Fix applied |
|----------|-------|-------------|
| Critical | CORS `startsWith` bypass — crafted subdomain could spoof origin | Changed to strict `===` match in `index.js` |
| Critical | Client-supplied order price — user could send `total: 1` | Order total and item prices now fetched server-side from DB |
| High | OTP brute-force — wrong guesses didn't invalidate OTP | OTP deleted on first wrong guess; `/verify-otp` rate-limited (3/min) |
| High | Payment endpoints unauthenticated — anyone could create/poll sessions | `verifyToken` added to all `/api/payment/*` routes |
| High | ReDoS in `minimatch`, `path-to-regexp`, `picomatch` (npm deps) | `npm audit fix` — 0 vulnerabilities |
| High | Internal DB errors exposed in API responses | Replaced with generic 500 messages; errors logged server-side only |
| High | Delivery agent JWTs accepted by `verifyToken` — `user_id = undefined` caused DB NOT NULL violations | `verifyToken` now rejects any JWT without `.id` in payload |
| Medium | DB SSL `rejectUnauthorized: false` — accepted invalid certs | Changed to `true` |
| Medium | Any logged-in user could upload files (storage abuse) | Upload restricted to sellers and admins only |
| Medium | No password minimum length | 8-character minimum enforced at registration |
| Medium | MinIO image URLs baked with server IP — broke on IP change | `uploadBuffer` now returns `/uploads/<filename>`; nginx proxies to MinIO internally |

### Known remaining limitations

- **Rate limiter is in-memory** — per-pod counters don't sync in K8s multi-replica deployments. Add `rate-limit-redis`:
  ```bash
  npm install rate-limit-redis ioredis
  ```
  Then pass a `store` option to each `rateLimit()` call in `index.js`.

- **`trust proxy` not set** — nginx sends `X-Forwarded-For` but Express doesn't trust it, causing `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` warnings. Add before rate limiters:
  ```js
  app.set('trust proxy', 1);
  ```

- **OTP / OAuth state stores are in-memory** — neither survives pod restarts nor syncs across replicas. Replace both `otpStore` and `oauthStateStore` Maps in `authRoute.js` with Redis + TTL:
  ```js
  await redis.set(`otp:${phone}`, otp, 'EX', 300); // 5-min TTL
  ```

- **CSP disabled** — `contentSecurityPolicy: false` in helmet. Enable for hardened production:
  ```js
  helmet({
      contentSecurityPolicy: {
          directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "https:", "data:"],
          }
      }
  })
  ```

- **Mock payments** — integrate [Razorpay](https://razorpay.com) or [Cashfree](https://cashfree.com) before going live.

### Running a security audit

```bash
# Inside backend container
docker exec e-shope-backend-1 npm audit

# Or with docker run (if container is down)
docker run --rm -v $(pwd)/backend:/app -w /app node:20-alpine npm audit
```

---

## 14. Production Checklist

### Security
- [ ] `JWT_SECRET` changed (`openssl rand -hex 64`)
- [ ] `POSTGRES_PASSWORD` changed from default
- [ ] `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` changed from defaults
- [ ] `ALLOWED_ORIGINS` set to exact origin(s) — e.g. `https://yourdomain.com` (no trailing slash)
- [ ] `NODE_ENV=production` set
- [ ] Secrets in `.env` (gitignored) or Sealed Secrets — **not committed to git**
- [ ] TLS enabled (cert-manager + Let's Encrypt)
- [ ] Git remote URL does not contain credentials (use SSH or token via env)
- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] CSP configured in helmet (currently disabled — see Section 13)
- [ ] Rate limiter backed by Redis for multi-replica deployments
- [ ] `app.set('trust proxy', 1)` added before rate limiters (nginx reverse proxy)

### Infrastructure
- [ ] Images pushed to a registry (GHCR / ECR / GCR / ACR)
- [ ] `imagePullPolicy: Always` in K8s deployments
- [ ] PVC StorageClass → cloud-native (EBS / GCP PD / Azure Disk)
- [ ] Postgres as managed service for HA (RDS / Cloud SQL / Azure DB)
- [ ] `DB_SSL=true` (and managed DB uses a valid CA-signed cert — `rejectUnauthorized: true`)
- [ ] Redis as managed service (ElastiCache / Upstash / Azure Cache)
- [ ] MinIO → S3-compatible cloud storage (`MINIO_ENDPOINT` points to provider)
- [ ] `k8s/network-policy.yaml` applied (postgres ↔ backend only)

### Application
- [ ] `FAST2SMS_API_KEY` set for real OTP delivery
- [ ] OTP store migrated from in-memory Map to Redis (required for HA)
- [ ] SMTP configured (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) for transactional email
- [ ] Real payment gateway integrated (Razorpay for India)
- [ ] Demo credentials removed or rotated in production seed
- [ ] All product images stored as `/uploads/<filename>` — no baked-in host URLs in DB

### OAuth Social Login
- [ ] `FRONTEND_URL` and `BACKEND_URL` set to production HTTPS URLs
- [ ] Google OAuth: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` set; redirect URI `https://api.yourdomain.com/api/auth/google/callback` registered in Google Cloud Console
- [ ] Microsoft OAuth: `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET` + `MICROSOFT_TENANT_ID` set; redirect URI registered in Azure App Registration
- [ ] OAuth state store migrated from in-memory Map to Redis (required for HA; prevents CSRF across pod restarts)
- [ ] Verified account linking works as expected for existing email users

### Observability
- [ ] `morgan combined` logs flowing to a log aggregator
- [ ] `/health` and `/ready` probes verified in cluster
- [ ] Pod restart alerts configured
- [ ] Uptime Kuma monitors configured for frontend, backend `/ready`, and MinIO
