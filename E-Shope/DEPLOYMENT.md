# Deployment Guide — E-Shope (ApniDunia)

## Table of Contents
1. [Quick Start — Docker Compose](#1-quick-start--docker-compose)
2. [Environment Variables](#2-environment-variables)
3. [Kubernetes / kind (local staging)](#3-kubernetes--kind-local-staging)
4. [Production Kubernetes (cloud)](#4-production-kubernetes-cloud)
5. [Enabling TLS / HTTPS](#5-enabling-tls--https)
6. [SMS OTP Setup](#6-sms-otp-setup)
7. [OAuth Social Login Setup](#7-oauth-social-login-setup)
8. [Database](#8-database)
9. [CI/CD — GitHub Actions](#9-cicd--github-actions)
10. [After Code Changes](#10-after-code-changes)
11. [Security Hardening](#11-security-hardening)
12. [Production Checklist](#12-production-checklist)

---

## 1. Quick Start — Docker Compose

```bash
# 1. Copy env template
cp .env.example .env
# Edit .env — at minimum change JWT_SECRET and POSTGRES_PASSWORD

# 2. Build and start
docker compose up --build -d

# 3. Open
open http://localhost:5555          # frontend
curl http://localhost:5000/health   # backend liveness
curl http://localhost:5000/ready    # backend + DB readiness
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5555 |
| Backend API | http://localhost:5000 |
| Liveness | http://localhost:5000/health |
| Readiness | http://localhost:5000/ready |

```bash
docker compose down          # stop (keep data)
docker compose down -v       # stop + wipe DB volume
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
| `GOOGLE_CLIENT_ID` | (empty — button shows "not configured") | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | (empty) | From Google Cloud Console |
| `MICROSOFT_CLIENT_ID` | (empty — button shows "not configured") | From Azure App registration |
| `MICROSOFT_CLIENT_SECRET` | (empty) | From Azure App registration |
| `MICROSOFT_TENANT_ID` | `common` | `common` or your tenant GUID |

> The backend exits at startup if `NODE_ENV=production` and `JWT_SECRET` is the default value.

### Frontend build-time variable

| Variable | Dev | Docker / K8s |
|----------|-----|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | `/api` (nginx proxies it) |

---

## 3. Kubernetes / kind (local staging)

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

## 4. Production Kubernetes (cloud)

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
kubectl create secret generic postgres-secret \
  --namespace apnidunia \
  --from-literal=POSTGRES_DB=apnidunia \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -hex 32) \
  --from-literal=JWT_SECRET=$(openssl rand -hex 64) \
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

### File uploads — use object storage in production

Multer writes to the container filesystem by default (ephemeral). Swap to:

| Cloud | Service | Library |
|-------|---------|---------|
| AWS | S3 | `multer-s3` |
| GCP | Cloud Storage | `@google-cloud/storage` |
| Azure | Blob Storage | `multer-azure-blob-storage` |

Update `backend/src/routes/uploadRoute.js` with the cloud storage adapter.

---

## 5. Enabling TLS / HTTPS

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

## 6. SMS OTP Setup

By default, OTP is printed to the backend log. To deliver real SMS to Indian numbers:

1. Sign up free at [fast2sms.com](https://fast2sms.com)
2. **Dashboard → Dev API** → copy API key
3. Set `FAST2SMS_API_KEY=your_key` in `.env` (Docker) or K8s secret
4. Rebuild/redeploy

When key is absent: `docker compose logs backend` shows the OTP.

---

## 7. OAuth Social Login Setup

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

## 8. Database


### Auto-schema (CREATE TABLE IF NOT EXISTS on every start)

Tables: `users`, `products`, `orders`, `order_items`
Indexes auto-created on: `products.category`, `products.seller_id`, `orders.user_id`, `order_items.order_id`

### Seed data (applied once, if tables are empty)

| Role | Email | Password |
|------|-------|----------|
| Admin | sibanando@apnidunia.com | Sib@1984 |
| Customer | user@example.com | password123 |
| Seller | seller@apnidunia.com | seller123 |

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

## 9. CI/CD — GitHub Actions

`.github/workflows/ci.yml` runs on push to `main` / `develop` and on PRs to `main`:

| Job | Steps |
|-----|-------|
| `backend` | `npm ci` → `npm audit --audit-level=high` → check for hardcoded secrets |
| `frontend` | `npm ci` → `npm run build` → `npm audit` |
| `docker` | Build both images via Buildx (validates Dockerfiles, no push) |

### Enable image publishing to GHCR

Uncomment the `publish` job in `.github/workflows/ci.yml`. It uses `GITHUB_TOKEN` automatically — no extra secrets needed.

---

## 10. After Code Changes

### Docker Compose
```bash
docker compose up --build -d
# Hard-refresh browser (Ctrl+Shift+R) after frontend changes
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

## 11. Security Hardening

### Vulnerabilities fixed (as of commit 623e823)

| Severity | Issue | Fix applied |
|----------|-------|-------------|
| Critical | CORS `startsWith` bypass — crafted subdomain could spoof origin | Changed to strict `===` match in `index.js` |
| Critical | Client-supplied order price — user could send `total: 1` | Order total and item prices now fetched server-side from DB |
| High | OTP brute-force — wrong guesses didn't invalidate OTP | OTP deleted on first wrong guess; `/verify-otp` rate-limited (3/min) |
| High | Payment endpoints unauthenticated — anyone could create/poll sessions | `verifyToken` added to all `/api/payment/*` routes |
| High | ReDoS in `minimatch`, `path-to-regexp`, `picomatch` (npm deps) | `npm audit fix` — 0 vulnerabilities |
| High | Internal DB errors exposed in API responses | Replaced with generic 500 messages; errors logged server-side only |
| Medium | DB SSL `rejectUnauthorized: false` — accepted invalid certs | Changed to `true` |
| Medium | Any logged-in user could upload files (storage abuse) | Upload restricted to sellers and admins only |
| Medium | No password minimum length | 8-character minimum enforced at registration |

### Known remaining limitations

These require infrastructure changes rather than code changes:

- **Rate limiter is in-memory** — per-pod counters don't sync in K8s multi-replica deployments. Add `rate-limit-redis`:
  ```bash
  npm install rate-limit-redis ioredis
  ```
  Then pass a `store` option to each `rateLimit()` call in `index.js`.

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

## 12. Production Checklist

### Security
- [ ] `JWT_SECRET` changed (`openssl rand -hex 64`)
- [ ] `POSTGRES_PASSWORD` changed from default
- [ ] `ALLOWED_ORIGINS` set to exact origin(s) — e.g. `https://yourdomain.com` (no trailing slash)
- [ ] `NODE_ENV=production` set
- [ ] Secrets in `.env` (gitignored) or Sealed Secrets — **not committed to git**
- [ ] TLS enabled (cert-manager + Let's Encrypt)
- [ ] Git remote URL does not contain credentials (use SSH or token via env)
- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] CSP configured in helmet (currently disabled — see Section 10)
- [ ] Rate limiter backed by Redis for multi-replica deployments

### Infrastructure
- [ ] Images pushed to a registry (GHCR / ECR / GCR / ACR)
- [ ] `imagePullPolicy: Always` in K8s deployments
- [ ] PVC StorageClass → cloud-native (EBS / GCP PD / Azure Disk)
- [ ] Postgres as managed service for HA (RDS / Cloud SQL / Azure DB)
- [ ] `DB_SSL=true` (and managed DB uses a valid CA-signed cert — `rejectUnauthorized: true`)
- [ ] File uploads → S3 / Cloud Storage / Azure Blob
- [ ] `k8s/network-policy.yaml` applied (postgres ↔ backend only)

### Application
- [ ] `FAST2SMS_API_KEY` set for real OTP delivery
- [ ] OTP store migrated from in-memory Map to Redis (required for HA)
- [ ] Real payment gateway integrated (Razorpay for India)
- [ ] Demo credentials removed or rotated in production seed

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
