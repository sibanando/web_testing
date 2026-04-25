#!/usr/bin/env bash
# ─── E-Shope / K8s deploy script ──────────────────────────────────────────────
# Usage (from project root):  bash k8s/deploy.sh
# Prerequisites: kind, kubectl, docker
set -euo pipefail

CLUSTER_NAME="eshope"
NAMESPACE="apnidunia"
BACKEND_IMAGE="e-shope-backend:latest"
FRONTEND_IMAGE="e-shope-frontend:latest"
INGRESS_MANIFEST="https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml"

# ── 1. Check prerequisites ─────────────────────────────────────────────────────
for cmd in kind kubectl docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' not found. Install it and retry."
    exit 1
  fi
done
echo "✓ Prerequisites OK"

# ── 2. Create kind cluster (skip if already exists) ───────────────────────────
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  echo "✓ Kind cluster '${CLUSTER_NAME}' already exists — skipping create"
else
  echo "→ Creating kind cluster '${CLUSTER_NAME}'..."
  kind create cluster --name "$CLUSTER_NAME" --config k8s/kind-config.yaml
  echo "✓ Cluster created"
fi

# Set kubectl context
kubectl config use-context "kind-${CLUSTER_NAME}"

# ── 3. Install nginx ingress (idempotent) ─────────────────────────────────────
echo "→ Installing ingress-nginx..."
kubectl apply -f "$INGRESS_MANIFEST"
echo "→ Waiting for ingress-nginx to be ready (this takes ~60s on first run)..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s
echo "✓ ingress-nginx ready"

# ── 4. Reuse existing Docker Compose images (skip build) ─────────────────────
# Images are already built by Docker Compose: e-shope-backend, e-shope-frontend
# To rebuild, run: docker compose build
if ! docker image inspect "$BACKEND_IMAGE" &>/dev/null; then
  echo "ERROR: Image '$BACKEND_IMAGE' not found. Run 'docker compose build' first."
  exit 1
fi
if ! docker image inspect "$FRONTEND_IMAGE" &>/dev/null; then
  echo "ERROR: Image '$FRONTEND_IMAGE' not found. Run 'docker compose build' first."
  exit 1
fi
echo "✓ Found existing images: $BACKEND_IMAGE, $FRONTEND_IMAGE"

# ── 5. Load images into kind (avoids registry round-trip) ─────────────────────
echo "→ Loading images into kind cluster..."
kind load docker-image "$BACKEND_IMAGE"  --name "$CLUSTER_NAME"
kind load docker-image "$FRONTEND_IMAGE" --name "$CLUSTER_NAME"
echo "✓ Images loaded"

# ── 6. Deploy via kustomize ───────────────────────────────────────────────────
echo "→ Applying manifests..."
kubectl apply -k k8s/
echo "✓ Manifests applied"

# ── 7. Wait for all pods to be ready ─────────────────────────────────────────
echo "→ Waiting for postgres..."
kubectl wait --namespace "$NAMESPACE" \
  --for=condition=ready pod \
  --selector=app=postgres \
  --timeout=120s

echo "→ Waiting for backend (includes initContainer pg_isready check)..."
kubectl wait --namespace "$NAMESPACE" \
  --for=condition=ready pod \
  --selector=app=backend \
  --timeout=120s

echo "→ Waiting for frontend..."
kubectl wait --namespace "$NAMESPACE" \
  --for=condition=ready pod \
  --selector=app=frontend \
  --timeout=60s

# ── 8. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  E-Shope is running!"
echo ""
echo "  Frontend : http://localhost:8080"
echo "  Backend  : http://localhost:8080/api/health"
echo "  Admin    : http://localhost:8080/admin"
echo "  Login    : sibanando / Sib@1984"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Pod status:"
kubectl get pods -n "$NAMESPACE"
