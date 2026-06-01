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
	/**
	 * Optional WooCommerce REST API consumer key/secret. Generated in
	 * WC > Settings > Advanced > REST API. When both are provided, the
	 * connector uses them as Basic auth on /wc/v3/* endpoints instead of
	 * the WP App Password — needed when the App Password user has
	 * `manage_woocommerce` denied (common on managed hosts).
	 */
	wcConsumerKey: z.string().trim().optional(),
	wcConsumerSecret: z.string().trim().optional(),
	fetchAllMedia: z
		.union([z.boolean(), z.string()])
		.transform((v) => (typeof v === 'string' ? v === 'true' || v === 'on' : v))
		.default(true)
});

type Config = z.infer<typeof configSchema>;

function authHeader(config: Config): string {
	return 'Basic ' + Buffer.from(`${config.username}:${config.appPassword}`).toString('base64');
}

/**
 * Returns a Basic auth header from the WC consumer key/secret if both are
 * configured. Used as a substitute for the App Password on /wc/v3/* endpoints.
 */
function wcAuthHeader(config: Config): string | null {
	if (!config.wcConsumerKey || !config.wcConsumerSecret) return null;
	return (
		'Basic ' +
		Buffer.from(`${config.wcConsumerKey}:${config.wcConsumerSecret}`).toString('base64')
	);
}

function trimTrailingSlash(url: string): string {
	return url.replace(/\/$/, '');
}

/**
 * WP REST URLs come in two flavours depending on permalink configuration:
 * - "pretty" (default when permalinks are not "Plain"):
 *     https://shop/wp-json/wp/v2/pages?per_page=100
 * - "plain" (when WP permalinks are set to "Plain", or .htaccess / mod_rewrite
 *   is missing): only the rest_route query-string form responds:
 *     https://shop/?rest_route=/wp/v2/pages&per_page=100
 *
 * The connector detects which flavour the target WP supports once at the
 * start of a job (via testConnection or fetch) and reuses the same mode
 * for every subsequent request.
 */
type WpRestMode = 'pretty' | 'plain';

/**
 * Build a WP REST URL from a `/wp/v2/...` style path and a query map,
 * using the right form for the detected mode.
 */
function buildWpUrl(
	baseUrl: string,
	mode: WpRestMode,
	path: string,
	query?: Record<string, string | number>
): string {
	const ensuredPath = path.startsWith('/') ? path : `/${path}`;
	if (mode === 'pretty') {
		const qs = query
			? '?' +
			  new URLSearchParams(
					Object.entries(query).map(([k, v]) => [k, String(v)] as [string, string])
			  ).toString()
			: '';
		return `${baseUrl}/wp-json${ensuredPath}${qs}`;
	}
	const params = new URLSearchParams({ rest_route: ensuredPath });
	if (query) {
		for (const [k, v] of Object.entries(query)) params.set(k, String(v));
	}
	return `${baseUrl}/?${params.toString()}`;
}

/**
 * Probe both WP REST URL flavours and return the one that works,
 * along with the WP root payload for status messages.
 */
async function detectWpRestMode(
	baseUrl: string,
	headers: Record<string, string>
): Promise<
	| { ok: true; mode: WpRestMode; root: { name?: string } }
	| { ok: false; status: number; tried: 'pretty' | 'both' }
