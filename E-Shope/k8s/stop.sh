#!/usr/bin/env bash
# ─── E-Shope / K8s stop (pause) ─────────────────────────────────────────────
# Scales all deployments to 0 replicas. Cluster and data stay intact.
# Usage:  bash k8s/stop.sh
set -euo pipefail

NAMESPACE="apnidunia"

echo "Stopping E-Shope pods (scaling to 0)..."

kubectl scale deployment frontend backend postgres \
  --replicas=0 -n "$NAMESPACE"

echo ""
kubectl get pods -n "$NAMESPACE"
echo ""
echo "All deployments scaled to 0. Data is preserved."
echo "To resume:  bash k8s/start.sh"
