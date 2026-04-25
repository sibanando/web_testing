#!/usr/bin/env bash
# ─── E-Shope / K8s start (resume) ───────────────────────────────────────────
# Scales deployments back up after a stop. No rebuild needed.
# Usage:  bash k8s/start.sh
set -euo pipefail

NAMESPACE="apnidunia"

echo "Starting E-Shope pods..."

# Start postgres first, then backend and frontend
kubectl scale deployment postgres --replicas=1 -n "$NAMESPACE"

echo "Waiting for postgres to be ready..."
kubectl wait --namespace "$NAMESPACE" --for=condition=ready pod \
  --selector=app=postgres --timeout=120s

kubectl scale deployment backend --replicas=1 -n "$NAMESPACE"
kubectl scale deployment frontend --replicas=2 -n "$NAMESPACE"

echo "Waiting for backend..."
kubectl wait --namespace "$NAMESPACE" --for=condition=ready pod \
  --selector=app=backend --timeout=120s

echo "Waiting for frontend..."
kubectl wait --namespace "$NAMESPACE" --for=condition=ready pod \
  --selector=app=frontend --timeout=120s

echo ""
kubectl get pods -n "$NAMESPACE"
echo ""
echo "E-Shope is running at http://localhost:8080"
