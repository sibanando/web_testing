#!/usr/bin/env bash
# ─── Tear down the kind cluster completely ────────────────────────────────────
# Usage (from project root):  bash k8s/teardown.sh
set -euo pipefail

CLUSTER_NAME="eshope"

echo "→ Deleting kind cluster '${CLUSTER_NAME}'..."
kind delete cluster --name "$CLUSTER_NAME"
echo "✓ Cluster deleted. PostgreSQL data inside the cluster node is gone."
echo "  (docker volume for kind node is also removed)"
