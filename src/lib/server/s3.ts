import { building } from '$app/environment';
import { runtimeConfig } from '$lib/server/runtime-config';
import * as AWS from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _s3client: AWS.S3 | null = null;
let _publicS3Client: AWS.S3 | null = null;

export function s3IsConfigured() {
	return runtimeConfig.s3.bucket && runtimeConfig.s3.keyId && runtimeConfig.s3.keySecret;
}

function createS3Client(usePublicEndpoint = false): AWS.S3 {
	const endpointUrl = usePublicEndpoint
		? runtimeConfig.s3.publicEndpointUrl || runtimeConfig.s3.endpointUrl
		: runtimeConfig.s3.endpointUrl;

	return new AWS.S3({
		endpoint: endpointUrl || undefined,
		region:
			runtimeConfig.s3.region || 'us-east-1' /* “Harmless” region for providers who don't care */,
		credentials: {
			accessKeyId: runtimeConfig.s3.keyId,
			secretAccessKey: runtimeConfig.s3.keySecret
		},
		// Handle minio, eg http://minio:9000/bucket instead of http://bucket.minio:9000
		// Should work with any S3-compatible server, so no harm in leaving it on
		forcePathStyle: true
	});
}

export function getS3Client(): AWS.S3 {
	if (building) {
		return null as unknown as AWS.S3;
	}
	if (!_s3client) {
		_s3client = createS3Client(false);
		initializeS3Bucket().catch(console.error);
	}
	return _s3client;
}

export function getPublicS3Client(): AWS.S3 {
	if (building) {
		return null as unknown as AWS.S3;
	}
	if (!_publicS3Client) {
		_publicS3Client = createS3Client(true);
	}
	return _publicS3Client;
}

export async function resetS3Clients() {
	_s3client = null;
	_publicS3Client = null;
	await Promise.all([getS3Client(), getPublicS3Client()]);
}

export async function initializeS3Bucket() {
	const client = getS3Client();
	const bucket = runtimeConfig.s3.bucket;
	const region = runtimeConfig.s3.region;

	if (!bucket || !region) {
		console.warn('S3 bucket or region not configured, skipping S3 initialization');
		return;
	}

	try {
		console.log('Checking S3 bucket...');
		const buckets = await client.listBuckets({});

		if (!buckets.Buckets?.some((b) => b.Name === bucket)) {
			console.log('Creating S3 bucket...');
			await client.send(
				new AWS.CreateBucketCommand({
					Bucket: bucket,
					CreateBucketConfiguration: {
						LocationConstraint: region
					}
				})
			);
			console.log('S3 bucket created');
		}
	} catch (err) {
		console.error('S3 bucket error: ', err);
	}

	await client
		.send(
			new AWS.PutBucketCorsCommand({
				Bucket: bucket,
				CORSConfiguration: {
					CORSRules: [
						{
							AllowedMethods: ['PUT'],
							// todo: change to production domain
							AllowedOrigins: ['*'],
							AllowedHeaders: ['*']
							// DO NOT SPECIFY: OVH S3 does not support this
							// ID: 'CORSRule1'
						}
					]
				}
			})
		)
		.catch(() => {} /* (err) => console.error('S3 CORS error: ', err) */);
}

// Initialize S3 client on module load
if (!building && s3IsConfigured()) {
	try {
		getS3Client();
	} catch (err) {
		console.error('Failed to initialize S3 client: ', err);
	}
}

export function secureLink(url: string, params: { public: boolean }) {
	const endpointUrl = params.public
		? runtimeConfig.s3.publicEndpointUrl || runtimeConfig.s3.endpointUrl
		: runtimeConfig.s3.endpointUrl;

	if (url.startsWith('http:') && endpointUrl?.startsWith('https:')) {
		return url.replace('http:', 'https:');
	}
	return url;
}

/**
 * Call when the resulting URL is used in the browser.
 */
export async function getPublicS3DownloadLink(
	key: string,
	opts?: {
		expiresIn?: number;
		input?: Partial<AWS.GetObjectCommandInput>;
	}
) {
	const bucket = runtimeConfig.s3.bucket;

	return secureLink(
		await getSignedUrl(
			getPublicS3Client(),
			new AWS.GetObjectCommand({
				Bucket: bucket,
				Key: key,
				...opts?.input
			}),
			{ expiresIn: opts?.expiresIn ?? 24 * 3600 }
		),
		{ public: true }
	);
}

/**
 * Call when the resulting URL is used in the server.
 */
export async function getPrivateS3DownloadLink(
	key: string,
	opts?: {
		expiresIn?: number;
		input?: Partial<AWS.GetObjectCommandInput>;
	}
) {
	const bucket = runtimeConfig.s3.bucket;

	return secureLink(
		await getSignedUrl(
			getS3Client(),
			new AWS.GetObjectCommand({
				Bucket: bucket,
				Key: key,
				...opts?.input
			}),
			{ expiresIn: opts?.expiresIn ?? 24 * 3600 }
		),
		{ public: false }
	);
}

export function s3ProductPrefix(productId: string): string {
	return `products/${productId}/`;
}

export function s3TagPrefix(tagId: string): string {
	return `tags/${tagId}/`;
}
export function s3GalleryPrefix(galleryId: string): string {
	return `galleries/${galleryId}/`;
}
