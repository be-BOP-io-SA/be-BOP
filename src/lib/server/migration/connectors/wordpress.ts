import { z } from 'zod';
import he from 'he';
import type {
	MigrationConnector,
	MigrationConnectorContext,
	StagedObjectInput
} from '../connector';
import type { MigrationOrigin } from '$lib/types/MigrationStagedObject';

const configSchema = z.object({
	wpUrl: z.string().url(),
	username: z.string().min(1),
	appPassword: z.string().min(1),
	fetchAllMedia: z
		.union([z.boolean(), z.string()])
		.transform((v) => (typeof v === 'string' ? v === 'true' || v === 'on' : v))
		.default(true)
});

type Config = z.infer<typeof configSchema>;

function authHeader(config: Config): string {
	return 'Basic ' + Buffer.from(`${config.username}:${config.appPassword}`).toString('base64');
}

function trimTrailingSlash(url: string): string {
	return url.replace(/\/$/, '');
}

/**
 * Convert a WP-rendered HTML fragment to plain text. WP exposes things like
 * excerpts wrapped in `<p>…</p>`, so we strip tags, collapse whitespace, and
 * decode HTML entities for fields that consumers will treat as plain text
 * (page title, short description, alt text, …). Body content keeps its
 * HTML — this helper is not for that.
 */
function htmlToPlainText(html: string): string {
	if (!html) return '';
	return he
		.decode(
			html
				.replace(/<\/(p|div|li|h[1-6]|tr|td|th)>/gi, ' ')
				.replace(/<br\s*\/?>(?!\s)/gi, ' ')
				.replace(/<[^>]*>/g, '')
				.replace(/\s+/g, ' ')
		)
		.trim();
}

function extractImageUrls(html: string): string[] {
	if (!html) return [];
	const urls: string[] = [];
	const re = /<img[^>]+src=["']([^"']+)["']/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) {
		urls.push(m[1]);
	}
	return urls;
}

interface ImageRefRegistry {
	addByMediaId(id: number, origin: MigrationOrigin): void;
	addByUrl(url: string, origin: MigrationOrigin): void;
	originsForMedia(mediaId: number, mediaUrl: string | undefined): MigrationOrigin[];
}

function createImageRefRegistry(): ImageRefRegistry {
	const byId = new Map<number, MigrationOrigin[]>();
	const byUrl = new Map<string, MigrationOrigin[]>();
	return {
		addByMediaId(id, origin) {
			if (!id) return;
			const list = byId.get(id) ?? [];
			list.push(origin);
			byId.set(id, list);
		},
		addByUrl(url, origin) {
			if (!url) return;
			const list = byUrl.get(url) ?? [];
			list.push(origin);
			byUrl.set(url, list);
		},
		originsForMedia(mediaId, mediaUrl) {
			const out: MigrationOrigin[] = [];
			if (mediaId && byId.has(mediaId)) out.push(...byId.get(mediaId)!);
			if (mediaUrl && byUrl.has(mediaUrl)) out.push(...byUrl.get(mediaUrl)!);
			return out;
		}
	};
}

interface WpRenderedField {
	rendered?: string;
}

interface WpPostLike {
	id: number;
	slug: string;
	status: string;
	title?: WpRenderedField;
	content?: WpRenderedField;
	excerpt?: WpRenderedField;
	parent?: number;
	menu_order?: number;
	featured_media?: number;
	date?: string;
	modified?: string;
	link?: string;
}

interface WpMedia {
	id: number;
	slug?: string;
	source_url?: string;
	mime_type?: string;
	alt_text?: string;
	caption?: WpRenderedField;
	title?: WpRenderedField;
	media_type?: string;
	media_details?: { width?: number; height?: number };
	date?: string;
}

