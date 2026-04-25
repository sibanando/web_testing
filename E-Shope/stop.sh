#!/bin/bash

cd "$(dirname "$0")"

echo "Stopping all services..."
docker compose down

echo "All services stopped."
