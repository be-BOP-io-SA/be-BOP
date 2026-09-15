import { runtimeConfig } from './runtime-config';

/**
 * Whether the storefront stops printing "VAT excluded" / "(HT)" next to prices, because the
 * shop charges no VAT and asked not to advertise one. See issue #2679.
 */
export function hidesVatMentions(): boolean {
	return runtimeConfig.vatExempted && runtimeConfig.hideVatMentionsWhenExempted;
}

/**
 * Whether prices are shown VAT-included.
 *
 * A shop hiding its VAT mentions shows plain prices: multiplying by a tax it does not charge
 * would print a higher figure with nothing left on screen to explain it.
 */
export function displaysVatIncluded(): boolean {
	return runtimeConfig.displayVatIncludedInProduct && !hidesVatMentions();
}
