import { defineProcessor } from '../types';

/**
 * sattle.me's on-chain side. It has no settings of its own: it reads those of `sattleme`, whose
 * page has the box that lets it take new payments.
 */
export default defineProcessor({
	slug: 'sattleme-onchain',
	method: 'bitcoin',
	label: 'sattle.me (on-chain)',
	priority: 30
});
