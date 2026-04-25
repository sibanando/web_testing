#!/bin/bash

set -e

echo "=========================================="
echo "       E-Shope - Starting Services        "
echo "=========================================="

# Check Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "[ERROR] Docker is not running. Please start Docker first."
  exit 1
fi

# Go to project root
cd "$(dirname "$0")"

# Pull latest images (optional, comment out if not needed)
# docker compose pull

echo ""
echo "[1/3] Building images..."
docker compose build

echo ""
echo "[2/3] Starting all services..."
docker compose up -d

echo ""
echo "[3/3] Waiting for services to be healthy..."
sleep 5

# Check status
docker compose ps

echo ""
echo "=========================================="
echo "  All services are up!"
echo "  Frontend : http://localhost:8181"
echo "  Backend  : http://localhost:5000"
echo "  Admin    : http://localhost:8181/admin"
echo "=========================================="
