import {
	MONGODB_URL,
	MONGODB_DB,
	MONGODB_IP_FAMILY,
	MONGODB_DIRECT_CONNECTION
} from '$env/static/private';
import {
	MongoClient,
	ObjectId,
	type WithSessionCallback,
	type IndexSpecification,
	type CreateIndexesOptions,
	Collection,
	MongoServerError,
	Db
} from 'mongodb';
import type { Picture } from '../types/Picture';
import type { Product } from '$lib/types/Product';
import type { RuntimeConfigItem } from './runtime-config';
import type { Lock } from '$lib/types/Lock';
import type { Cart } from '$lib/types/Cart';
import type { DigitalFile } from '$lib/types/DigitalFile';
import type { Order } from '$lib/types/Order';
import type { NostRNotification } from '$lib/types/NostRNotifications';
import type { NostRReceivedMessage } from '$lib/types/NostRReceivedMessage';
import type { BootikSubscription } from '$lib/types/BootikSubscription';
import type { PaidSubscription } from '$lib/types/PaidSubscription';
import type { CMSPage } from '$lib/types/CmsPage';
import type { Challenge } from '$lib/types/Challenge';
import type { EmailNotification } from '$lib/types/EmailNotification';
import type { Role } from '$lib/types/Role';
import type { User } from '$lib/types/User';
import type { Discount } from '$lib/types/Discount';
import type { Session } from '$lib/types/Session';
import type { Migration } from '$lib/types/Migration';
import type { Tag } from '$lib/types/Tag';
import type { Slider } from '$lib/types/slider';
import { building } from '$app/environment';
import type { Theme } from '$lib/types/Theme';
import { env } from '$env/dynamic/private';
import type { PersonalInfo } from '$lib/types/PersonalInfo';
import type { Specification } from '$lib/types/Specification';
import type { ContactForm } from '$lib/types/ContactForm';
import type { Countdown } from '$lib/types/Countdown';
import type { Gallery } from '$lib/types/Gallery';
import type { VatProfile } from '$lib/types/VatProfile';
import type { Ticket } from '$lib/types/Ticket';
import type { OrderLabel } from '$lib/types/OrderLabel';
import type { Leaderboard } from '$lib/types/Leaderboard';

// Bigger than the default 10, helpful with MongoDB errors
Error.stackTraceLimit = 100;

const client = building
	? (null as unknown as MongoClient)
	: new MongoClient(
			env.VITEST ? env.MONGODB_TEST_URL || 'mongodb://127.0.0.1:27017' : MONGODB_URL,
			{
				directConnection: !!env.VITEST || MONGODB_DIRECT_CONNECTION === 'true',
				...(MONGODB_IP_FAMILY === '4'
					? { family: 4 }
					: MONGODB_IP_FAMILY === '6'
					? { family: 6 }
					: {})
			}
	  );

export const connectPromise = building ? Promise.resolve() : client.connect().catch(console.error);

const db = building ? (null as unknown as Db) : client.db(env.VITEST ? 'bootik-test' : MONGODB_DB);

