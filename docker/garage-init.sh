#!/bin/sh
# Gives the Garage node of docker-compose.dev.yml its role, the key of .env.local and the bucket.
# Each step checks first, so the script can run on every `docker compose up`.
set -eu

fail() {
	echo "garage-init: $*" >&2
	exit 1
}

echo "$S3_KEY_ID" | grep -Eq '^GK[0-9a-f]{24}$' ||
	fail "S3_KEY_ID must be GK followed by 24 hex characters, e.g. GK\$(openssl rand -hex 12). See the README."
echo "$S3_KEY_SECRET" | grep -Eq '^[0-9a-f]{64}$' ||
	fail "S3_KEY_SECRET must be 64 hex characters, e.g. \$(openssl rand -hex 32). See the README."

node_id=$(garage node id -q 2>/dev/null | cut -d@ -f1)
[ -n "$node_id" ] || fail "could not read the node id from the shared metadata volume"
export GARAGE_RPC_HOST="$node_id@garage:3901"

tries=0
until garage status >/dev/null 2>&1; do
	tries=$((tries + 1))
	[ "$tries" -lt 30 ] || fail "Garage did not answer within 30 seconds"
	sleep 1
done

if garage status | grep -q 'NO ROLE ASSIGNED'; then
	garage layout assign -z dc1 -c 1G "$node_id"
	version=$(garage layout show | awk '/Current cluster layout version:/ { print $NF }')
	garage layout apply --version $((${version:-0} + 1))
fi

garage key info "$S3_KEY_ID" >/dev/null 2>&1 ||
	garage key import --yes "$S3_KEY_ID" "$S3_KEY_SECRET"

garage bucket info "$S3_BUCKET" >/dev/null 2>&1 || garage bucket create "$S3_BUCKET"
garage bucket allow --read --write --owner "$S3_BUCKET" --key "$S3_KEY_ID"

echo "garage-init: bucket $S3_BUCKET ready for key $S3_KEY_ID"
