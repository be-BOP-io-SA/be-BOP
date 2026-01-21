import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { deletePicture } from '$lib/server/picture';
import { runtimeConfig } from '$lib/server/runtime-config';
import { adminPrefix } from '$lib/server/admin';

export const load = async ({ params }) => {
	const picture = await collections.pictures.findOne({ _id: params.id });

	if (!picture) {
		throw error(404, 'Picture not found');
	}

	return {
		picture
	};
};

export const actions: Actions = {
	update: async function (input) {
		const formData = await input.request.formData();
		const name = String(formData.get('name'));
		const logoIsWide = Boolean(formData.get('isWide'));

		// If this picture is currently set as logo (light or dark mode), update the isWide setting
		if (
			runtimeConfig.logo.pictureId === input.params.id ||
			runtimeConfig.logo.darkModePictureId === input.params.id
		) {
			await collections.runtimeConfig.updateOne(
				{ _id: 'logo' },
				{
					$set: {
						'data.isWide': logoIsWide,
						updatedAt: new Date()
					}
				}
			);
			runtimeConfig.logo.isWide = logoIsWide;
		}

		await collections.pictures.updateOne(
			{ _id: input.params.id },
			{
				$set: {
					name,
					updatedAt: new Date()
				}
			}
		);

		return {};
	},
	delete: async function ({ params }) {
		const picture = await collections.pictures.findOne({ _id: params.id });

		if (!picture) {
			throw error(404);
		}

		await deletePicture(picture._id);

		throw redirect(
			303,
			picture.productId
				? `${adminPrefix()}/product/${picture.productId}`
				: picture.tag?._id
				? `${adminPrefix()}/tags/${picture.tag._id}`
				: picture.slider?._id
				? `${adminPrefix()}/slider/${picture.slider._id}`
				: `${adminPrefix()}/picture`
		);
	},

	setAsLogo: async function ({ params, request }) {
		const picture = await collections.pictures.findOne({ _id: params.id });

		if (!picture) {
			throw error(404);
		}

		if (picture.productId) {
			throw error(400, 'Picture is already associated to a product');
		}
		if (picture.tag) {
			throw error(400, 'Picture is already associated to a tag');
		}
		if (picture.slider) {
			throw error(400, 'Picture is already associated to a slide');
		}
		const formData = await request.formData();
		const logoMode = String(formData.get('darkPicture'));
		const logoIsWide = Boolean(formData.get('isWide'));

		await collections.runtimeConfig.updateOne(
			{
				_id: 'logo'
			},
			{
				$set: {
					'data.isWide': logoIsWide,
					...(logoMode === 'light' && { 'data.pictureId': picture._id }),
					...(logoMode === 'dark' && { 'data.darkModePictureId': picture._id }),
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		logoMode === 'dark'
			? (runtimeConfig.logo.darkModePictureId = picture._id)
			: (runtimeConfig.logo.pictureId = picture._id);
	},

	removeLogo: async function ({ params, request }) {
		const formData = await request.formData();
		const logoMode = String(formData.get('darkPicture'));
		const logoIsWide = Boolean(formData.get('isWide'));
		if (runtimeConfig.logo.pictureId === params.id) {
			await collections.runtimeConfig.updateOne(
				{
					_id: 'logo'
				},
				{
					$set: {
						'data.isWide': logoIsWide,
						...(logoMode === 'light' && { 'data.pictureId': '' }),
						...(logoMode === 'dark' && { 'data.darkModePictureId': '' }),
						updatedAt: new Date()
					}
				},
				{
					upsert: true
				}
			);
			logoMode === 'dark'
				? (runtimeConfig.logo.darkModePictureId = '')
				: (runtimeConfig.logo.pictureId = '');
		}
	},

	setAsFooterLogo: async function ({ params }) {
		const picture = await collections.pictures.findOne({ _id: params.id });

		if (!picture) {
			throw error(404);
		}

		if (picture.productId) {
			throw error(400, 'Picture is already associated to a product');
		}
		if (picture.tag) {
			throw error(400, 'Picture is already associated to a tag');
		}
		if (picture.slider) {
			throw error(400, 'Picture is already associated to a slide');
		}

		await collections.runtimeConfig.updateOne(
			{
				_id: 'footerLogoId'
			},
			{
				$set: { data: picture._id, updatedAt: new Date() }
			},
			{
				upsert: true
			}
		);
		runtimeConfig.footerLogoId = picture._id;
	},

	removeFooterLogo: async function ({ params }) {
		if (runtimeConfig.footerLogoId === params.id) {
			await collections.runtimeConfig.updateOne(
				{
					_id: 'footerLogoId'
				},
				{ $set: { data: '', updatedAt: new Date() } },
				{
					upsert: true
				}
			);
			runtimeConfig.footerLogoId = '';
		}
	},
	setAsFavicon: async function ({ params }) {
		const picture = await collections.pictures.findOne({ _id: params.id });

		if (!picture) {
			throw error(404);
		}

		if (picture.productId) {
			throw error(400, 'Picture is already associated to a product');
		}
		if (picture.tag) {
			throw error(400, 'Picture is already associated to a tag');
		}
		if (picture.slider) {
			throw error(400, 'Picture is already associated to a slide');
		}

		await collections.runtimeConfig.updateOne(
			{
				_id: 'faviconPictureId'
			},
			{
				$set: {
					data: picture._id,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		runtimeConfig.faviconPictureId = picture._id;
	},

	removeFavicon: async function ({ params }) {
		if (runtimeConfig.faviconPictureId === params.id) {
			await collections.runtimeConfig.updateOne(
				{
					_id: 'faviconPictureId'
				},
				{
					$set: {
						data: '',
						updatedAt: new Date()
					}
				},
				{
					upsert: true
				}
			);
		}
		runtimeConfig.faviconPictureId = '';
	}
};
