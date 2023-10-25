import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { POS_ROLE_ID } from '$lib/types/User';

export const load = async ({ params }) => {
	const userId = new ObjectId(params.id);

	const user = await collections.users.findOne({ _id: userId });

	if (!user) {
		throw error(404, 'User not found');
	}

	return {
		user: user.login
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const data = await request.formData();

		const { login, password } = z
			.object({
				login: z.string(),
				password: z.string()
			})
			.parse({
				login: data.get('login'),
				password: data.get('password')
			});

		const updatedValueSeat: { login: string; password?: string } = {
			login
		};

		if (password) {
			const salt = await bcryptjs.genSalt(10);
			const passwordBcrypt = await bcryptjs.hash(password, salt);
			updatedValueSeat.password = passwordBcrypt;
		}

		await collections.users.updateOne(
			{ _id: new ObjectId(params.id), roleId: POS_ROLE_ID },
			{
				$set: updatedValueSeat
			}
		);

		return {};
	},

	delete: async ({ params }) => {
		try {
			await collections.users.deleteOne({ _id: new ObjectId(params.id) });
		} catch (error) {
			console.log(error);
		}

		throw redirect(303, '/admin/pos');
	}
};
