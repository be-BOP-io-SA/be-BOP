import { collections } from '$lib/server/database';
import { paymentMethods } from '$lib/server/payment-methods';
import { COUNTRY_ALPHA2S, type CountryAlpha2 } from '$lib/types/Country';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { createOrder } from '$lib/server/orders';
import { emailsEnabled } from '$lib/server/email';
import { runtimeConfig } from '$lib/server/runtime-config';
import { checkCartItems, getCartFromDb } from '$lib/server/cart.js';
import { userIdentifier, userQuery } from '$lib/server/user.js';
import { CUSTOMER_ROLE_ID, POS_ROLE_ID } from '$lib/types/User.js';
import { zodNpub } from '$lib/server/nostr.js';
import type { JsonObject } from 'type-fest';
import { omit, set } from 'lodash-es';
import { rateLimit } from '$lib/server/rateLimit.js';
import { cmsFromContent } from '$lib/server/cms';

export async function load({ parent, locals }) {
	const parentData = await parent();

	if (parentData.cart) {
		try {
			await checkCartItems(parentData.cart, { user: userIdentifier(locals) });
		} catch (err) {
			throw redirect(303, '/cart');
		}
	}
	const personalInfoConnected = await collections.personalInfo.findOne(
		userQuery(userIdentifier(locals)),
		{
			sort: { _id: -1 }
		}
	);
	const [cmsCheckoutTop, cmsCheckoutBottom] = await Promise.all([
		collections.cmsPages.findOne(
			{
				_id: 'checkout-top'
			},
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
					employeeContent: {
						$ifNull: [`$translations.${locals.language}.employeeContent`, '$employeeContent']
					},
					hasEmployeeContent: 1,
					title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
					shortDescription: {
						$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
					},
					fullScreen: 1,
					maintenanceDisplay: 1
				}
			}
		),
		collections.cmsPages.findOne(
			{
				_id: 'checkout-bottom'
			},
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
					employeeContent: {
						$ifNull: [`$translations.${locals.language}.employeeContent`, '$employeeContent']
					},
					hasEmployeeContent: 1,
					title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
					shortDescription: {
						$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
					},
					fullScreen: 1,
					maintenanceDisplay: 1
				}
			}
		)
	]);

	let methods = paymentMethods({ role: locals.user?.roleId });

	for (const item of parentData.cart ?? []) {
		if (item.product.paymentMethods) {
			methods = methods.filter((method) => item.product.paymentMethods?.includes(method));
		}
	}
	return {
		paymentMethods: methods,
		emailsEnabled,
		collectIPOnDeliverylessOrders: runtimeConfig.collectIPOnDeliverylessOrders,
		personalInfoConnected: {
			firstName: personalInfoConnected?.firstName,
			lastName: personalInfoConnected?.lastName,
			address: personalInfoConnected?.address,
			_id: personalInfoConnected?._id.toString(),
			newsletter: personalInfoConnected?.newsletter,
			npub: personalInfoConnected?.npub,
			email: personalInfoConnected?.email
		},
		shopInformation: runtimeConfig.shopInformation,
		isBillingAddressMandatory: runtimeConfig.isBillingAddressMandatory,
		displayNewsletterCommercialProspection: runtimeConfig.displayNewsletterCommercialProspection,
		noProBilling: runtimeConfig.noProBilling,
		...(cmsCheckoutTop && {
			cmsCheckoutTop,
			cmsCheckoutTopData: cmsFromContent(
				{
					content:
						locals.user?.roleId !== undefined &&
						locals.user?.roleId !== CUSTOMER_ROLE_ID &&
						cmsCheckoutTop.hasEmployeeContent &&
						cmsCheckoutTop.employeeContent
							? cmsCheckoutTop.employeeContent
							: cmsCheckoutTop.content
				},
				locals
			)
		}),
		...(cmsCheckoutBottom && {
			cmsCheckoutBottom,
			cmsCheckoutBottomData: cmsFromContent(
				{
					content:
						locals.user?.roleId !== undefined &&
						locals.user?.roleId !== CUSTOMER_ROLE_ID &&
						cmsCheckoutBottom.hasEmployeeContent &&
						cmsCheckoutBottom.employeeContent
							? cmsCheckoutBottom.employeeContent
							: cmsCheckoutBottom.content
				},
				locals
			)
		}),
		defaultOnLocation: runtimeConfig.defaultOnLocation,
		desiredPaymentTimeout: runtimeConfig.desiredPaymentTimeout
	};
}