const genCollection = () => ({
	pictures: db.collection<Picture>('pictures'),
	pendingPictures: db.collection<Picture>('pictures.pending'),
	products: db.collection<Product>('products'),
	bootikSubscriptions: db.collection<BootikSubscription>('subscriptions'),
	paidSubscriptions: db.collection<PaidSubscription>('subscriptions.paid'),
	carts: db.collection<Cart>('carts'),
	runtimeConfig: db.collection<RuntimeConfigItem>('runtimeConfig'),
	locks: db.collection<Lock>('locks'),
	digitalFiles: db.collection<DigitalFile>('digitalFiles'),
	pendingDigitalFiles: db.collection<DigitalFile>('digitalFiles.pending'),
	orders: db.collection<Order>('orders'),
	nostrNotifications: db.collection<NostRNotification>('notifications.nostr'),
	emailNotifications: db.collection<EmailNotification>('notifications.email'),
	nostrReceivedMessages: db.collection<NostRReceivedMessage>('nostr.receivedMessage'),
	cmsPages: db.collection<CMSPage>('cmsPages'),
	challenges: db.collection<Challenge>('challenges'),
	leaderboards: db.collection<Leaderboard>('leaderboards'),
	roles: db.collection<Role>('roles'),
	users: db.collection<User>('users'),
	discounts: db.collection<Discount>('discounts'),
	sessions: db.collection<Session>('sessions'),
	migrations: db.collection<Migration>('migrations'),
	tags: db.collection<Tag>('tags'),
	sliders: db.collection<Slider>('sliders'),
	themes: db.collection<Theme>('themes'),
	personalInfo: db.collection<PersonalInfo>('personalInfo'),
	specifications: db.collection<Specification>('specifications'),
	contactForms: db.collection<ContactForm>('contactForms'),
	countdowns: db.collection<Countdown>('countdowns'),
	galleries: db.collection<Gallery>('galleries'),
	vatProfiles: db.collection<VatProfile>('vatProfiles'),
	tickets: db.collection<Ticket>('tickets'),
	labels: db.collection<OrderLabel>('labels'),

	errors: db.collection<unknown & { _id: ObjectId; url: string; method: string }>('errors')
});

export { client, db };
export const collections = building
	? ({} as unknown as ReturnType<typeof genCollection>)
	: genCollection();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const indexes: Array<[Collection<any>, IndexSpecification, CreateIndexesOptions?]> = [
	[collections.pictures, { productId: 1, createdAt: 1 }],
	[collections.pictures, { galleryId: 1, createdAt: 1 }],
	[collections.pictures, { 'slider._id': 1, createdAt: 1 }],
	[collections.pictures, { 'tag._id': 1, createdAt: 1 }],
	[collections.products, { stock: 1 }, { sparse: true }],
	[collections.products, { 'actionSettings.eShop.visible': 1 }],
	[collections.products, { 'actionSettings.retail.visible': 1 }],
	[collections.products, { alias: 1 }, { sparse: true, unique: true }],
	[collections.locks, { updatedAt: 1 }, { expireAfterSeconds: 60 }],
	[collections.carts, { 'user.userId': 1 }],
	[collections.carts, { 'user.sessionId': 1 }],
	[collections.carts, { 'user.npub': 1 }],
	[collections.carts, { 'user.email': 1 }],
	[collections.carts, { 'user.ssoIds': 1 }],
	[collections.carts, { 'items.productId': 1 }],
	[collections.challenges, { beginsAt: 1, endsAt: 1 }],
	[collections.orders, { createdAt: 1 }],
	[collections.orders, { 'user.userId': 1 }],
	[collections.orders, { 'user.sessionId': 1 }],
	[collections.orders, { 'user.npub': 1 }],
	[collections.orders, { 'user.email': 1 }],
	[collections.orders, { 'user.ssoIds': 1 }],
	/**
	 * To check amount reserved for a product (with pending orders)
	 */
	[collections.orders, { 'items.product._id': 1, status: 1 }],
	[collections.orders, { number: 1 }, { unique: true }],
	[collections.orders, { 'payments.invoice.number': 1 }, { unique: true, sparse: true }],
	[collections.orders, { 'payments.status': 1 }],
	[collections.orders, { status: 1, 'payments.status': 1 }],
	[collections.orders, { orderLabelIds: 1 }, { sparse: true }],
	[collections.digitalFiles, { productId: 1 }],
	[collections.digitalFiles, { secret: 1 }, { unique: true, sparse: true }],
	[collections.pendingDigitalFiles, { createdAt: 1 }],
	[collections.pendingPictures, { createdAt: 1 }],
	[collections.nostrReceivedMessages, { processedAt: 1 }],
	[collections.nostrReceivedMessages, { createdAt: -1 }],
	[collections.nostrNotifications, { dest: 1 }],
	[collections.nostrNotifications, { processedAt: 1 }],
	[collections.emailNotifications, { dest: 1 }],
	[collections.emailNotifications, { processedAt: 1 }],
	[collections.bootikSubscriptions, { npub: 1 }, { sparse: true }],
	[collections.paidSubscriptions, { 'user.userId': 1, productId: 1 }],
	[collections.paidSubscriptions, { 'user.sessionId': 1, productId: 1 }],
	[collections.paidSubscriptions, { 'user.npub': 1, productId: 1 }],
	[collections.paidSubscriptions, { 'user.email': 1, productId: 1 }],
	[collections.paidSubscriptions, { 'user.ssoIds': 1, productId: 1 }],
	[collections.paidSubscriptions, { productId: 1 }],
	[collections.paidSubscriptions, { number: 1 }, { unique: true }],
	// See subscription-lock.ts, for searching for subscriptions to remind
	// todo: find which index is better
	[collections.paidSubscriptions, { cancelledAt: 1, paidUntil: 1, 'notifications.type': 1 }],
	[collections.paidSubscriptions, { cancelledAt: 1, 'notifications.type': 1, paidUntil: 1 }],
	[collections.users, { login: 1 }, { unique: true }],
	[collections.users, { roleId: 1 }], // When deleting a role, check if there are users with that role
	[
		collections.users,
		{ login: 1 },
		{ unique: true, collation: { locale: 'en', strength: 1 }, name: 'case-insensitive-login' }
	],
	[collections.users, { 'recovery.email': 1 }, { sparse: true, unique: true }],
	[collections.users, { 'recovery.npub': 1 }, { sparse: true, unique: true }],
	[collections.sessions, { expiresAt: 1 }, { expireAfterSeconds: 0 }],
	[collections.sessions, { sessionId: 1 }, { unique: true }],
	[collections.discounts, { endAt: 1 }],
	[collections.discounts, { productIds: 1, endsAt: -1 }],
	[
		collections.discounts,
		{ wholeCatalog: 1, endsAt: -1 },
		{ partialFilterExpression: { wholeCatalog: true } }
	],
	[collections.personalInfo, { 'user.userId': 1 }],
	[collections.personalInfo, { 'user.sessionId': 1 }],
	[collections.personalInfo, { 'user.npub': 1 }],
	[collections.personalInfo, { 'user.email': 1 }],
	[collections.personalInfo, { 'user.ssoIds': 1 }],
	[collections.tickets, { orderId: 1 }],
	[collections.tickets, { productId: 1 }],
	[collections.tickets, { ticketId: 1 }, { unique: true }],
	[collections.leaderboards, { beginsAt: 1, endsAt: 1 }]
];