interface WpTheme {
	stylesheet?: string;
	template?: string;
	status?: string;
	name?: { raw?: string; rendered?: string };
	description?: { raw?: string; rendered?: string };
	version?: string;
	theme_uri?: { raw?: string; rendered?: string };
	author?: { raw?: string; rendered?: string };
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<{
	ok: boolean;
	status: number;
	body: unknown;
	totalPages?: number;
	total?: number;
}> {
	const res = await fetch(url, { headers });
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		return { ok: false, status: res.status, body };
	}
	const totalPages = Number(res.headers.get('x-wp-totalpages') ?? '');
	const total = Number(res.headers.get('x-wp-total') ?? '');
	return {
		ok: true,
		status: res.status,
		body: await res.json(),
		totalPages: Number.isFinite(totalPages) ? totalPages : undefined,
		total: Number.isFinite(total) ? total : undefined
	};
}

function* postLikeStaged(
	items: WpPostLike[],
	startIndex: number,
	postType: 'wp_page' | 'wp_post',
	parentContextForRefs: 'cmsPage',
	registry: ImageRefRegistry
): Generator<StagedObjectInput> {
	let i = startIndex;
	for (const item of items) {
		i++;
		const sourceId = postType === 'wp_page' ? `wp_page_${item.id}` : `wp_post_${item.id}`;
		const titleText = htmlToPlainText(item.title?.rendered ?? '');
		const excerptText = htmlToPlainText(item.excerpt?.rendered ?? '');
		const contentHtml = item.content?.rendered ?? '';

		// Register image references found in this post for later media-stage origin assignment.
		if (item.featured_media) {
			registry.addByMediaId(item.featured_media, {
				context: parentContextForRefs,
				parentSourceId: sourceId,
				role: 'featured'
			});
		}
		for (const url of extractImageUrls(contentHtml)) {
			registry.addByUrl(url, { context: parentContextForRefs, parentSourceId: sourceId });
		}

		yield {
			sourceId,
			sourceType: postType,
			type: 'cmsPage',
			raw: item as unknown as Record<string, unknown>,
			normalized: {
				title: titleText,
				slug: item.slug,
				status: item.status,
				content: contentHtml,
				excerpt: excerptText,
				...(item.parent ? { parent: item.parent } : {}),
				...(item.featured_media
					? { featuredMediaId: item.featured_media }
					: {}),
				...(item.menu_order !== undefined ? { menuOrder: item.menu_order } : {}),
				...(item.date ? { sourceDate: item.date } : {}),
				...(item.modified ? { sourceModified: item.modified } : {}),
				...(item.link ? { sourceLink: item.link } : {})
			}
		};
	}
}

async function* fetchPostType(
	baseUrl: string,
	headers: Record<string, string>,
	ctx: MigrationConnectorContext,
	endpoint: 'pages' | 'posts',
	registry: ImageRefRegistry
): AsyncGenerator<StagedObjectInput> {
	let pageNum = 1;
	let totalPages: number | null = null;
	let totalItems = 0;
	let current = 0;
	const sourceType: 'wp_page' | 'wp_post' = endpoint === 'pages' ? 'wp_page' : 'wp_post';

	while (true) {
		const url = `${baseUrl}/wp-json/wp/v2/${endpoint}?per_page=100&page=${pageNum}&status=any&context=edit`;
		const r = await fetchJson(url, headers);
		if (!r.ok) {
			if (r.status === 400 && pageNum > 1) break;
			throw new Error(
				`WP ${endpoint} fetch HTTP ${r.status}: ${String(r.body).slice(0, 200)}`
			);
		}

		if (totalPages === null) {
			totalPages = r.totalPages ?? 1;
			totalItems = r.total ?? 0;
		}

		const items = r.body as WpPostLike[];
		if (!Array.isArray(items) || items.length === 0) break;

		for (const out of postLikeStaged(items, current, sourceType, 'cmsPage', registry)) {
			current++;
			ctx.reportProgress({ step: endpoint, current, total: totalItems });
			yield out;
		}

		if (totalPages !== null && pageNum >= totalPages) break;
		pageNum++;
	}
}