export const actions = {
	default: async ({ request, locals, url }) => {
		const cart = await getCartFromDb({ user: userIdentifier(locals) });

		if (!cart?.items.length) {
			throw error(400, 'Cart is empty');
		}

		const products = await collections.products
			.find({
				_id: { $in: cart.items.map((item) => item.productId) }
			})
			.map((product) =>
				// Set the translation to the one of the user if it exists
				Object.assign(omit(product, 'translations'), product.translations?.[locals.language] ?? {})
			)
			.toArray();

		let methods = paymentMethods({ role: locals.user?.roleId });

		for (const product of products) {
			if (product.paymentMethods) {
				methods = methods.filter((method) => product.paymentMethods?.includes(method));
			}
		}

		if (!methods.length) {
			throw error(400, 'No payment methods available');
		}

		const byId = Object.fromEntries(products.map((product) => [product._id, product]));

		cart.items = cart.items.filter((item) => !!byId[item.productId]);

		if (!cart?.items.length) {
			throw error(400, 'Cart is empty');
		}

		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			if (value) {
				set(json, key, value);
			}
		}

		const isDigital = products.every((product) => !product.shipping);

		const shippingInfo = isDigital
			? null
			: z
					.object({
						shipping: z.object(
							locals.user?.roleId === POS_ROLE_ID
								? {
										firstName: z.string().default(''),
										lastName: z.string().default(''),
										address: z.string().default(''),
										city: z.string().default(''),
										state: z.string().optional(),
										zip: z.string().default(''),
										country: z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]]),
										phone: z.string().optional()
								  }
								: {
										firstName: z.string().min(1),
										lastName: z.string().min(1),
										address: z.string().min(1),
										city: z.string().min(1),
										state: z.string().optional(),
										zip: z.string().min(1),
										country: z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]]),
										phone: z.string().optional()
								  }
						)
					})
					.parse(json);
		const billingIsCompany = z
			.object({ isCompany: z.boolean({ coerce: true }).default(false) })
			.parse({
				isCompany: formData.get('billing.isCompany')
			});
		const billingInfo = json.billing
			? z
					.object({
						billing: z.object({
							firstName: billingIsCompany.isCompany ? z.string().default('') : z.string().min(1),
							lastName: billingIsCompany.isCompany ? z.string().default('') : z.string().min(1),
							address: z.string().min(1),
							city: z.string().min(1),
							state: z.string().optional(),
							zip: z.string().min(1),
							country: z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]]),
							isCompany: z.boolean({ coerce: true }).default(false),
							vatNumber: z.string().optional(),
							companyName: z.string().optional(),
							phone: z.string().optional()
						})
					})
					.parse(json)
			: null;

		if (runtimeConfig.noProBilling) {
			if (billingInfo) {
				billingInfo.billing.isCompany = false;
			}
		}

		const notifications = z
			.object({
				paymentStatusNPUB: zodNpub().optional(),
				paymentStatusEmail: z.string().email().optional()
			})
			.parse({
				paymentStatusNPUB: formData.get('paymentStatusNPUB') || undefined,
				paymentStatusEmail: formData.get('paymentStatusEmail') || undefined
			});

		const npubAddress = notifications?.paymentStatusNPUB;
		const email = notifications?.paymentStatusEmail;

		// Remove empty string
		if (shippingInfo && !shippingInfo.shipping.state) {
			delete shippingInfo.shipping.state;
		}
		const newsletterProspection = runtimeConfig.displayNewsletterCommercialProspection
			? z
					.object({
						newsletter: z
							.object({
								seller: z.boolean({ coerce: true }).default(false),
								partner: z.boolean({ coerce: true }).default(false)
							})
							.optional()
					})
					.parse(json)
			: null;
		const note = json.noteContent
			? z
					.object({
						noteContent: z.string().min(1)
					})
					.parse(json)
			: null;
		const receiptNote = json.receiptNoteContent
			? z
					.object({
						receiptNoteContent: z.string().min(1)
					})
					.parse(json)
			: null;

		const multiplePaymentMethods =
			locals.user?.roleId === POS_ROLE_ID
				? z
						.object({ multiplePaymentMethods: z.coerce.boolean().optional() })
						.parse(Object.fromEntries(formData)).multiplePaymentMethods
				: false;

		const paymentMethod = multiplePaymentMethods
			? null
			: z
					.object({
						paymentMethod: z.enum([methods[0], ...methods.slice(1)])
					})
					.parse(Object.fromEntries(formData)).paymentMethod;

		const { discountAmount, discountType, discountJustification } = z
			.object({
				discountAmount: z.coerce.number().optional(),
				discountType: z.enum(['fiat', 'percentage']).optional(),
				discountJustification: z.string().optional()
			})
			.parse(Object.fromEntries(formData));

		if (discountAmount && (!discountType || !discountJustification)) {
			throw error(400, 'Discount type and justification are required');
		}

		let isFreeVat: boolean | undefined;
		let reasonFreeVat: string | undefined;

		let offerDeliveryFees: boolean | undefined;
		let reasonOfferDeliveryFees: string | undefined;

		if (locals.user?.roleId === POS_ROLE_ID) {
			const vatDetails = z
				.object({
					isFreeVat: z.coerce.boolean().optional(),
					reasonFreeVat: z.string().optional()
				})
				.parse(Object.fromEntries(formData));

			isFreeVat = vatDetails.isFreeVat;
			reasonFreeVat = vatDetails.reasonFreeVat;

			if (runtimeConfig.deliveryFees.allowFreeForPOS) {
				const feesDetails = z
					.object({
						offerDeliveryFees: z.coerce.boolean().optional(),
						reasonOfferDeliveryFees: z.string().optional()
					})
					.parse(Object.fromEntries(formData));
				offerDeliveryFees = feesDetails.offerDeliveryFees;
				reasonOfferDeliveryFees = feesDetails.reasonOfferDeliveryFees;
			}
		}

		if (isFreeVat && !reasonFreeVat) {
			throw error(400, 'Reason for free VAT is required');
		}
		if (offerDeliveryFees && !reasonOfferDeliveryFees) {
			throw error(400, 'You must acknowledge that you offer delivery fees and add a justification');
		}

		if (
			runtimeConfig.displayNewsletterCommercialProspection &&
			newsletterProspection &&
			(newsletterProspection.newsletter?.partner || newsletterProspection.newsletter?.seller)
		) {
			await collections.personalInfo.updateOne(
				userQuery(userIdentifier(locals)),
				{
					$set: {
						newsletter: newsletterProspection.newsletter,
						...(npubAddress && { npub: npubAddress }),
						...(email && { email: email }),
						updatedAt: new Date(),
						user: userIdentifier(locals)
					},
					$setOnInsert: { createdAt: new Date() }
				},
				{
					upsert: true
				}
			);
		}
		const physicalFullyPaid =
			locals.user?.roleId === POS_ROLE_ID && runtimeConfig.defaultOnLocation
				? z
						.object({
							onLocation: z.boolean({ coerce: true }).default(false)
						})
						.parse({
							onLocation: formData.get('onLocation')
						})
				: null;
		const agreements = z
			.object({
				teecees: z.boolean({ coerce: true }).default(false),
				allowCollectIP: z.boolean({ coerce: true }).default(false),
				isOnlyDeposit: z.boolean({ coerce: true }).default(false),
				isVATNullForeigner: z.boolean({ coerce: true }).default(false)
			})
			.parse({
				teecees: formData.get('teecees'),
				allowCollectIP: formData.get('allowCollectIP'),
				isOnlyDeposit: formData.get('isOnlyDeposit'),
				isVATNullForeigner: formData.get('isVATNullForeigner')
			});

		if (!agreements.allowCollectIP && runtimeConfig.collectIPOnDeliverylessOrders && isDigital) {
			throw error(400, 'You must allow the collection of your IP address');
		}
		if (billingInfo?.billing.isCompany) {
			if (!billingInfo?.billing.companyName) {
				throw error(400, 'The company name is required for professional order ');
			}
		} else {
			if (billingInfo?.billing) {
				delete billingInfo.billing.companyName;
				delete billingInfo.billing.vatNumber;
			}
		}
		const desiredPayment = z
			.object({
				paymentTimeOut: z.number({ coerce: true }).int().optional()
			})
			.parse({
				paymentTimeOut: formData.get('paymentTimeOut')
			});
		const vatCountry =
			shippingInfo?.shipping?.country ??
			locals.countryCode ??
			(runtimeConfig.vatCountry || undefined);

		// Trust the frontend on this.
		// Otherwise would have to move the check to createOrder or compute priceInfo here
		//
		// if (!agreements.isVATNullForeigner && pricenfo.physicalVatAtCustoms) {
		// 	throw error(400, 'You must acknowledge that you will have to pay VAT upon delivery');
		// }

		if (
			!agreements.isOnlyDeposit &&
			cart.items.some(
				(item) =>
					item.depositPercentage !== undefined &&
					item.depositPercentage !== null &&
					(item.depositPercentage ?? 0) < 100 &&
					(item.customPrice || byId[item.productId].price).amount > 0
			)
		) {
			throw error(
				400,
				'You must acknowledge that you are only paying a deposit and will have to pay the rest later'
			);
		}
		rateLimit(locals.clientIp, 'email', 10, { minutes: 1 });

		const orderId = await createOrder(
			cart.items.map((item) => ({
				quantity: item.quantity,
				product: byId[item.productId],
				...(item.customPrice && {
					customPrice: { amount: item.customPrice.amount, currency: item.customPrice.currency }
				}),
				...(item.chosenVariations && { chosenVariations: item.chosenVariations }),
				depositPercentage: item.depositPercentage
			})),
			paymentMethod,
			{
				locale: locals.language,
				user: {
					sessionId: locals.sessionId,
					userId: locals.user?._id,
					userLogin: locals.user?.login,
					userRoleId: locals.user?.roleId
				},
				notifications: {
					paymentStatus: {
						npub: npubAddress,
						email
					}
				},
				cart,
				shippingAddress: shippingInfo?.shipping,
				billingAddress: billingInfo?.billing || shippingInfo?.shipping,
				userVatCountry: vatCountry,
				...(locals.user?.roleId === POS_ROLE_ID && isFreeVat && { reasonFreeVat }),
				...(locals.user?.roleId === POS_ROLE_ID &&
					discountAmount &&
					discountType &&
					discountJustification && {
						discount: {
							amount: discountAmount,
							type: discountType,
							justification: discountJustification
						}
					}),
				...(note && { note: note.noteContent }),
				...(agreements.allowCollectIP && { clientIp: locals.clientIp }),
				...(locals.user?.roleId === POS_ROLE_ID &&
					runtimeConfig.deliveryFees.allowFreeForPOS &&
					offerDeliveryFees && { reasonOfferDeliveryFees }),
				...(receiptNote && { receiptNote: receiptNote.receiptNoteContent }),
				engagements: {
					...(agreements.allowCollectIP && { acceptedIPCollect: agreements.allowCollectIP }),
					...(agreements.teecees && { acceptedTermsOfUse: agreements.teecees }),
					...(agreements.isOnlyDeposit && {
						acceptedDepositConditionsAndFullPayment: agreements.isOnlyDeposit
					}),
					...(agreements.isVATNullForeigner && {
						acceptedExportationAndVATObligation: agreements.isVATNullForeigner
					})
				},
				...(physicalFullyPaid?.onLocation && { onLocation: physicalFullyPaid.onLocation }),
				...(desiredPayment.paymentTimeOut && { paymentTimeOut: desiredPayment.paymentTimeOut })
			}
		);
		const displayHeadless =
			url.searchParams.get('display') === 'headless' ? '?display=headless' : '';
		throw redirect(303, `/order/${orderId}${displayHeadless}`);
	}
};
