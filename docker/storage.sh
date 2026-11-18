#!/bin/bash
# Object storage of docker-compose.yml and docker-compose.dev.yml. Serves Garage; on the first start
# of a former install, moves the files of its MinIO volume into Garage first, and keeps serving
# MinIO, as before, whenever that move cannot be verified. In production, be-BOP waits for
# $HANDOFF/ready, then reads its S3 settings from s3.env.
# No set -e: each step is checked, so that a failed step cancels the move instead of the storage.
set -uo pipefail

# docker-compose.dev.yml sets development: be-BOP then runs on the host and reads its key from .env.local.
MODE=${STORAGE_MODE:-production}
FORMER=/var/lib/minio
# Kept in the Garage volume: losing any other volume must never make Garage look unused.
OWN=/var/lib/garage/meta/bebop-storage
READER=$OWN/minio
HANDOFF=/var/lib/storage-handoff
BUCKET=${S3_BUCKET:-bebop}
if [ "$MODE" = development ]; then
	ENDPOINT=${S3_ENDPOINT_URL:-http://127.0.0.1:9000}
else
	ENDPOINT=${S3_ENDPOINT_URL:-http://minio:9000}
fi
# Serving the former storage as before needs the keys be-BOP uses: those of .env.local, or the
# defaults of the former docker-compose files.
FORMER_KEY_ID=${S3_KEY_ID:-minio}
FORMER_KEY_SECRET=${S3_KEY_SECRET:-minio123}
# MinIO does not keep its root keys in its volume, so the copy reads it with keys of its own.
COPY_KEY_ID=$(head -c 10 /dev/urandom | od -An -vtx1 | tr -d ' \n')
COPY_KEY_SECRET=$(head -c 20 /dev/urandom | od -An -vtx1 | tr -d ' \n')
CHECK_DIR=.storage-check
QUICK='--contimeout 5s --timeout 10s --retries 1 --low-level-retries 1'

log() { echo "storage: $*"; }
random_hex() { head -c "$1" /dev/urandom | od -An -vtx1 | tr -d ' \n'; }
write_file() { (umask 077 && cat >"$1.tmp") && mv "$1.tmp" "$1"; }
# bash runs the docker stop trap only once a foreground command ends; a long one waits in the background.
job_pid=
interruptible() {
	"$@" &
	job_pid=$!
	wait "$job_pid"
}

mkdir -p "$HANDOFF"
rm -f "$HANDOFF/ready"
# be-BOP waits for this file, so whatever stops this script, except docker stop, lets it start.
stopping=
trap '[ -n "$stopping" ] || touch "$HANDOFF/ready"' EXIT

# Made once per install, so no two shops share a secret or a key.
mkdir -p "$OWN" || { log "ERROR: cannot write in the garage-meta volume"; exit 1; }
[ -s "$OWN/rpc_secret" ] || random_hex 32 | write_file "$OWN/rpc_secret"
if [ "$MODE" = development ]; then
	GARAGE_KEY_ID=${S3_KEY_ID:-}
	GARAGE_KEY_SECRET=${S3_KEY_SECRET:-}
else
	[ -s "$OWN/garage-key.env" ] ||
		printf 'GARAGE_KEY_ID=GK%s\nGARAGE_KEY_SECRET=%s\n' "$(random_hex 12)" "$(random_hex 32)" | write_file "$OWN/garage-key.env"
	# shellcheck source=/dev/null
	. "$OWN/garage-key.env" 2>/dev/null && [ -n "${GARAGE_KEY_ID:-}" ] ||
		{ log "ERROR: cannot keep the Garage key in the garage-meta volume"; exit 1; }
fi

# Garage imports only keys of its own format.
garage_key_valid() { [[ $GARAGE_KEY_ID =~ ^GK[0-9a-f]{24}$ && $GARAGE_KEY_SECRET =~ ^[0-9a-f]{64}$ ]]; }
explain_development_key() {
	log "S3_KEY_ID and S3_KEY_SECRET of .env.local must be a Garage key. Put these lines in .env.local,"
	log "in place of the former S3_KEY_ID, S3_KEY_SECRET and S3_REGION, then run the same command again:"
	printf '  S3_KEY_ID=GK%s\n  S3_KEY_SECRET=%s\n  S3_REGION=garage\n' "$(random_hex 12)" "$(random_hex 32)"
}

# Port 9000, like the former storage, so S3_ENDPOINT_URL and reverse proxies keep working.
cat >/etc/garage.toml <<EOF
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "lmdb"
replication_factor = 1
rpc_secret_file = "$OWN/rpc_secret"
rpc_bind_addr = "127.0.0.1:3901"

[s3_api]
s3_region = "garage"
api_bind_addr = "0.0.0.0:9000"
EOF

export RCLONE_CONFIG_GARAGE_TYPE=s3 RCLONE_CONFIG_GARAGE_PROVIDER=Other
export RCLONE_CONFIG_GARAGE_ENDPOINT=http://127.0.0.1:9000 RCLONE_CONFIG_GARAGE_REGION=garage
export RCLONE_CONFIG_GARAGE_ACCESS_KEY_ID=$GARAGE_KEY_ID RCLONE_CONFIG_GARAGE_SECRET_ACCESS_KEY=$GARAGE_KEY_SECRET
# Garage as be-BOP reaches it.
export RCLONE_CONFIG_SHOP_TYPE=s3 RCLONE_CONFIG_SHOP_PROVIDER=Other
export RCLONE_CONFIG_SHOP_ENDPOINT=$ENDPOINT RCLONE_CONFIG_SHOP_REGION=garage
export RCLONE_CONFIG_SHOP_ACCESS_KEY_ID=$GARAGE_KEY_ID RCLONE_CONFIG_SHOP_SECRET_ACCESS_KEY=$GARAGE_KEY_SECRET
export RCLONE_CONFIG_FORMER_TYPE=s3 RCLONE_CONFIG_FORMER_PROVIDER=Minio
export RCLONE_CONFIG_FORMER_ENDPOINT=http://127.0.0.1:9100
export RCLONE_CONFIG_FORMER_ACCESS_KEY_ID=$COPY_KEY_ID RCLONE_CONFIG_FORMER_SECRET_ACCESS_KEY=$COPY_KEY_SECRET

# Gives a server a minute to answer, and stops waiting as soon as it dies.
wait_for() {
	local pid=$1 tries=0
	shift
	until "$@" >/dev/null 2>&1; do
		tries=$((tries + 1))
		if [ "$tries" -ge 60 ] || ! kill -0 "$pid" 2>/dev/null; then return 1; fi
		sleep 1
	done
}

garage_pid=
start_garage() {
	garage server &
	garage_pid=$!
	wait_for "$garage_pid" timeout 10 garage status || { log "Garage did not start"; return 1; }
	provision_garage || { log "Garage could not be set up"; return 1; }
}

provision_garage() {
	local node_id version
	node_id=$(garage node id -q 2>/dev/null | cut -d@ -f1)
	[ -n "$node_id" ] || return 1
	if garage status | grep -q 'NO ROLE ASSIGNED'; then
		garage layout assign -z dc1 -c 1G "$node_id" >/dev/null || return 1
		version=$(garage layout show | awk '/Current cluster layout version:/ { print $NF }')
		garage layout apply --version $((${version:-0} + 1)) >/dev/null || return 1
	fi
	garage key info "$GARAGE_KEY_ID" >/dev/null 2>&1 ||
		garage key import --yes "$GARAGE_KEY_ID" "$GARAGE_KEY_SECRET" >/dev/null || return 1
	garage bucket info "$BUCKET" >/dev/null 2>&1 || garage bucket create "$BUCKET" >/dev/null || return 1
	garage bucket allow --read --write --owner "$BUCKET" --key "$GARAGE_KEY_ID" >/dev/null
}

stop_garage() {
	[ -n "$garage_pid" ] || return 0
	kill "$garage_pid" 2>/dev/null
	wait "$garage_pid" 2>/dev/null
	garage_pid=
}

# Writes a test file into Garage and reads it back through the remote given, then removes it.
probe_through() {
	local probe expected actual
	probe="$CHECK_DIR/$(date +%s)-$(random_hex 4)"
	expected=$(random_hex 32)
	printf '%s' "$expected" | rclone rcat "garage:$BUCKET/$probe" || return 1
	# shellcheck disable=SC2086
	actual=$(rclone cat "$1:$BUCKET/$probe" $QUICK 2>/dev/null)
	rclone deletefile "garage:$BUCKET/$probe" || return 1
	[ "$actual" = "$expected" ]
}

# S3_ENDPOINT_URL may be this storage under another name (a reverse proxy) or another storage.
leads_here() {
	probe_through shop && return 0
	log "S3_ENDPOINT_URL ($ENDPOINT) does not lead to this storage"
	return 1
}

# The files read in full during the move must still read the same once Garage is serving.
check_garage() {
	probe_through garage || { log "check: Garage does not read back what it wrote"; return 1; }
	[ -s "$OWN/samples.sha256" ] || return 0
	local line sum key read_sum
	while IFS= read -r line; do
		sum=${line%% *}
		key=${line#* }
		read_sum=$(rclone cat "garage:$BUCKET/$key" | sha256sum | cut -d' ' -f1) ||
			{ log "check: cannot read $key"; return 1; }
		[ "$read_sum" = "$sum" ] || { log "check: $key differs from the copy made"; return 1; }
	done <"$OWN/samples.sha256"
}

# Recorded before be-BOP is given the key: once be-BOP may write to Garage, no later start may
# take Garage for an unfinished move and empty it.
choose_garage() { printf '%s\n' "$ENDPOINT" | write_file "$OWN/chosen"; }
chosen_endpoint() { cat "$OWN/chosen" 2>/dev/null; }

# In development, be-BOP runs on the host and already has the key, from .env.local.
hand_garage() {
	if [ "$MODE" = development ]; then
		[ "${S3_REGION:-}" = garage ] || log "WARNING: set S3_REGION=garage in .env.local, or Garage refuses be-BOP's requests"
		return 0
	fi
	printf 'S3_KEY_ID=%s\nS3_KEY_SECRET=%s\nS3_REGION=garage\n' "$GARAGE_KEY_ID" "$GARAGE_KEY_SECRET" |
		write_file "$HANDOFF/s3.env" || log "WARNING: cannot hand the Garage key to be-BOP"
}
hand_nothing() { rm -f "$HANDOFF/s3.env"; }
# be-BOP lost the default keys of the former docker-compose.yml, so they are handed back.
hand_former() {
	if [ -n "${S3_KEY_ID:-}" ] || [ "$MODE" = development ]; then
		hand_nothing
	else
		printf 'S3_KEY_ID=%s\nS3_KEY_SECRET=%s\n' "$FORMER_KEY_ID" "$FORMER_KEY_SECRET" | write_file "$HANDOFF/s3.env"
	fi
}

let_bebop_start() { touch "$HANDOFF/ready"; }

serve_garage() {
	let_bebop_start
	if [ -z "$garage_pid" ]; then exit 1; fi
	log "serving Garage"
	wait "$garage_pid"
	exit $?
}

# be-BOP creates its bucket on the storage it uses, so the bucket folder in the former volume
# shows the shop used this storage, whatever URL it reached it through.
used_former_storage() { [ -d "$FORMER/$BUCKET" ]; }

# Only a MinIO server reads the files of its volume, and MinIO no longer publishes any. So only a
# former install fetches one: the last build still published, from the single layer of
# bitnamilegacy/minio:2025.7.23-debian-12-r5, both pinned by their fingerprint.
fetch_reader() {
	local layer binary token
	case "$(uname -m)" in
	x86_64)
		layer=b5e54e955df3465c05bd3730c97f1f8cda40b2b70d64409144b16e2eb343a9b2
		binary=0bf90fb51bb86c5205a0a3569dcbdcb268bf24aa0c59f144a3ffd5e6d67ae85e
		;;
	aarch64)
		layer=305b8bc232d09ab7756988bbb68fbc3f2996287a5eb12e5bc212915abe7e1f0a
		binary=fe0b9dcf3c02d5632bd1d7a51225c5685786af0d833f3020e852e68a4c8a0e81
		;;
	*)
		log "no reader of the former storage for $(uname -m)"
		return 1
		;;
	esac
	if [ -x "$READER" ] && [ "$(sha256sum <"$READER" | cut -d' ' -f1)" = "$binary" ]; then return 0; fi
	log "fetching the reader of the former storage (about 100 MB, once)"
	rm -rf "$OWN/reader"
	mkdir -p "$OWN/reader" || return 1
	token=$(curl -fsS --retry 3 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:bitnamilegacy/minio:pull' |
		sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
	if [ -z "$token" ] || ! interruptible curl -fsSL --retry 3 --max-time 1800 -H "Authorization: Bearer $token" \
		-o "$OWN/reader/layer.tgz" "https://registry-1.docker.io/v2/bitnamilegacy/minio/blobs/sha256:$layer"; then
		log "cannot download the reader of the former storage"
		return 1
	fi
	local extracted=$OWN/reader/opt/bitnami/minio/bin/minio
	if [ "$(sha256sum <"$OWN/reader/layer.tgz" | cut -d' ' -f1)" != "$layer" ] ||
		! tar -xzf "$OWN/reader/layer.tgz" -C "$OWN/reader" opt/bitnami/minio/bin/minio ||
		[ "$(sha256sum <"$extracted" | cut -d' ' -f1)" != "$binary" ]; then
		log "the reader of the former storage downloaded is not the expected one"
		rm -rf "$OWN/reader"
		return 1
	fi
	mv "$extracted" "$READER" && chmod 0755 "$READER" || return 1
	rm -rf "$OWN/reader"
}

former_pid=
stop_former() {
	[ -n "$former_pid" ] || return 0
	kill "$former_pid" 2>/dev/null
	wait "$former_pid" 2>/dev/null
	former_pid=
}

# Bound to localhost so that nothing but the copy reaches it.
start_former() {
	MINIO_ROOT_USER=$COPY_KEY_ID MINIO_ROOT_PASSWORD=$COPY_KEY_SECRET \
		"$READER" server "$FORMER" --address 127.0.0.1:9100 --console-address 127.0.0.1:9101 >"$OWN/former-storage.log" 2>&1 &
	former_pid=$!
	# shellcheck disable=SC2086
	wait_for "$former_pid" rclone lsf "former:$BUCKET" --max-depth 1 $QUICK ||
		{ log "the former storage did not start:"; tail -n 5 "$OWN/former-storage.log"; return 1; }
}

copy_former_files() {
	log "copying the stored files into Garage, this can take a while"
	interruptible rclone sync "former:$BUCKET" "garage:$BUCKET" --exclude "/$CHECK_DIR/**" --stats 30s --stats-one-line ||
		{ log "the copy failed"; return 1; }
	interruptible rclone check "former:$BUCKET" "garage:$BUCKET" --exclude "/$CHECK_DIR/**" ||
		{ log "the copy differs from the former storage"; return 1; }

	# Sizes and checksums are compared above; these files are also read in full on both sides, at
	# every folder depth, since a checksum of a multipart upload says nothing about its content.
	rclone lsf -R --files-only "former:$BUCKET" --exclude "/$CHECK_DIR/**" >"$OWN/files.txt" ||
		{ log "cannot list the former storage"; return 1; }
	awk -F/ '{ depth = NF; if (count[depth] < 3) { count[depth]++; print } }' "$OWN/files.txt" >"$OWN/samples.txt" ||
		return 1
	: >"$OWN/samples.sha256.tmp" || return 1
	local key former_sum new_sum
	while IFS= read -r key; do
		former_sum=$(rclone cat "former:$BUCKET/$key" | sha256sum | cut -d' ' -f1) ||
			{ log "cannot read $key in the former storage"; return 1; }
		new_sum=$(rclone cat "garage:$BUCKET/$key" | sha256sum | cut -d' ' -f1) ||
			{ log "cannot read $key in Garage"; return 1; }
		[ "$former_sum" = "$new_sum" ] || { log "$key differs once copied"; return 1; }
		printf '%s %s\n' "$new_sum" "$key" >>"$OWN/samples.sha256.tmp" || return 1
	done <"$OWN/samples.txt"
	if [ -s "$OWN/files.txt" ] && [ ! -s "$OWN/samples.sha256.tmp" ]; then
		log "no file was read back in full"
		return 1
	fi
	mv "$OWN/samples.sha256.tmp" "$OWN/samples.sha256" || return 1
	log "copied $(wc -l <"$OWN/files.txt") files, $(wc -l <"$OWN/samples.txt") read back in full"
}

# Until a move is verified, be-BOP has never used Garage: each attempt starts it empty, so nothing
# half done by an earlier attempt is kept.
reset_garage() {
	[ -z "$(chosen_endpoint)" ] || return 1
	find /var/lib/garage/meta -mindepth 1 -maxdepth 1 ! -name bebop-storage -exec rm -rf {} + &&
		find /var/lib/garage/data -mindepth 1 -delete
}

serve_former_storage() {
	stop_former
	stop_garage
	hand_former
	let_bebop_start
	log "serving the former storage, as before"
	MINIO_ROOT_USER=$FORMER_KEY_ID MINIO_ROOT_PASSWORD=$FORMER_KEY_SECRET exec "$READER" server "$FORMER" --address :9000
}

# bash does not pass `docker stop` on to the servers it started.
# A copy still writing into Garage keeps it from stopping, so it goes first.
trap 'stopping=1; rm -f "$HANDOFF/ready"; [ -z "$job_pid" ] || kill "$job_pid" 2>/dev/null; stop_former; stop_garage; exit 0' TERM INT

if [ "$MODE" = development ] && ! garage_key_valid; then
	explain_development_key
	if [ -z "$(chosen_endpoint)" ] && used_former_storage && fetch_reader; then serve_former_storage; fi
	exit 1
fi

if [ -n "$(chosen_endpoint)" ]; then
	rm -f "$READER"
	if ! start_garage; then
		log "ERROR: be-BOP starts without its stored files; see the lines above"
		stop_garage
	elif ! check_garage; then
		log "WARNING: Garage answers but the check above failed; staying on Garage, which holds every file since the move"
	fi
	if [ "$ENDPOINT" = "$(chosen_endpoint)" ] || { [ -n "$garage_pid" ] && leads_here && choose_garage; }; then
		hand_garage
	else
		hand_nothing
		log "be-BOP's S3 settings are left as they are in .env.local"
	fi
	serve_garage
elif used_former_storage; then
	if ! fetch_reader; then
		# Nothing can serve the former files meanwhile; once fetched, they are served as before.
		log "ERROR: be-BOP starts without its stored files until the reader is fetched, tried every minute"
		hand_former
		let_bebop_start
		until fetch_reader; do
			sleep 60 &
			wait $!
		done
		serve_former_storage
	fi
	log "moving the former storage into Garage"
	if reset_garage && start_garage && leads_here && start_former && copy_former_files && check_garage; then
		stop_former
		if choose_garage; then
			rm -f "$READER"
			hand_garage
			log "move verified; the former minio-data volume is left as it was"
			serve_garage
		fi
		log "cannot record the move"
	fi
	log "move cancelled, it will be tried again on the next start"
	serve_former_storage
else
	if start_garage && leads_here && check_garage && choose_garage; then
		hand_garage
	else
		hand_nothing
		log "be-BOP's S3 settings are left as they are in .env.local"
	fi
	serve_garage
fi