async function* fetchSettings(
	baseUrl: string,
	headers: Record<string, string>,
	ctx: MigrationConnectorContext,
	registry: ImageRefRegistry
): AsyncGenerator<StagedObjectInput> {
	ctx.reportProgress({ step: 'settings', current: 0, total: 1 });
	const r = await fetchJson(`${baseUrl}/wp-json/wp/v2/settings`, headers);
	if (!r.ok) {
		// Non-admin tokens get 401/403 here. We don't want the whole job to die,
		// just skip settings and move on.
		console.warn(`[wordpress] settings fetch skipped (HTTP ${r.status})`);
		return;
	}
	const data = r.body as Record<string, unknown>;

	if (typeof data.site_logo === 'number' && data.site_logo > 0) {
		registry.addByMediaId(data.site_logo as number, {
			context: 'settings',
			settingKey: 'site_logo'
		});
	}
	if (typeof data.site_icon === 'number' && data.site_icon > 0) {
		registry.addByMediaId(data.site_icon as number, {
			context: 'settings',
			settingKey: 'site_icon'
		});
	}

	ctx.reportProgress({ step: 'settings', current: 1, total: 1 });
	yield {
		sourceId: 'wp_settings',
		sourceType: 'wp_settings',
		type: 'settings',
		raw: data,
		normalized: {
			title: typeof data.title === 'string' ? data.title : '',
			description: typeof data.description === 'string' ? data.description : '',
			...(typeof data.url === 'string' ? { url: data.url } : {}),
			...(typeof data.email === 'string' ? { email: data.email } : {}),
			...(typeof data.timezone === 'string' ? { timezone: data.timezone } : {}),
			...(typeof data.date_format === 'string' ? { dateFormat: data.date_format } : {}),
			...(typeof data.time_format === 'string' ? { timeFormat: data.time_format } : {}),
			...(typeof data.start_of_week === 'number'
				? { startOfWeek: data.start_of_week }
				: {}),
			...(typeof data.language === 'string' ? { language: data.language } : {}),
			...(typeof data.use_smilies === 'boolean' ? { useSmilies: data.use_smilies } : {}),
			...(typeof data.posts_per_page === 'number'
				? { postsPerPage: data.posts_per_page }
				: {}),
			...(typeof data.default_category === 'number'
				? { defaultCategory: data.default_category }
				: {}),
			...(typeof data.site_logo === 'number' ? { siteLogoMediaId: data.site_logo } : {}),
			...(typeof data.site_icon === 'number' ? { siteIconMediaId: data.site_icon } : {})
		}
	};
}

async function* fetchActiveTheme(
	baseUrl: string,
	headers: Record<string, string>,
	ctx: MigrationConnectorContext
): AsyncGenerator<StagedObjectInput> {
	ctx.reportProgress({ step: 'theme', current: 0, total: 1 });
	const r = await fetchJson(`${baseUrl}/wp-json/wp/v2/themes?status=active`, headers);
	if (!r.ok) {
		console.warn(`[wordpress] theme fetch skipped (HTTP ${r.status})`);
		return;
	}
	const themes = r.body as WpTheme[];
	if (!Array.isArray(themes) || themes.length === 0) return;
	const theme = themes[0];
	const slug = theme.stylesheet ?? theme.template ?? 'unknown';

	// Try to fetch global styles (theme.json-derived) for the active theme.
	// Optional — older WP versions may not expose this.
	let globalStyles: unknown = undefined;
	const gs = await fetchJson(
		`${baseUrl}/wp-json/wp/v2/global-styles/themes/${encodeURIComponent(slug)}`,
		headers
	);
	if (gs.ok) {
		globalStyles = gs.body;
	}

	ctx.reportProgress({ step: 'theme', current: 1, total: 1 });
	yield {
		sourceId: `wp_theme_${slug}`,
		sourceType: 'wp_theme',
		type: 'theme',
		raw: { theme, globalStyles } as unknown as Record<string, unknown>,
		normalized: {
			name: htmlToPlainText(theme.name?.rendered ?? theme.name?.raw ?? ''),
			slug,
			...(theme.version ? { version: theme.version } : {}),
			...(theme.theme_uri?.rendered
				? { themeUri: theme.theme_uri.rendered }
				: theme.theme_uri?.raw
					? { themeUri: theme.theme_uri.raw }
					: {}),
			...(theme.author?.rendered
				? { author: htmlToPlainText(theme.author.rendered) }
				: theme.author?.raw
					? { author: theme.author.raw }
					: {}),
			...(theme.description?.rendered
				? { description: htmlToPlainText(theme.description.rendered) }
				: {}),
			...(globalStyles ? { hasGlobalStyles: true } : { hasGlobalStyles: false })
		}
	};
}