export async function createIndexes() {
	await Promise.all(
		indexes.map(async ([collection, index, options]) => {
			try {
				await collection.createIndex(index, options);
			} catch (err) {
				if (err instanceof MongoServerError && err.code === 86) {
					const indexes = await collection.indexes();

					for (const existingIndex of indexes) {
						if (JSON.stringify(existingIndex.key) === JSON.stringify(index)) {
							if (
								options?.expireAfterSeconds !== existingIndex.expireAfterSeconds ||
								options?.unique !== existingIndex.unique ||
								options?.sparse !== existingIndex.sparse ||
								JSON.stringify(options?.partialFilterExpression) !==
									JSON.stringify(existingIndex.partialFilterExpression)
							) {
								await collection.dropIndex(existingIndex.name);
								await collection.createIndex(index, options);

								console.log(
									`Recreated index ${existingIndex.name} on ${collection.collectionName}`
								);

								break;
							}
						}
					}
				}
			}
		})
	);
}

if (!building) {
	client.on('open', () => {
		createIndexes().catch(console.error);
	});
}

export async function withTransaction<T extends WithSessionCallback>(
	cb: T
): Promise<Awaited<ReturnType<T>>> {
	let ret: Awaited<ReturnType<T>>;
	let done = false;

	await client.withSession((session) =>
		session.withTransaction(async () => {
			ret = await cb(session);
			done = true;
		})
	);

	if (!done) {
		throw new Error('Transaction not executed');
	}

	// @ts-expect-error ret is set
	return ret;
}
