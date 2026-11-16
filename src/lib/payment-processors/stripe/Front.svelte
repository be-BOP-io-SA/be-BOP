<script context="module" lang="ts">
	import { tr, type Front } from '../front';
	import type declaration from './declaration';

	declare global {
		interface Window {
			Stripe(publicKey: string): {
				elements: (options: {
					locale?: string;
					appearance: {
						theme: 'stripe' | 'night' | 'flat';
						variables?: {
							colorPrimary?: string;
							colorBackground?: string;
							colorText?: string;
							colorDanger?: string;
							fontFamily?: string;
							spacingUnit?: string;
							borderRadius?: string;
							fontSizeBase?: string;
							// See more here: https://docs.stripe.com/elements/appearance-api?platform=web#additional-variables
						};
					};
					clientSecret: string;
				}) => {
					create: (
						type: 'card' | 'cardNumber' | 'cardExpiry' | 'cardCvc' | 'payment',
						options: {
							// https://docs.stripe.com/js/elements_object/create_payment_element#payment_element_create-options-layout-defaultCollapsed
							layout:
								| {
										type: 'accordion' | 'tabs';
										defaultCollapsed?: boolean;

										// Only for accordion
										radios?: boolean;
										spacedAccordionItems?: boolean;
										visibleAccordionItemsCount?: number;
								  }
								| 'accordion'
								| 'tabs';
						}
					) => {
						mount: (element: string | HTMLElement) => void;
					};
				};
				createToken: (element: unknown) => Promise<{ token: string }>;
				confirmPayment: (options: {
					elements: unknown;
					confirmParams: {
						return_url: string;
					};
				}) => Promise<{ error: { type: string; message: string } }>;
			};
		}
	}

	export const front: Front<typeof declaration> = {
		logo: {
			viewBox: '0 0 32 32',
			body: '<path d="M8.25 10.435l-2.165 0.46-0.010 7.12c0 1.315 0.99 2.165 2.305 2.165 0.73 0 1.265-0.135 1.56-0.295v-1.69c-0.285 0.115-1.685 0.525-1.685-0.785v-3.16h1.685v-1.89h-1.685zM12.705 13.015l-0.135-0.655h-1.92v7.66h2.215v-5.155c0.525-0.69 1.41-0.555 1.695-0.465v-2.040c-0.3-0.105-1.335-0.3-1.855 0.655zM17.32 9.4l-2.23 0.475v1.81l2.23-0.475zM2.245 14.615c0-0.345 0.29-0.48 0.755-0.485 0.675 0 1.535 0.205 2.21 0.57v-2.090c-0.735-0.29-1.47-0.405-2.205-0.405-1.8 0-3 0.94-3 2.51 0 2.46 3.375 2.060 3.375 3.12 0 0.41-0.355 0.545-0.85 0.545-0.735 0-1.685-0.305-2.43-0.71v2c0.825 0.355 1.66 0.505 2.425 0.505 1.845 0 3.115-0.79 3.115-2.39 0-2.645-3.395-2.17-3.395-3.17zM32 16.28c0-2.275-1.1-4.070-3.21-4.070s-3.395 1.795-3.395 4.055c0 2.675 1.515 3.91 3.675 3.91 1.060 0 1.855-0.24 2.46-0.575v-1.67c-0.605 0.305-1.3 0.49-2.18 0.49-0.865 0-1.625-0.305-1.725-1.345h4.345c0.010-0.115 0.030-0.58 0.030-0.795zM27.605 15.44c0-1 0.615-1.42 1.17-1.42 0.545 0 1.125 0.42 1.125 1.42zM21.96 12.21c-0.87 0-1.43 0.41-1.74 0.695l-0.115-0.55h-1.955v10.24l2.22-0.47 0.005-2.51c0.32 0.235 0.795 0.56 1.57 0.56 1.59 0 3.040-1.16 3.040-3.98 0.005-2.58-1.465-3.985-3.025-3.985zM21.43 18.335c-0.52 0-0.83-0.19-1.045-0.42l-0.015-3.3c0.23-0.255 0.55-0.44 1.060-0.44 0.81 0 1.37 0.91 1.37 2.070 0.005 1.195-0.545 2.090-1.37 2.090zM15.095 20.020h2.23v-7.66h-2.23z"></path>'
		},
		settings: {
			fields: {
				secretKey: {
					label: tr('admin.stripe.secretKey', {
						en: 'Secret Key',
						fr: 'Clé secrète',
						de: 'Geheimer Schlüssel',
						'es-sv': 'Clave secreta',
						it: 'Chiave segreta',
						nl: 'Geheime sleutel',
						pt: 'Chave secreta'
					})
				},
				publicKey: {
					label: tr('admin.stripe.publicKey', {
						en: 'Public Key',
						fr: 'Clé publique',
						de: 'Öffentlicher Schlüssel',
						'es-sv': 'Clave pública',
						it: 'Chiave pubblica',
						nl: 'Openbare sleutel',
						pt: 'Chave pública'
					})
				},
				currency: {
					label: tr('admin.stripe.currency', {
						en: 'Currency',
						fr: 'Devise',
						de: 'Währung',
						'es-sv': 'Moneda',
						it: 'Valuta',
						nl: 'Valuta',
						pt: 'Moeda'
					})
				}
			}
		}
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { useI18n } from '$lib/i18n';
	import { withProviderScript } from '../front';
	import type { PayDataOf } from '../types';

	export let data: PayDataOf<typeof declaration>;
	export let orderPath: string;

	const { t } = useI18n();

	let paymentLoading = false;
	let stripeLoading = true;
	let handleSubmit = () => {};

	function mountStripeCard() {
		stripeLoading = true;

		if (data.clientSecret && data.publicKey) {
			const stripe = window.Stripe(data.publicKey);
			const elements = stripe.elements({
				appearance: {
					theme: 'stripe'
				},
				clientSecret: data.clientSecret
			});

			elements
				.create('payment', {
					layout: 'tabs'
				})
				.mount('#payment-element');
			// Delay to give time for UI to render
			setTimeout(() => {
				stripeLoading = false;
			}, 3000);

			handleSubmit = async () => {
				try {
					paymentLoading = true;

					const { error } = await stripe.confirmPayment({
						elements,
						confirmParams: {
							// Make sure to change this to your payment completion page
							return_url: window.location.origin + orderPath
						}
					});

					// This point will only be reached if there is an immediate error when
					// confirming the payment. Otherwise, your customer will be redirected to
					// your `return_url`. For some payment methods like iDEAL, your customer will
					// be redirected to an intermediate site first to authorize the payment, then
					// redirected to the `return_url`.
					if (error.type === 'card_error' || error.type === 'validation_error') {
						alert(error.message);
					} else {
						alert('An unexpected error occurred.');
					}
				} finally {
					paymentLoading = false;
				}
			};
		}
	}

	onMount(() =>
		withProviderScript('https://js.stripe.com/v3/', 'Stripe' in window, mountStripeCard)
	);
</script>

<form class="payment-form flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
	<div id="payment-element" class="stripe"></div>
	<button class="btn btn-black self-start" type="submit" disabled={stripeLoading || paymentLoading}>
		{t('checkout.cta.submit')}
	</button>
</form>