async function* fetchMedia(
	baseUrl: string,
	headers: Record<string, string>,
	ctx: MigrationConnectorContext,
	registry: ImageRefRegistry,
	fetchAllMedia: boolean
): AsyncGenerator<StagedObjectInput> {
	let pageNum = 1;
	let totalPages: number | null = null;
	let totalItems = 0;
	let current = 0;

	while (true) {
		const url = `${baseUrl}/wp-json/wp/v2/media?per_page=100&page=${pageNum}&context=edit`;
		const r = await fetchJson(url, headers);
		if (!r.ok) {
			if (r.status === 400 && pageNum > 1) break;
			console.warn(`[wordpress] media fetch HTTP ${r.status}, skipping`);
			return;
		}

		if (totalPages === null) {
			totalPages = r.totalPages ?? 1;
			totalItems = r.total ?? 0;
		}

		const items = r.body as WpMedia[];
		if (!Array.isArray(items) || items.length === 0) break;

		for (const item of items) {
			current++;
			ctx.reportProgress({ step: 'media', current, total: totalItems });

			const origins = registry.originsForMedia(item.id, item.source_url);
			// Mode B: only stage referenced media. Mode A (default): stage all,
			// origins = [{context:'standalone'}] for unreferenced.
			if (origins.length === 0) {
				if (!fetchAllMedia) continue;
				origins.push({ context: 'standalone' });
			}

			yield {
				sourceId: `wp_media_${item.id}`,
				sourceType: 'wp_media',
				type: 'image',
				raw: item as unknown as Record<string, unknown>,
				origins,
				normalized: {
					...(item.source_url ? { url: item.source_url } : {}),
					...(item.mime_type ? { mimeType: item.mime_type } : {}),
					alt: item.alt_text ?? '',
					title: htmlToPlainText(item.title?.rendered ?? ''),
					caption: htmlToPlainText(item.caption?.rendered ?? ''),
					...(item.media_details?.width ? { width: item.media_details.width } : {}),
					...(item.media_details?.height ? { height: item.media_details.height } : {}),
					...(item.slug ? { slug: item.slug } : {}),
					...(item.date ? { sourceDate: item.date } : {})
				}
			};
		}

		if (totalPages !== null && pageNum >= totalPages) break;
		pageNum++;
	}
}

