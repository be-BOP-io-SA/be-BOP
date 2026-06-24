import { collections } from '$lib/server/database';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Due to the sensitive nature of a global order dump, reserve this to super-admin.
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can download all orders.');
	}

	const { ids } = z.object({ ids: z.string().array() }).parse(await request.json());

	const orders = await collections.orders
		.find({ _id: { $in: ids } })
		.sort({ createdAt: -1 })
		.toArray();

	return new Response(JSON.stringify(orders), {
		headers: { 'Content-Type': 'application/json' }
	});
};
