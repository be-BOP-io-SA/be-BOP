import { env as dynPrivateEnv } from '$env/dynamic/private';
import { env as dynPublicEnv } from '$env/dynamic/public';
import * as staticPrivateEnv from '$env/static/private';
import * as staticPublicEnv from '$env/static/public';

export const ALLOW_BITCOIN_RPC =
	dynPrivateEnv.ALLOW_BITCOIN_RPC ?? staticPrivateEnv.ALLOW_BITCOIN_RPC;
export const ALLOW_DUMPING_WALLET =
	dynPrivateEnv.ALLOW_DUMPING_WALLET ?? staticPrivateEnv.ALLOW_DUMPING_WALLET;
export const ALLOW_JS_INJECTION =
	dynPrivateEnv.ALLOW_JS_INJECTION ?? staticPrivateEnv.ALLOW_JS_INJECTION;
export const ALLOW_LND_RPC = dynPrivateEnv.ALLOW_LND_RPC ?? staticPrivateEnv.ALLOW_LND_RPC;
export const BIP84_XPUB = dynPrivateEnv.BIP84_XPUB ?? staticPrivateEnv.BIP84_XPUB;
export const BITCOIN_RPC_PASSWORD =
	dynPrivateEnv.BITCOIN_RPC_PASSWORD ?? staticPrivateEnv.BITCOIN_RPC_PASSWORD;
export const BITCOIN_RPC_URL = dynPrivateEnv.BITCOIN_RPC_URL ?? staticPrivateEnv.BITCOIN_RPC_URL;
export const BITCOIN_RPC_USER = dynPrivateEnv.BITCOIN_RPC_USER ?? staticPrivateEnv.BITCOIN_RPC_USER;
export const FACEBOOK_ID = dynPrivateEnv.FACEBOOK_ID ?? staticPrivateEnv.FACEBOOK_ID;
export const FACEBOOK_SECRET = dynPrivateEnv.FACEBOOK_SECRET ?? staticPrivateEnv.FACEBOOK_SECRET;
export const GITHUB_ID = dynPrivateEnv.GITHUB_ID ?? staticPrivateEnv.GITHUB_ID;
export const GITHUB_SECRET = dynPrivateEnv.GITHUB_SECRET ?? staticPrivateEnv.GITHUB_SECRET;
export const GOOGLE_ID = dynPrivateEnv.GOOGLE_ID ?? staticPrivateEnv.GOOGLE_ID;
export const GOOGLE_SECRET = dynPrivateEnv.GOOGLE_SECRET ?? staticPrivateEnv.GOOGLE_SECRET;
export const LINK_PRELOAD_HEADERS =
	dynPrivateEnv.LINK_PRELOAD_HEADERS ?? staticPrivateEnv.LINK_PRELOAD_HEADERS;
export const LND_MACAROON_PATH =
	dynPrivateEnv.LND_MACAROON_PATH ?? staticPrivateEnv.LND_MACAROON_PATH;
export const LND_MACAROON_VALUE =
	dynPrivateEnv.LND_MACAROON_VALUE ?? staticPrivateEnv.LND_MACAROON_VALUE;
export const LND_REST_URL = dynPrivateEnv.LND_REST_URL ?? staticPrivateEnv.LND_REST_URL;
export const MONGODB_DB = dynPrivateEnv.MONGODB_DB ?? staticPrivateEnv.MONGODB_DB;
export const MONGODB_DIRECT_CONNECTION =
	dynPrivateEnv.MONGODB_DIRECT_CONNECTION ?? staticPrivateEnv.MONGODB_DIRECT_CONNECTION;
export const MONGODB_IP_FAMILY =
	dynPrivateEnv.MONGODB_IP_FAMILY ?? staticPrivateEnv.MONGODB_IP_FAMILY;
export const MONGODB_URL = dynPrivateEnv.MONGODB_URL ?? staticPrivateEnv.MONGODB_URL;
export const NOSTR_PRIVATE_KEY =
	dynPrivateEnv.NOSTR_PRIVATE_KEY ?? staticPrivateEnv.NOSTR_PRIVATE_KEY;
export const NO_LOCK = dynPrivateEnv.NO_LOCK ?? staticPrivateEnv.NO_LOCK;
export const ORIGIN = dynPrivateEnv.ORIGIN ?? staticPrivateEnv.ORIGIN;
export const PUBLIC_S3_ENDPOINT_URL =
	dynPublicEnv.PUBLIC_S3_ENDPOINT_URL ?? staticPublicEnv.PUBLIC_S3_ENDPOINT_URL;
export const PHOENIXD_ENDPOINT_URL =
	dynPrivateEnv.PHOENIXD_ENDPOINT_URL ?? staticPrivateEnv.PHOENIXD_ENDPOINT_URL;
export const PHOENIXD_HTTP_PASSWORD =
	dynPrivateEnv.PHOENIXD_HTTP_PASSWORD ?? staticPrivateEnv.PHOENIXD_HTTP_PASSWORD;
export const S3_BUCKET = dynPrivateEnv.S3_BUCKET ?? staticPrivateEnv.S3_BUCKET;
export const S3_ENDPOINT_URL = dynPrivateEnv.S3_ENDPOINT_URL ?? staticPrivateEnv.S3_ENDPOINT_URL;
export const S3_KEY_ID = dynPrivateEnv.S3_KEY_ID ?? staticPrivateEnv.S3_KEY_ID;
export const S3_KEY_SECRET = dynPrivateEnv.S3_KEY_SECRET ?? staticPrivateEnv.S3_KEY_SECRET;
export const S3_PROXY_DOWNLOADS =
	dynPrivateEnv.S3_PROXY_DOWNLOADS ?? staticPrivateEnv.S3_PROXY_DOWNLOADS;
export const S3_REGION = dynPrivateEnv.S3_REGION ?? staticPrivateEnv.S3_REGION;
export const SMTP_FAKE = dynPrivateEnv.SMTP_FAKE ?? staticPrivateEnv.SMTP_FAKE;
export const SMTP_FROM = dynPrivateEnv.SMTP_FROM ?? staticPrivateEnv.SMTP_FROM;
export const SMTP_HOST = dynPrivateEnv.SMTP_HOST ?? staticPrivateEnv.SMTP_HOST;
export const SMTP_PASSWORD = dynPrivateEnv.SMTP_PASSWORD ?? staticPrivateEnv.SMTP_PASSWORD;
export const SMTP_PORT = dynPrivateEnv.SMTP_PORT ?? staticPrivateEnv.SMTP_PORT;
export const SMTP_USER = dynPrivateEnv.SMTP_USER ?? staticPrivateEnv.SMTP_USER;
export const TOR_PROXY_URL = dynPrivateEnv.TOR_PROXY_URL ?? staticPrivateEnv.TOR_PROXY_URL;
export const TWITTER_ID = dynPrivateEnv.TWITTER_ID ?? staticPrivateEnv.TWITTER_ID;
export const TWITTER_SECRET = dynPrivateEnv.TWITTER_SECRET ?? staticPrivateEnv.TWITTER_SECRET;