async function* fetchWooProducts(
	baseUrl: string,
	headers: Record<string, string>,
	ctx: MigrationConnectorContext,
	registry: ImageRefRegistry
): AsyncGenerator<StagedObjectInput> {
	let pageNum = 1;
	let totalPages: number | null = null;
	let totalItems = 0;
	let current = 0;

	while (true) {
		const url = `${baseUrl}/wp-json/wc/v3/products?per_page=100&page=${pageNum}`;
		const r = await fetchJson(url, headers);
		if (!r.ok) {
			// WC not installed → first call returns 404. Skip silently.
			if (pageNum === 1 && (r.status === 404 || r.status === 401)) return;
			if (r.status === 400 && pageNum > 1) break;
			console.warn(`[wordpress] WooCommerce products fetch HTTP ${r.status}, skipping`);
			return;
		}

		if (totalPages === null) {
			totalPages = r.totalPages ?? 1;
			totalItems = r.total ?? 0;
		}

		const items = r.body as Array<Record<string, unknown>>;
		if (!Array.isArray(items) || items.length === 0) break;

		for (const item of items) {
			current++;
			ctx.reportProgress({ step: 'products', current, total: totalItems });

			const id = item.id as number;
			const sourceId = `wc_product_${id}`;
			const images = (item.images as Array<{ id?: number; src?: string }> | undefined) ?? [];
			images.forEach((img, idx) => {
				if (img.id) {
					registry.addByMediaId(img.id, {
						context: 'product',
						parentSourceId: sourceId,
						role: idx === 0 ? 'featured' : 'gallery'
					});
				}
				if (img.src) {
					registry.addByUrl(img.src, {
						context: 'product',
						parentSourceId: sourceId,
						role: idx === 0 ? 'featured' : 'gallery'
					});
				}
			});

			yield {
				sourceId,
				sourceType: 'wc_product',
				type: 'product',
				raw: item,
				normalized: {
					name: htmlToPlainText(String(item.name ?? '')),
					slug: typeof item.slug === 'string' ? item.slug : '',
					...(typeof item.sku === 'string' ? { sku: item.sku } : {}),
					...(typeof item.price === 'string' ? { price: item.price } : {}),
					...(typeof item.regular_price === 'string'
						? { regularPrice: item.regular_price }
						: {}),
					...(typeof item.sale_price === 'string'
						? { salePrice: item.sale_price }
						: {}),
					description: typeof item.description === 'string' ? item.description : '',
					shortDescription: htmlToPlainText(
						typeof item.short_description === 'string' ? item.short_description : ''
					),
					...(typeof item.status === 'string' ? { status: item.status } : {}),
					...(typeof item.stock_status === 'string'
						? { stockStatus: item.stock_status }
						: {}),
					...(typeof item.stock_quantity === 'number'
						? { stockQuantity: item.stock_quantity }
						: {}),
					...(Array.isArray(item.categories)
						? { categoryIds: (item.categories as Array<{ id: number }>).map((c) => c.id) }
						: {}),
					...(images.length > 0
						? { imageMediaIds: images.map((i) => i.id).filter((x): x is number => !!x) }
						: {})
				}
			};
		}

		if (totalPages !== null && pageNum >= totalPages) break;
		pageNum++;
	}
}

export const wordpressConnector: MigrationConnector<Config> = {
	id: 'wordpress',
	label: 'WordPress / WooCommerce',
	configSchema,
	secretFields: ['appPassword'],

	async testConnection(config) {
		try {
			const res = await fetch(`${trimTrailingSlash(config.wpUrl)}/wp-json/`, {
				headers: { Authorization: authHeader(config) }
			});
			if (!res.ok) {
				return { ok: false, message: `HTTP ${res.status} on /wp-json/` };
			}
			const data = (await res.json()) as { name?: string; description?: string };
			return {
				ok: true,
				message: `Connected to "${data.name ?? config.wpUrl}"`
			};
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : String(err)
			};
		}
	},

	async *fetch(config, ctx) {
		const baseUrl = trimTrailingSlash(config.wpUrl);
		const headers = { Authorization: authHeader(config) };
		const registry = createImageRefRegistry();

		// Order matters: anything that references images must run BEFORE the
		// media stage, so origins can be resolved when each media item is
		// emitted.
		yield* fetchPostType(baseUrl, headers, ctx, 'pages', registry);
		yield* fetchPostType(baseUrl, headers, ctx, 'posts', registry);
		yield* fetchSettings(baseUrl, headers, ctx, registry);
		yield* fetchActiveTheme(baseUrl, headers, ctx);
		yield* fetchWooProducts(baseUrl, headers, ctx, registry);
		yield* fetchMedia(baseUrl, headers, ctx, registry, config.fetchAllMedia);
	}
};
