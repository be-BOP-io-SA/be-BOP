// Loaded into the web server of the suite (playwright.config.ts): a payment whose id says a
// spec made it is answered here, since its provider has never heard of it.
const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
	const url = String(input instanceof Request ? input.url : input);

	if (url.startsWith('https://api.stripe.com/v1/payment_intents/pi_e2e_')) {
		return Response.json({
			status: 'requires_payment_method',
			amount_received: 0,
			currency: 'eur'
		});
	}

	return realFetch(input, init);
};
