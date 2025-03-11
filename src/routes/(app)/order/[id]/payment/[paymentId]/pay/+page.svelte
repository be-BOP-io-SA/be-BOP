<script context="module" lang="ts">
	declare global {
		interface Window {
			SumUpCard: {
				mount: (options: {
					id: string;
					checkoutId: string;
					onResponse?: (
						type: 'sent' | 'auth-screen' | 'error' | 'success',
						body?: string
					) => unknown;
					onLoad?: () => unknown;
					onPaymentMethodsLoad?: () => string[];
					onChangeInstallments?: (
						installments: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
					) => unknown;
					showSubmitButton?: boolean;
					showFooter?: boolean;
					showInstallments?: boolean;
					showZipCode?: boolean;
					showEmail?: boolean;
					email?: string;
					installments?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
					maxInstallments?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
					donateSubmitButton?: boolean;
					amount?: string;
					currency?:
						| 'EUR'
						| 'BGN'
						| 'BRL'
						| 'CHF'
						| 'CZK'
						| 'DKK'
						| 'GBP'
						| 'HUF'
						| 'NOK'
						| 'PLN'
						| 'SEK'
						| 'USD';
					locale?:
						| 'bg-BG'
						| 'cs-CZ'
						| 'da-DK'
						| 'de-AT'
						| 'de-CH'
						| 'de-DE'
						| 'de-LU'
						| 'el-CY'
						| 'el-GR'
						| 'en-GB'
						| 'en-IE'
						| 'en-MT'
						| 'en-US'
						| 'es-CL'
						| 'es-ES'
						| 'et-EE'
						| 'fi-FI'
						| 'fr-BE'
						| 'fr-CH'
						| 'fr-FR'
						| 'fr-LU'
						| 'hu-HU'
						| 'it-CH'
						| 'it-IT'
						| 'lt-LT'
						| 'lv-LV'
						| 'nb-NO'
						| 'nl-BE'
						| 'nl-NL'
						| 'pt-BR'
						| 'pt-PT'
						| 'pl-PL'
						| 'sk-SK'
						| 'sl-SI'
						| 'sv-SE';
					country?:
						| 'AT'
						| 'BE'
						| 'BG'
						| 'BR'
						| 'CH'
						| 'CL'
						| 'CO'
						| 'CY'
						| 'CZ'
						| 'DE'
						| 'DK'
						| 'EE'
						| 'ES'
						| 'FI'
						| 'FR'
						| 'GB'
						| 'GR'
						| 'HR'
						| 'HU'
						| 'IE'
						| 'IT'
						| 'LT'
						| 'LU'
						| 'LV'
						| 'MT'
						| 'NL'
						| 'NO'
						| 'PL'
						| 'PT'
						| 'RO'
						| 'SE'
						| 'SI'
						| 'SK'
						| 'US';
				}) => void;
				googlePay?: {
					merchantId: string;
					merchantName: string;
				};
			};

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
</script>

<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';

	import { page } from '$app/stores';
	import OrderSummary from '$lib/components/OrderSummary.svelte';
	import { useI18n } from '$lib/i18n';

	import { onMount } from 'svelte';

	export let data;

	const { t } = useI18n();

	let paymentLoading = false;
	let stripeLoading = true;
	$: orderPath = '/order/' + $page.params.id;

	function mountSumUpCard() {
		// Should always be true due to backend validation, doing this for TS
		if (data.payment.checkoutId) {
			window.SumUpCard.mount({
				id: 'payment-element',
				checkoutId: data.payment.checkoutId,
				onResponse: function (type) {
					if (type === 'success') {
						goto(orderPath);
					}
				}
			});
		}
	}

	function mountStripeCard() {
		stripeLoading = true;

		// Actually more like "clientSecret"
		if (data.payment.clientSecret && data.stripePublicKey) {
			const stripe = window.Stripe(data.stripePublicKey);
			const elements = stripe.elements({
				appearance: {
					theme: 'stripe'
				},
				clientSecret: data.payment.clientSecret
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

	onMount(() => {
		if (data.payment.processor === 'sumup') {
			if (window.SumUpCard) {
				mountSumUpCard();
			} else {
				document.head.append(
					Object.assign(document.createElement('script'), {
						src: 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js',
						async: false,
						defer: false,
						onload: () => mountSumUpCard()
					})
				);
			}
		} else if (data.payment.processor === 'stripe') {
			// Stripe
			if ('Stripe' in window) {
				mountStripeCard();
			} else {
				document.head.append(
					Object.assign(document.createElement('script'), {
						src: 'https://js.stripe.com/v3/',
						async: false,
						defer: false,
						onload: () => {
							mountStripeCard();
						}
					})
				);
			}
		}
	});

	afterNavigate(() => {
		const script = document.querySelector(
			'script[src="https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"]'
		);
		if (script) {
			document.head.removeChild(script);
		}
	});

	let handleSubmit = () => {};
</script>

<main class="mx-auto max-w-7xl py-10 px-6 flex flex-col md:flex-row gap-4 justify-around">
	<div class="grow">
		{#if data.payment.processor === 'stripe'}
			<form class="payment-form flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
				<div id="payment-element" class="stripe"></div>
				<button
					class="btn btn-black self-start"
					type="submit"
					disabled={stripeLoading || paymentLoading}
				>
					{t('checkout.cta.submit')}
				</button>
			</form>
		{:else}
			<div
				id="payment-element"
				class="max-w-lg mx-auto bg-white text-gray-700 rounded shadow {data.payment.processor}"
			></div>
		{/if}
	</div>
	<div class="self-center md:self-stretch">
		<OrderSummary order={data.order} class="sticky top-4 -mt-1" />
	</div>
</main>
<!-- 
<style>
	#payment-element.sumup {
		--cui-border-danger: #f44336;
		--cui-border-normal: #ccc;
		--cui-border-focus: #ebf4ff;
	}
</style> -->
