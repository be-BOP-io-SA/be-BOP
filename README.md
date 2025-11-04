# be-BOP

be-BOP is a free and open-source, peer-to-peer monetization platform built for
communities and creators. It combines e-commerce, point-of-sale (PoS),
subscriptions, crowdfunding/peerfunding, ticketing, donations, and
pay-what-you-want models — all under one roof. 

## Requirements

- A S3-compatible object storage. There are hundreds of solutions, including https://min.io/, an open source solution that can be run inside docker, or paid services like AWS, Scaleway, ...
- SMTP credentials, for sending emails
- A MongoDB replica set. You can run it inside docker or use MongoDB Atlas.
- A bitcoin node, and lnd
- Node version 18+, corepack enabled with `corepack enable`
- Git LFS installed with `git lfs install`

### S3 configuration

The app will automatically configure the S3 bucket to accept CORS PUT calls.

## Environment variables

Add `.env.local` or `.env.{development,test,production}.local` files for secrets not committed to git and to override the `.env`

- `LINK_PRELOAD_HEADERS` - Set to `true` to enable the `Link rel=preload` header, see [explanation](https://nitropack.io/blog/post/link-rel-preload-explained). If you do so, you may need to configure nginx to allow bigger header with `proxy_buffer_size   16k`, see [explanation](https://www.getpagespeed.com/server-setup/nginx/tuning-proxy_buffer_size-in-nginx).
- `MONGODB_URL` - The connection URL to the MongoDB replicaset
- `MONGODB_DB` - The DB name, defaulting to "bebop"
- `NOSTR_PRIVATE_KEY` - To send notifications
- `ORIGIN` - The url where be-BOP will be deployed. For example, https://dev-bootik.pvh-labs.ch
- `S3_BUCKET` - The name of the bucket for the S3-compatible object storage
- `S3_ENDPOINT_URL` - The endpoint for the S3-compatible object storage - eg http://s3-website.us-east-1.amazonaws.com or http://s3.fr-par.scw.cloud
- `S3_KEY_ID` - Credentials for the S3-compatible object storage
- `S3_KEY_SECRET` - Credentials for the S3-compatible object storage
- `S3_REGION` - Region from the S3-compatible object storage
- `SMTP_HOST` - Specify all the SMTP variables to enable email notifications
- `SMTP_PASSWORD` - Specify all the SMTP variables to enable email notifications
- `SMTP_PORT` - Specify all the SMTP variables to enable email notifications
- `SMTP_USER` - Specify all the SMTP variables to enable email notifications
- `SMTP_FROM` - Optional, defaults to `SMTP_USER`. Sender email address for email notifications

### Bitcoin and LND nodes

🚨 You can use `phoenixd` for lightning and bitcoin nodeless directly from the UI, without setting up these env vars.

- `BITCOIN_RPC_URL` - The RPC url for the bitcoin node. Set to http://127.0.0.1:8332 if you run a bitcoin node locally with default configuration
- `BITCOIN_RPC_USER` - The RPC user
- `BITCOIN_RPC_PASSWORD` - The RPC password
- `BIP84_XPUB` - with derivation path m/84'/0'/0'. If you have a ZPub, use https://jlopp.github.io/xpub-converter/ to convert to xpub. This enables a completely trustless setup, where the be-BOP server does not need to know the private key. You can generate the xpub from the sparrow wallet, for example.
- `LND_REST_URL` - The LND Rest interface URL. Set to http://127.0.0.1:8080 if you run a lnd node locally with default configuration
- `LND_MACAROON_PATH` - Where the credentials for lnd are located. For example, `~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon`. Leave empty if lnd runs with `--no-macaroons`, or if you're using `LND_MACAROON_VALUE`. You can use `invoices.macaroon` instead of `admin.macaroon`, but then the admin LND page in the be-BOP will not work. Orders should work fine.
- `LND_MACAROON_VALUE` - Upper-case hex-encoded represenetation of the LND macaroon. Leave empty if lnd runs with `--no-macaroons`, or if you're using `LND_MACAROON_PATH`. Example command: `cat .lnd/data/chain/bitcoin/mainnet/admin.macaroon | hexdump -e '16/1 "%02X"'`. You can use `invoices.macaroon` instead of `admin.macaroon`, but then the admin LND page in the be-BOP will not work. Orders should work fine.
- `TOR_PROXY_URL` - Url of the SOCKS5 proxy used to access TOR. If set, and the hostname for `BITCOIN_RPC_URL` is a `.onion` address, the app will use the proxy to access the bitcoin node. In the same manner, if `LND_REST_URL` is a `.onion` address, TOR will be used to access the lightning node.

### SSO sign-in for users

You can also set the following environment variables to allow SSO. Set your redirect url to `https://<...>/api/callback/<provider>`, where `<provider>` is one of `github`, `google`, `facebook`, `twitter`, when you create your app on the provider's website:

- `GITHUB_ID`
- `GITHUB_SECRET`
- `GOOGLE_ID`
- `GOOGLE_SECRET`
- `FACEBOOK_ID`
- `FACEBOOK_SECRET`
- `TWITTER_ID`
- `TWITTER_SECRET`

## Production

### Running

```shell
pnpm run build
node --enable-source-maps build/index.js

# If behind a reverse proxy, you can use the following config:
# ADDRESS_HEADER=X-Forwarded-For XFF_DEPTH=1 node build/index.js
```

You can set the `PORT` environment variable to change from the default 3000 port to another port.

You can also use [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/) to manage your node application, and run it on multiple cores.

```shell
NODE_OPTIONS=--enable-source-maps pm2 start --name bebop --update-env build/index.js

# If behind a reverse proxy, you can use the following config:
# NODE_OPTIONS=--enable-source-maps ADDRESS_HEADER=X-Forwarded-For XFF_DEPTH=1 pm2 start --name bebop --update-env build/index.js
```

Note: for uploading large payloads you may want to set the `BODY_SIZE_LIMIT=20000000` environment variable to allow 20MB payloads for example. It should not be needed for normal usage.

### Docker

- Build the docker image

```shell
docker build -t bebop .
```

- Run the docker image with environment variables

```shell
export DOTENV_LOCAL=$(cat .env.local)
docker run -p 3000:3000 --env DOTENV_LOCAL=$DOTENV_LOCAL bebop --add-host=host.docker.internal:host-gateway
```

or

```shell
# Be careful, double-quotes surrounding values in .env.local will not be ignored
docker run -p 3000:3000 --env-file .env.local bebop --add-host=host.docker.internal:host-gateway
```

If you want to access a local BTC node or LND node, use `host.docker.internal` as the hostname instead of `localhost`:

```env
BITCOIN_RPC_URL=http://host.docker.internal:8332
```

### Docker compose

Docker compose is used for local development, but you can also use it for production. It will launch a mongodb and minio container.

#### Required configuration

Edit `.env.local` to add a S3 access key and secret if not already present, for example:

```console
echo "S3_KEY_ID=$(openssl rand -base64 63 | tr -d '\n')" >> .env.local
echo "S3_KEY_SECRET=$(openssl rand -base64 63 | tr -d '\n')" >> .env.local
```

Make sure to have a fairly recent version of docker & docker compose.

#### Start the containers

```
# Optional: update dependencies
docker compose pull
# --build will rebuild the docker image when you change the code. Use --force-recreate to force a rebuild (eg after updating dependencies).
docker compose --env-file .env.local up --build -d
```

It will still use the `.env.local` file for the environment variables if present, overriding the values for MongoDB and S3.

Minio will be available on http://localhost:9000 and be-BOP on http://localhost:3000.

Some helper commands:

```bash
# See the containers
docker compose ps
# Get the logs
docker compose logs bebop -f
# Enter the container
docker compose exec bebop sh
# Stop the containers
docker compose down
```

#### Other configuration

See the beginning of the README for other environment variables you can set in `.env.local`, including the SMTP credentials.

If you run in production, you will need to set the `ORIGIN` environment variable to the URL of your be-BOP instance:

```env
# .env.local - replace with your be-BOP url
ORIGIN=https://bebop.example.com
```

As well as the object storage (minio) url:

```env
# .env.local - replace with your minio url
S3_ENDPOINT_URL=https://minio.bebop.example.com
```

If you want to access a local BTC node or LND node, use `host.docker.internal` as the hostname instead of `localhost`:

```env
BITCOIN_RPC_URL=http://host.docker.internal:8332
```

When placing the beBOP behind a reverse proxy, to get your user's IPs, you will need to set the `ADDRESS_HEADER` to `X-Forwarded-For` and the `XFF_DEPTH` header to `1` (or appropriate value depending on your config) in the environment.

### Maintenance mode

It's possible to enable maintenance mode in the admin.

To correctly recognize your IP, if you are behind a reverse proxy like nginx, you will need to set the `ADDRESS_HEADER` to `X-Forwarded-For` and the `XFF_DEPTH` header to `1` in the environment.

### Copying DB & S3 to another instance

You can run the following command to copy the DB and S3 to another instance:

```shell
export OLD_DB_URL="..."
export OLD_DB_NAME="..."

export NEW_DB_URL="..."
export NEW_DB_NAME="..."

export OLD_S3_ENDPOINT="..."
export OLD_S3_BUCKET="..."
export OLD_S3_REGION="..."
export OLD_S3_KEY="..."
export OLD_S3_SECRET="..."

export NEW_S3_BUCKET="..."
export NEW_S3_REGION="..."
export NEW_S3_KEY="..."
export NEW_S3_SECRET="..."
export NEW_S3_ENDPOINT="..."

pnpm run copy-db-s3
```

## Local development

### Running the app

Install pnpm, for example with `sudo corepack enable` if you're on linux/mac.

Then:

```
pnpm install
pnpm dev
```

### Configuring the Object Storage

Many cloud-hosted object storages like AWS S3 or Scaleway have free tiers that are more than enough for local development.

You can also use [MinIO](https://min.io/docs/minio/container/index.html):

```
mkdir -p ${HOME}/minio/data

docker run \
   -p 9000:9000 \
   -p 9090:9090 \
   --user $(id -u):$(id -g) \
   --name minio1 \
   -e "MINIO_ROOT_USER=ROOTUSER" \
   -e "MINIO_ROOT_PASSWORD=CHANGEME123" \
   -v ${HOME}/minio/data:/data \
   quay.io/minio/minio server /data --console-address ":9090"
```

Then go on http://127.0.0.1:9090/access-keys and create an access key. Copy the "Access Key" and "Secret Key" safely.

In your `.env.local` file, add the following:

```dotenv
S3_BUCKET="bebop" # Or another bucket name of your choice
S3_KEY_ID=<Access key> #for example: uY2vtFFX7vBVucEs
S3_KEY_SECRET=<Secret Key> #for example: GhNSZXUMiZsJl6LTvSCWPW0ZbCwHVL17
S3_ENDPOINT_URL=http://127.0.0.1:9000
S3_REGION="localhost"
```

Then restart `pnpm dev`. The bucket will be created automatically.

### Configuring MongoDB

The simplest way is to get a free tier on [MongoDB Atlas](https://www.mongodb.com/atlas/database).

Alternatively, you need to configure a local MongoDB with ReplicaSet enabled. ReplicaSet is needed for change streams and ACID transactions.

### Configuring plausible

Self install plausible : [Plausible](https://plausible.io/docs/self-hosting)

Then, go in the config page : /admin/config

And : Copy/paste your Plausible URL in the plausible input
#for example: https://plausible.your-domain.com/js/script.js

To have **emails**, for example to have multiple users, you need [to configure SMTP with environment variables](https://plausible.io/docs/self-hosting-configuration#mailersmtp-setup) and set `DISABLE_REGISTRATION=invite_only`.
