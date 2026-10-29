<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="src/lib/assets/bebop-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="src/lib/assets/bebop-light.svg">
    <img alt="be-BOP" src="src/lib/assets/bebop-light.svg" width="140">
  </picture>
</p>

<h1 align="center">be-BOP</h1>

<p align="center"><strong>The ethical sales toolbox.</strong></p>

<p align="center">
  Libre and open-source monetization, from e-commerce to Point of Sale —
  subscriptions, peerfunding, ticketing, booking, restaurant UI, and many payment
  methods, Bitcoin and Lightning included.<br>
  No vendor lock-in, no paywall, no subscription, no sales commission. Ever.
</p>

---

## Getting started

Four ways to run be-BOP.

### 1. Install wizard

One command on a fresh server:

```bash
curl -sfSL "https://be-bop.io/wizard/install.sh" -o be-bop-wizard.sh \
  && bash ./be-bop-wizard.sh -- --domain "your-domain.com" --email "you@example.com"
```

It installs and configures everything — MongoDB, Garage for object storage, web
server and TLS certificate — and hands you a working shop. You do not need to
clone this repository or install Node.

**You need** a VPS with 2 GB of RAM and 20 GB of storage, a domain name pointing
at it, and an email address for the TLS certificate.
**Technical level** — low: point a domain, connect over SSH, run one command.

