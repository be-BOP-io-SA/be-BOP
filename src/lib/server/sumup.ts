import { runtimeConfig } from './runtime-config';

export const isSumupEnabled = (): boolean =>
	!!runtimeConfig.sumUp.apiKey && !!runtimeConfig.sumUp.merchantCode;
