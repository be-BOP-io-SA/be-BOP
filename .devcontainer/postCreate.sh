#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

nvm install
pnpm install

docker compose  -f .devcontainer/docker-compose.yml up -d

echo "Containers started"

echo "Default env:"
echo "========================"
echo "MONGODB_URL=mongodb://127.0.0.1:27017"
echo "MONGODB_DIRECT_CONNECTION=true"
echo "ORIGIN=http://localhost:5173"
echo "S3_ENDPOINT_URL=http://localhost:9000"
echo "PUBLIC_S3_ENDPOINT_URL=http://localhost:9000"
echo "S3_BUCKET=bebop"
echo "S3_REGION=localhost"
echo "S3_KEY_ID=minio"
echo "S3_KEY_SECRET=minio123"
echo "========================"
echo "Edit .env.local to add these values"