📖 **[Step-by-step guide with screenshots →](https://be-bop.io/get-started-diy)**

### 2. Cloud

Hosted by be-BOP.io, nothing to install or maintain:

- **Switzerland** — [ch.be-bop.io](https://ch.be-bop.io)
- **French Polynesia** — [pf.be-bop.io](https://pf.be-bop.io)

Stay tuned for new markets opening!

**You need** to comply with the service's terms of use, an email address, and a
payment mean for the monthly subscription.
**Technical level** — none.

To try it first, spin up a [free 4-hour
sandbox](https://sandbox.be-bop.dev/product/be-bop-sandbox-2h) — no account, no
card.

### 3. Docker

`docker compose up` brings up be-BOP with a MongoDB and an S3 storage. Good for
local development, and for a single-host deployment you manage yourself.

**You need** Docker, and the environment variables from
[Configuration](#configuration). See [Docker Compose](#docker-compose).
**Technical level** — high: you own the containers, the backups and the reverse
proxy.

### 4. Self install

Bring your own MongoDB replica set and S3 storage, and run be-BOP with Node.

**You need** everything listed in [Requirements](#requirements).
**Technical level** — expert.

## What you can sell

|                                   |                                                                       |
| --------------------------------- | --------------------------------------------------------------------- |
| **E-commerce**                    | Physical and digital products, stock, variations, delivery zones      |
| **Point of Sale**                 | In-person checkout, touchscreen interface, restaurant tabs, Z-tickets |
| **Subscriptions**                 | Recurring memberships and plans, with reminders                       |
| **Peerfunding**                   | Fund goals and projects, with progress widgets and leaderboards       |
| **Ticketing & booking**           | Sell, schedule and validate tickets; calendar-based bookings          |
| **Donations & pay-what-you-want** | Customer-set pricing, deposits, partial payments                      |

**Payments.**

- **Bitcoin and Lightning** — your own node, or nodeless with `phoenixd`. Also through BTCPay Server, Swiss Bitcoin Pay or Blink.
- **Cards** — Stripe, SumUp, OSB.
- **PayPal**.
- **GNU Taler** — digital cash.
- **At the counter** — cash and custom methods.

**Also built in.** A CMS with embeddable widgets, a Nostr bot, multi-currency
pricing, VAT profiles per country, invoicing, and an admin back-office
available in 7 languages.

## Documentation

The back-office documentation lives in [`docs/`](docs/), one folder per
language.

|                      |                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Start here**       | [Initialize be-BOP](docs/en/00%20-%20initialize%20beBOP.md) — first steps after installation                                         |
| **Full walkthrough** | [Step-by-step guide](docs/en/be-BOP-step-by-step-doc-EN-🇬🇧.md)                                                                       |
| **Point of Sale**    | [PoS options](docs/en/point-of-sale-options.md)                                                                                      |
| **CMS**              | [Required CMS pages](docs/en/required-CMS-pages.md) · [Customise cart & checkout](docs/en/customise-cart-checkout-order-with-CMS.md) |
| **Team & access**    | [Back-office access](docs/en/back-office-access.md)                                                                                  |
| **Delivery**         | [Delivery management](docs/en/delivery-management.md)                                                                                |
| **Questions**        | [FAQ](docs/en/FAQ.md)                                                                                                                |

Other languages: [🇫🇷 Français](docs/fr/) (the most complete set, 62 documents,
including VAT configuration, reporting, stock, subscriptions and the be-BOP
manifesto) · [🇩🇪 Deutsch](docs/de/) · [🇪🇸 Español](docs/es-sv/) ·
[🇮🇹 Italiano](docs/it/) · [🇳🇱 Nederlands](docs/nl/) · [🇵🇹 Português](docs/pt/)

---

# Running from source

Everything below is for contributors and for operators who prefer to deploy by
hand rather than with the wizard.

## Table of contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
  - [Option A: Cloud services (minimal setup)](#option-a-cloud-services-minimal-setup)
  - [Option B: Docker Compose (fully local)](#option-b-docker-compose-fully-local)
- [Configuration](#configuration)
  - [Core](#core)
  - [S3 object storage](#s3-object-storage)
  - [Email and notifications](#email-and-notifications)
  - [Bitcoin & Lightning](#bitcoin--lightning)
  - [SSO sign-in](#sso-sign-in)
- [Production](#production)
  - [Running](#running)
  - [Docker](#docker)
  - [Docker Compose](#docker-compose)
- [Operations](#operations)
  - [Reverse proxy](#reverse-proxy)
  - [Maintenance mode](#maintenance-mode)
  - [Copying DB & S3 to another instance](#copying-db--s3-to-another-instance)
- [Analytics](#analytics)
- [Contributing](#contributing)
- [Licence](#licence)

## Requirements

- **Node.js 18+**, with corepack enabled: `corepack enable`
- **pnpm** (enabled via corepack — you may need `sudo corepack enable`)
- **Git LFS**, installed with `git lfs install`
- A **MongoDB replica set** — run it in Docker or use [MongoDB Atlas](https://www.mongodb.com/atlas/database)
- An **S3-compatible object storage** — [Garage](https://garagehq.deuxfleurs.fr/) (open source, lightweight, what the wizard installs), or a paid service like AWS or Scaleway. be-BOP configures the bucket to accept CORS `PUT` calls automatically.

Optional, depending on what you sell and how you notify customers:

- **SMTP credentials** for email — or a **Nostr `nsec`** (`NOSTR_PRIVATE_KEY`) to notify over Nostr instead
- A **Bitcoin node and lnd** — not required: `phoenixd` gives you Lightning and Bitcoin nodeless, straight from the admin UI

## Quick start

```bash
pnpm install
pnpm dev
```

be-BOP still needs a MongoDB replica set and an S3-compatible object storage.
Pick one of the two setups below, add the variables to a `.env.local` file, then
run `pnpm dev`.

### Option A: Cloud services (minimal setup)

Use [MongoDB Atlas](https://www.mongodb.com/atlas/database) for the database and
a hosted S3 (AWS, Scaleway…) for the object storage, then put their credentials
in `.env.local`. See [Configuration](#configuration) for the variable names.

### Option B: Docker Compose (fully local)

Runs MongoDB and an S3 storage locally. Add an S3 access key and secret to `.env.local`
if they are not there yet:

```console
echo "S3_KEY_ID=$(openssl rand -base64 63 | tr -d '\n')" >> .env.local
echo "S3_KEY_SECRET=$(openssl rand -base64 63 | tr -d '\n')" >> .env.local
```

Then start the containers:

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.override.yml up -d
```

## Configuration

Add a `.env.local` (or `.env.{development,test,production}.local`) file for
secrets that should not be committed to git; these override the values in
`.env`.

### Core

| Variable                    | Description                                                                                                                                                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URL`               | The connection URL to the MongoDB replica set                                                                                                                                                                                                                                                         |
| `MONGODB_DB`                | The DB name, defaulting to `bebop`                                                                                                                                                                                                                                                                    |
| `MONGODB_DIRECT_CONNECTION` | Set to `true` to connect directly to a single node rather than discovering the replica set                                                                                                                                                                                                            |
| `ORIGIN`                    | The URL where be-BOP will be deployed, e.g. `https://bebop.example.com`                                                                                                                                                                                                                               |
| `NOSTR_PRIVATE_KEY`         | Private key (`nsec…`) used to send Nostr notifications                                                                                                                                                                                                                                                |
| `LINK_PRELOAD_HEADERS`      | Set to `true` to enable the `Link rel=preload` header ([explanation](https://nitropack.io/blog/post/link-rel-preload-explained)). If you do, you may need to raise nginx's `proxy_buffer_size 16k` ([explanation](https://www.getpagespeed.com/server-setup/nginx/tuning-proxy_buffer_size-in-nginx)) |
| `BODY_SIZE_LIMIT`           | Maximum upload size in bytes, e.g. `20000000` for 20 MB. Not needed for normal usage                                                                                                                                                                                                                  |
| `PORT`                      | Port to listen on, defaults to `3000`                                                                                                                                                                                                                                                                 |

### S3 object storage

be-BOP automatically configures the S3 bucket to accept CORS `PUT` calls.

| Variable                 | Description                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `S3_BUCKET`              | The bucket name for the S3-compatible object storage                                           |
| `S3_ENDPOINT_URL`        | The endpoint, e.g. `http://s3.fr-par.scw.cloud` or `http://s3-website.us-east-1.amazonaws.com` |
| `PUBLIC_S3_ENDPOINT_URL` | Public-facing endpoint used to build browser-visible asset URLs                                |
| `S3_REGION`              | The region of the bucket                                                                       |
| `S3_KEY_ID`              | The access key ID                                                                              |
| `S3_KEY_SECRET`          | The access key secret                                                                          |

### Email and notifications

Order notifications can go out over email, over Nostr, or both. For email, set
all four `SMTP_*` variables; for Nostr, set `NOSTR_PRIVATE_KEY` in
[Core](#core).

| Variable        | Description                                                                      |
| --------------- | -------------------------------------------------------------------------------- |
| `SMTP_HOST`     | SMTP server host — set all four `SMTP_*` variables to enable email notifications |
| `SMTP_PORT`     | SMTP server port                                                                 |
| `SMTP_USER`     | SMTP username                                                                    |
| `SMTP_PASSWORD` | SMTP password                                                                    |
| `SMTP_FROM`     | Optional sender address, defaults to `SMTP_USER`                                 |
| `SMTP_FAKE`     | Set to `true` to mock emails in development                                      |

### Bitcoin & Lightning

> 🚨 You can use `phoenixd` for Lightning and Bitcoin **nodeless directly from
> the UI**, without setting up any of these variables.

| Variable               | Description                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BITCOIN_RPC_URL`      | The RPC url for the bitcoin node. Set to `http://127.0.0.1:8332` if you run a bitcoin node locally with default configuration                                                                                                                                                                                     |
| `BITCOIN_RPC_USER`     | The RPC user                                                                                                                                                                                                                                                                                                      |
| `BITCOIN_RPC_PASSWORD` | The RPC password                                                                                                                                                                                                                                                                                                  |
| `BIP84_XPUB`           | With derivation path `m/84'/0'/0'`. If you have a ZPub, use the [xpub converter](https://jlopp.github.io/xpub-converter/). This enables a completely trustless setup, where the be-BOP server never knows the private key. You can generate the xpub from Sparrow Wallet, for example                             |
| `LND_REST_URL`         | The LND REST interface URL. Set to `http://127.0.0.1:8080` if you run an lnd node locally with default configuration                                                                                                                                                                                              |
| `LND_MACAROON_PATH`    | Where the credentials for lnd are located, e.g. `~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon`. Leave empty if lnd runs with `--no-macaroons`, or if you use `LND_MACAROON_VALUE`. You can use `invoices.macaroon` instead of `admin.macaroon`, but then the admin LND page will not work — orders still will |
| `LND_MACAROON_VALUE`   | Upper-case hex-encoded macaroon. Leave empty if lnd runs with `--no-macaroons`, or if you use `LND_MACAROON_PATH`. Example: `cat .lnd/data/chain/bitcoin/mainnet/admin.macaroon \| hexdump -e '16/1 "%02X"'`                                                                                                      |
| `TOR_PROXY_URL`        | URL of the SOCKS5 proxy used to reach TOR. If set, and `BITCOIN_RPC_URL` or `LND_REST_URL` is a `.onion` address, that node is reached through the proxy                                                                                                                                                          |

### SSO sign-in

Set the following variables to allow SSO. On each provider's website, set the
redirect URL to `https://<your-domain>/api/callback/<provider>`, where
`<provider>` is one of `github`, `google`, `facebook`, or `twitter`:

| Provider | Variables                        |
| -------- | -------------------------------- |
| GitHub   | `GITHUB_ID`, `GITHUB_SECRET`     |
| Google   | `GOOGLE_ID`, `GOOGLE_SECRET`     |
| Facebook | `FACEBOOK_ID`, `FACEBOOK_SECRET` |
| Twitter  | `TWITTER_ID`, `TWITTER_SECRET`   |

## Production

### Running

```shell
pnpm run build
node --enable-source-maps build/index.js
```

Behind a reverse proxy, add the headers described in
[Reverse proxy](#reverse-proxy):

```shell
ADDRESS_HEADER=X-Forwarded-For XFF_DEPTH=1 node build/index.js
```

You can also use [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/) to
manage the process and run it on multiple cores:

```shell
NODE_OPTIONS=--enable-source-maps pm2 start --name bebop --update-env build/index.js

# behind a reverse proxy
NODE_OPTIONS=--enable-source-maps ADDRESS_HEADER=X-Forwarded-For XFF_DEPTH=1 pm2 start --name bebop --update-env build/index.js
```

### Docker

Build the image:

```shell
docker build -t bebop .
```

Run it with environment variables:

```shell
export DOTENV_LOCAL=$(cat .env.local)
docker run -p 3000:3000 --env DOTENV_LOCAL=$DOTENV_LOCAL bebop --add-host=host.docker.internal:host-gateway
```

or

```shell
# Careful: double quotes around values in .env.local are not ignored
docker run -p 3000:3000 --env-file .env.local bebop --add-host=host.docker.internal:host-gateway
```

> **Reaching a local node from Docker:** use `host.docker.internal` as the
> hostname instead of `localhost`, e.g.
> `BITCOIN_RPC_URL=http://host.docker.internal:8332`.

### Docker Compose

Docker Compose is used for local development, but it also works in production.
It launches a MongoDB and an S3 storage container.

Add an S3 access key and secret to `.env.local` if not already present:

```console
echo "S3_KEY_ID=$(openssl rand -base64 63 | tr -d '\n')" >> .env.local
echo "S3_KEY_SECRET=$(openssl rand -base64 63 | tr -d '\n')" >> .env.local
```

Make sure you have a fairly recent version of docker and docker compose, then:

```shell
# optional: update dependencies
docker compose pull
# --build rebuilds the image when the code changes; --force-recreate forces it
docker compose --env-file .env.local up --build -d
```

The object storage will be available on http://localhost:9000 and be-BOP on
http://localhost:3000.

Helper commands:

```bash
docker compose ps              # see the containers
docker compose logs bebop -f   # follow the logs
docker compose exec bebop sh   # enter the container
docker compose down            # stop the containers
```

For production, set `ORIGIN` and the public URL of your object storage in
`.env.local`:

```env
ORIGIN=https://bebop.example.com
S3_ENDPOINT_URL=https://s3.bebop.example.com
```

See [Configuration](#configuration) for the other variables. To reach a local
BTC or LND node, use `host.docker.internal` (see [Docker](#docker)).

## Operations

### Reverse proxy

Behind a reverse proxy such as nginx, set `ADDRESS_HEADER` to `X-Forwarded-For`
and `XFF_DEPTH` to `1` (or whatever matches your setup) so be-BOP resolves your
users' IP addresses correctly. This also matters for
[maintenance mode](#maintenance-mode).

### Maintenance mode

Maintenance mode is enabled from the admin. It relies on correct client IP
resolution — behind a reverse proxy, configure it as described in
[Reverse proxy](#reverse-proxy) first, or you will lock yourself out.

### Copying DB & S3 to another instance

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

## Analytics

Analytics are entirely optional — be-BOP runs without them, and ships no tracker
of its own.

Go to `/admin/config` and paste the script URL of your favourite analytics tool
with a snippet. For example, with a self-hosted
[Plausible](https://plausible.io/docs/self-hosting):

```
https://plausible.your-domain.com/js/script.js
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for localisation and testing notes.

```console
pnpm test:unit -t "<part of test name>"   # run one unit test
pnpm run check                            # type-check
pnpm run lint                             # lint
```

Translations live in `src/lib/translations`, one JSON file per language. Add a
language by creating its file and registering it in
`src/lib/translations/index.ts`. In Svelte pages and components, call
`useI18n()` once at top level so SSR picks the right locale — parallel requests
can be in different languages.

## Licence

be-BOP is [GNU AGPL v3](LICENCE) — libre, open source, copyleft.

Available for custom development: **contact@be-bop.io**
