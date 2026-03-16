<script context="module" lang="ts">
	declare global {
		interface Window {
			Stripe(publicKey: string): {
				elements: (options: {
					locale?: string;
					appearance: {
						theme: 'stripe' | 'night' | 'flat';
						variables?: Record<string, string>;
					};
					clientSecret: string;
				}) => {
					create: (
						type: 'card' | 'cardNumber' | 'cardExpiry' | 'cardCvc' | 'payment',
						options: {
							layout: { type: 'accordion' | 'tabs' } | 'accordion' | 'tabs';
						}
					) => {
						mount: (element: string | HTMLElement) => void;
					};
				};
				confirmPayment: (options: {
					elements: unknown;
					confirmParams: { return_url: string };
				}) => Promise<{ error: { type: string; message: string } }>;
			};
		}
	}
</script>

<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { useI18n } from '$lib/i18n';
	import { onMount } from 'svelte';
	import IconSumupWide from '$lib/components/icons/IconSumupWide.svelte';
	import IconStripe from '$lib/components/icons/IconStripe.svelte';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let orderId: string;
	export let returnTo: string | undefined = undefined;
	export let stripePublicKey: string | null = null;

	$: payUrl = returnTo
		? `/order/${orderId}/payment/${payment.id}/pay?returnTo=${encodeURIComponent(returnTo)}`
		: `/order/${orderId}/payment/${payment.id}/pay`;

	$: orderPath = returnTo
		? `/order/${orderId}?returnTo=${encodeURIComponent(returnTo)}`
		: `/order/${orderId}`;

	$: embedStripe = !!stripePublicKey && payment.processor === 'stripe';

	let paymentLoading = false;
	let stripeLoading = true;
	let handleSubmit = () => {};

	function mountStripeCard() {
		stripeLoading = true;
		if (payment.clientSecret && stripePublicKey) {
			const stripe = window.Stripe(stripePublicKey);
			const elements = stripe.elements({
				appearance: { theme: 'stripe' },
				clientSecret: payment.clientSecret
			});
			elements.create('payment', { layout: 'tabs' }).mount(`#stripe-embedded-${payment.id}`);
			setTimeout(() => {
				stripeLoading = false;
			}, 3000);

			handleSubmit = async () => {
				try {
					paymentLoading = true;
					const { error } = await stripe.confirmPayment({
						elements,
						confirmParams: {
							return_url: window.location.origin + orderPath
						}
					});
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
		if (!embedStripe) {
			return;
		}
		if ('Stripe' in window) {
			mountStripeCard();
		} else {
			document.head.append(
				Object.assign(document.createElement('script'), {
					src: 'https://js.stripe.com/v3/',
					async: false,
					defer: false,
					onload: () => mountStripeCard()
				})
			);
		}
	});
</script>

{#if payment.status === 'pending'}
	{#if embedStripe}
		<form class="payment-form flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
			<div id="stripe-embedded-{payment.id}" class="stripe"></div>
			<button
				class="btn btn-black self-start"
				type="submit"
				disabled={stripeLoading || paymentLoading}
			>
				{t('checkout.cta.submit')}
			</button>
		</form>
	{:else}
		<a href={payUrl} class="body-hyperlink">
			<span>{t('order.paymentLink')}</span>
			{#if payment.processor === 'sumup'}
				<IconSumupWide class="h-12 order-creditCard-svg" />
			{:else if payment.processor === 'stripe'}
				<IconStripe class="h-12 order-creditCard-svg" />
			{:else if payment.processor === 'paypal'}
				<img
					src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png"
					alt="PayPal"
					class="h-12"
				/>
			{:else if payment.processor}
				<span class="text-sm text-gray-500">{payment.processor}</span>
			{/if}
		</a>
	{/if}
{/if}
