import { runtimeConfig } from '$lib/server/runtime-config';
import { adminPrefix } from '$lib/server/admin.js';
import { collections } from '$lib/server/database';
import { getPublicS3DownloadLink, getS3Client } from '$lib/server/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const digitalFile = await collections.digitalFiles.findOne({
		_id: params.id
	});

	if (!digitalFile) {
		throw error(404, 'Digital file not found');
	}

	const downloadLink = getPublicS3DownloadLink(digitalFile.storage.key);

	return {
		digitalFile,
		downloadLink
	};
};

export const actions: Actions = {
	delete: async function ({ params }) {
		const digitalFile = await collections.digitalFiles.findOne({ _id: params.id });

		if (!digitalFile) {
			throw error(404, 'Digital file not found');
		}

		await collections.digitalFiles.deleteOne({ _id: params.id });

		await getS3Client()
			.send(
				new DeleteObjectCommand({ Bucket: runtimeConfig.s3.bucket, Key: digitalFile.storage.key })
			)
			.catch(console.error);
		if (digitalFile.productId) {
			throw redirect(303, `${adminPrefix()}/product/${digitalFile.productId}`);
		} else {
			throw redirect(303, `${adminPrefix()}/digital-file`);
		}
	},
	update: async function ({ request, params }) {
		const formData = await request.formData();
		const name = String(formData.get('name'));

		await collections.digitalFiles.updateOne(
			{ _id: params.id },
			{
				$set: {
					name,
					updatedAt: new Date()
				}
			}
		);
	}
};