> {
	const pretty = await fetch(`${baseUrl}/wp-json/`, { headers }).catch(() => null);
	if (pretty?.ok) {
		const root = (await pretty.json().catch(() => ({}))) as { name?: string };
		return { ok: true, mode: 'pretty', root };
	}
	const plain = await fetch(`${baseUrl}/?rest_route=/`, { headers }).catch(() => null);
	if (plain?.ok) {
		const root = (await plain.json().catch(() => ({}))) as { name?: string };
		return { ok: true, mode: 'plain', root };
	}
	return {
		ok: false,
		status: pretty?.status ?? 0,
		tried: pretty ? 'both' : 'pretty'
	};
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

/**
 * Collect the IDs of pages that are auto-created by WordPress / WooCommerce
 * to back functional flows (shop, cart, checkout, my-account, T&Cs, blog
 * index, static homepage, privacy policy). These aren't editorial content
 * and shouldn't be migrated as CMS pages — they would conflict with be-BOP's
 * own routing for those features.
 */
async function fetchExcludedPageIds(
	baseUrl: string,
	headers: Record<string, string>,
	mode: WpRestMode
): Promise<Set<number>> {
	const excluded = new Set<number>();

	const wcPageSettingIds = new Set([
		'woocommerce_shop_page_id',
		'woocommerce_cart_page_id',
		'woocommerce_checkout_page_id',
		'woocommerce_myaccount_page_id',
		'woocommerce_terms_page_id'
	]);
	const wcAdvanced = await fetchJson(
		buildWpUrl(baseUrl, mode, '/wc/v3/settings/advanced'),
		headers
	);
	if (wcAdvanced.ok && Array.isArray(wcAdvanced.body)) {
		for (const s of wcAdvanced.body as Array<{ id?: string; value?: unknown }>) {
			if (typeof s.id === 'string' && wcPageSettingIds.has(s.id)) {
				const id =
					typeof s.value === 'string'
						? parseInt(s.value, 10)
						: typeof s.value === 'number'
							? s.value
							: 0;
				if (id > 0) excluded.add(id);
			}
		}
	}

	const wpSettings = await fetchJson(
		buildWpUrl(baseUrl, mode, '/wp/v2/settings'),
		headers
	);
	if (wpSettings.ok && wpSettings.body && typeof wpSettings.body === 'object') {
		const s = wpSettings.body as Record<string, unknown>;
		for (const key of ['page_for_posts', 'page_on_front', 'wp_page_for_privacy_policy']) {
			const v = s[key];
			const id = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 0;
			if (id > 0) excluded.add(id);
		}
	}

	return excluded;
}

async function* fetchPostType(
	baseUrl: string,
	headers: Record<string, string>,
	mode: WpRestMode,
	ctx: MigrationConnectorContext,
	endpoint: 'pages' | 'posts',
	registry: ImageRefRegistry,
	excludedIds: Set<number> = new Set()
): AsyncGenerator<StagedObjectInput> {
	let pageNum = 1;
	let totalPages: number | null = null;
	let totalItems = 0;
	let current = 0;
	let includeDrafts = true; // try status=any first; flip to false if WP rejects
	let useEditContext = true; // try context=edit first; flip to false if WP forbids
	const sourceType: 'wp_page' | 'wp_post' = endpoint === 'pages' ? 'wp_page' : 'wp_post';

	while (true) {
		const url = buildWpUrl(baseUrl, mode, `/wp/v2/${endpoint}`, {
			per_page: 100,
			page: pageNum,
			...(includeDrafts ? { status: 'any' } : {}),
			...(useEditContext ? { context: 'edit' } : {})
		});
		const r = await fetchJson(url, headers);
		if (!r.ok) {
			// Some WP users (non-admin or plugin-restricted) lack the capability
			// to read non-public statuses; `status=any` returns 400
			// rest_invalid_param. Drop it and keep migrating the published content.
			if (
				r.status === 400 &&
				includeDrafts &&
				typeof r.body === 'string' &&
				r.body.includes('rest_invalid_param') &&
				r.body.toLowerCase().includes('status')
			) {
				console.warn(
					`[wordpress] ${endpoint}: WP user lacks capability to read drafts/private; ` +
						'falling back to published only.'
				);
				includeDrafts = false;
				continue;
			}
			// Same population also lacks edit_posts, so `context=edit` returns
			// 401/403 rest_forbidden_context. Drop it and keep going with the
			// default `view` context (rendered title/content/excerpt are still
			// available, which is all we use).
			if (
				(r.status === 401 || r.status === 403) &&
				useEditContext &&
				typeof r.body === 'string' &&
				r.body.includes('rest_forbidden_context')
			) {
				console.warn(
					`[wordpress] ${endpoint}: context=edit forbidden; falling back to view context.`
				);
				useEditContext = false;
				continue;
			}
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

		const filtered =
			excludedIds.size > 0 ? items.filter((it) => !excludedIds.has(it.id)) : items;

		for (const out of postLikeStaged(filtered, current, sourceType, 'cmsPage', registry)) {
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
	mode: WpRestMode,
	ctx: MigrationConnectorContext,
	registry: ImageRefRegistry
): AsyncGenerator<StagedObjectInput> {
	ctx.reportProgress({ step: 'settings', current: 0, total: 1 });
	const r = await fetchJson(buildWpUrl(baseUrl, mode, '/wp/v2/settings'), headers);
	if (!r.ok) {
		// `/wp/v2/settings` requires `manage_options`. Tokens without it get
		// 401/403; we don't want the whole job to die, just skip settings.
		const reason =
			r.status === 401 || r.status === 403
				? `HTTP ${r.status} — WP user lacks manage_options`
				: `HTTP ${r.status}`;
		ctx.reportSkip('settings', reason);
		console.warn(`[wordpress] settings fetch skipped (${reason})`);
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
	mode: WpRestMode,
	ctx: MigrationConnectorContext
): AsyncGenerator<StagedObjectInput> {
	ctx.reportProgress({ step: 'theme', current: 0, total: 1 });
	const r = await fetchJson(
		buildWpUrl(baseUrl, mode, '/wp/v2/themes', { status: 'active' }),
		headers
	);
	if (!r.ok) {
		const reason =
			r.status === 401 || r.status === 403
				? `HTTP ${r.status} — WP user lacks manage_themes / switch_themes`
				: `HTTP ${r.status}`;
		ctx.reportSkip('theme', reason);
		console.warn(`[wordpress] theme fetch skipped (${reason})`);
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
		buildWpUrl(baseUrl, mode, `/wp/v2/global-styles/themes/${encodeURIComponent(slug)}`),
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
	mode: WpRestMode,
	ctx: MigrationConnectorContext,
	registry: ImageRefRegistry,
	fetchAllMedia: boolean
): AsyncGenerator<StagedObjectInput> {
	let pageNum = 1;
	let totalPages: number | null = null;
	let totalItems = 0;
	let current = 0;
	let useEditContext = true;

	while (true) {
		const url = buildWpUrl(baseUrl, mode, '/wp/v2/media', {
			per_page: 100,
			page: pageNum,
			...(useEditContext ? { context: 'edit' } : {})
		});
		const r = await fetchJson(url, headers);
		if (!r.ok) {
			// Same fallback as pages/posts: drop context=edit if WP refuses it
			// for capability reasons. The default `view` context still gives
			// us source_url, mime_type, alt, title, caption, dimensions.
			if (
				(r.status === 401 || r.status === 403) &&
				useEditContext &&
				typeof r.body === 'string' &&
				r.body.includes('rest_forbidden_context')
			) {
				console.warn('[wordpress] media: context=edit forbidden; falling back to view context.');
				useEditContext = false;
				continue;
			}
			if (r.status === 400 && pageNum > 1) break;
			ctx.reportSkip('media', `HTTP ${r.status}`);
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

/**
 * Fetch the global WooCommerce currency code (e.g. "EUR", "USD") so the
 * product promoter can stamp the right currency on imported products
 * instead of falling back to the be-BOP shop's main currency.
 */
async function fetchWcCurrency(
	baseUrl: string,
	headers: Record<string, string>,
	mode: WpRestMode
): Promise<string | undefined> {
	const r = await fetchJson(buildWpUrl(baseUrl, mode, '/wc/v3/system_status'), headers);
	if (r.ok && r.body && typeof r.body === 'object') {
		const settings = (r.body as Record<string, unknown>).settings as
			| Record<string, unknown>
			| undefined;
		if (settings && typeof settings.currency === 'string') return settings.currency;
	}
	const r2 = await fetchJson(
		buildWpUrl(baseUrl, mode, '/wc/v3/settings/general'),
		headers
	);
	if (r2.ok && Array.isArray(r2.body)) {
		const found = (r2.body as Array<{ id?: string; value?: unknown }>).find(
			(s) => s.id === 'woocommerce_currency'
		);
		if (found && typeof found.value === 'string') return found.value;
	}
	return undefined;
}

async function* fetchWooProducts(
	baseUrl: string,
	wpHeaders: Record<string, string>,
	wcHeaders: Record<string, string> | null,
	mode: WpRestMode,
	ctx: MigrationConnectorContext,
	registry: ImageRefRegistry
): AsyncGenerator<StagedObjectInput> {
	// Prefer the WC consumer key/secret on /wc/v3/* endpoints when available.
	// Falls back to WP App Password if not provided.
	const headers = wcHeaders ?? wpHeaders;
	const wcCurrency = await fetchWcCurrency(baseUrl, headers, mode);
	let pageNum = 1;
	let totalPages: number | null = null;
	let totalItems = 0;
	let current = 0;

	while (true) {
		const url = buildWpUrl(baseUrl, mode, '/wc/v3/products', {
			per_page: 100,
			page: pageNum
		});
		const r = await fetchJson(url, headers);
		if (!r.ok) {
			// 404 on first page = WC not installed (no skip notice).
			// 401 on first page = WC installed but user lacks
			// `manage_woocommerce` — surface that.
			if (pageNum === 1 && r.status === 404) return;
			if (pageNum === 1 && r.status === 401) {
				ctx.reportSkip(
					'products',
					'HTTP 401 — WP user lacks manage_woocommerce (or WC not installed)'
				);
				return;
			}
			if (r.status === 400 && pageNum > 1) break;
			ctx.reportSkip('products', `HTTP ${r.status}`);
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
					...(wcCurrency ? { currency: wcCurrency } : {}),
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
	secretFields: ['appPassword', 'wcConsumerSecret'],

	async testConnection(config) {
		try {
			const baseUrl = trimTrailingSlash(config.wpUrl);
			const headers = { Authorization: authHeader(config) };
			const probe = await detectWpRestMode(baseUrl, headers);
			if (!probe.ok) {
				return {
					ok: false,
					message:
						probe.tried === 'both'
							? `HTTP ${probe.status} on both /wp-json/ and /?rest_route=/`
							: `HTTP ${probe.status} on /wp-json/ (and /?rest_route=/ unreachable)`
				};
			}
			const suffix =
				probe.mode === 'plain'
					? ' (using plain-permalinks fallback)'
					: '';
			return {
				ok: true,
				message: `Connected to "${probe.root.name ?? config.wpUrl}"${suffix}`
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
		const wcAuth = wcAuthHeader(config);
		const wcHeaders = wcAuth ? { Authorization: wcAuth } : null;
		const registry = createImageRefRegistry();

		const probe = await detectWpRestMode(baseUrl, headers);
		if (!probe.ok) {
			throw new Error(
				`Cannot reach WP REST API: HTTP ${probe.status} on /wp-json/ and /?rest_route=/. ` +
					'Check permalinks (Settings → Permalinks, must not be "Plain") or REST API blocking plugins.'
			);
		}
		const mode = probe.mode;

		// Identify pages that back WC/WP functional flows (shop, cart,
		// checkout, my-account, T&Cs, blog index, privacy policy) so we can
		// skip them — they're not editorial content and importing them as
		// CMS pages would clash with be-BOP's own routing.
		const excludedPageIds = await fetchExcludedPageIds(baseUrl, headers, mode);

		// Order matters: anything that references images must run BEFORE the
		// media stage, so origins can be resolved when each media item is
		// emitted.
		yield* fetchPostType(baseUrl, headers, mode, ctx, 'pages', registry, excludedPageIds);
		yield* fetchPostType(baseUrl, headers, mode, ctx, 'posts', registry);
		yield* fetchSettings(baseUrl, headers, mode, ctx, registry);
		yield* fetchActiveTheme(baseUrl, headers, mode, ctx);
		yield* fetchWooProducts(baseUrl, headers, wcHeaders, mode, ctx, registry);
		yield* fetchMedia(baseUrl, headers, mode, ctx, registry, config.fetchAllMedia);
	}
};
