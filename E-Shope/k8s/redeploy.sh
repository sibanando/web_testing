#!/usr/bin/env bash
# ─── Rebuild images and hot-reload into running cluster ───────────────────────
# Use this after code changes — much faster than a full deploy.
# Usage (from project root):  bash k8s/redeploy.sh [backend|frontend|all]
set -euo pipefail

CLUSTER_NAME="eshope"
NAMESPACE="apnidunia"
TARGET="${1:-all}"

kubectl config use-context "kind-${CLUSTER_NAME}"

rebuild_backend() {
  echo "→ Building backend..."
  docker build -t e-shope-backend:latest ./backend
  kind load docker-image e-shope-backend:latest --name "$CLUSTER_NAME"
  kubectl rollout restart deployment/backend -n "$NAMESPACE"
  kubectl rollout status  deployment/backend -n "$NAMESPACE" --timeout=90s
}

rebuild_frontend() {
  echo "→ Building frontend..."
  docker build -t e-shope-frontend:latest ./frontend
  kind load docker-image e-shope-frontend:latest --name "$CLUSTER_NAME"
  kubectl rollout restart deployment/frontend -n "$NAMESPACE"
  kubectl rollout status  deployment/frontend -n "$NAMESPACE" --timeout=60s
}

case "$TARGET" in
  backend)  rebuild_backend ;;
  frontend) rebuild_frontend ;;
  all)      rebuild_backend; rebuild_frontend ;;
  *)
    echo "Usage: bash k8s/redeploy.sh [backend|frontend|all]"
    exit 1
    ;;
esac

echo ""
echo "✓ Done. Pod status:"
kubectl get pods -n "$NAMESPACE"
