import { adminPrefix } from '$lib/server/admin.js';
import { collections } from '$lib/server/database';
import { getPublicS3DownloadLink, s3client } from '$lib/server/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { error, redirect } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';
const S3_BUCKET = env.S3_BUCKET;

export async function load({ params }) {
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
}

export const actions = {
	delete: async function ({ params }) {
		const digitalFile = await collections.digitalFiles.findOne({ _id: params.id });

		if (!digitalFile) {
			throw error(404, 'Digital file not found');
		}

		await collections.digitalFiles.deleteOne({ _id: params.id });

		await s3client
			.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: digitalFile.storage.key }))
			.catch(console.error);
		if (digitalFile.productId) {
			throw redirect(303, `${adminPrefix()}/product/${digitalFile.productId}`);
		} else {
			throw redirect(303, `${adminPrefix()}/digital-file`);
		}
	},
	update: async function (input) {
		const formData = await input.request.formData();
		const name = String(formData.get('name'));

		await collections.digitalFiles.updateOne(
			{ _id: input.params.id },
			{
				$set: {
					name,
					updatedAt: new Date()
				}
			}
		);
	}
};
