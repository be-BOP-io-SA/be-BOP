// @ts-expect-error no types
import bip84 from 'bip84';
import bs58check from 'bs58check';
import { createHash } from 'node:crypto';

/**
 * Transparent Zcash addresses (t1… on mainnet, tm… on testnet) from a BIP44 account key.
 *
 * A Zcash transparent account key is a plain BIP32 extended public key: `xpub` on mainnet and
 * `tpub` on testnet, the same version bytes as Bitcoin, the coin type 133 (1 on testnet) being
 * in the path the wallet derived it at, not in the key. An address is then Base58Check of a
 * two-byte prefix and the hash160 of the public key, as in the Trezor coin definitions
 * (https://github.com/trezor/trezor-firmware/blob/main/common/defs/bitcoin/zcash.json).
 */

// BIP-32: indexes from 2^31 upward are hardened and cannot be derived from a public key.
export const MAX_NON_HARDENED_INDEX = 2 ** 31 - 1;

/** Named as lightwalletd reports it in `chainName`. */
export type ZcashNetwork = 'main' | 'test';

const P2PKH_PREFIX: Record<ZcashNetwork, Buffer> = {
	main: Buffer.from('1cb8', 'hex'),
	test: Buffer.from('1d25', 'hex')
};

// `bip84` only reads zpub / vpub. The derivation does not depend on the version bytes, so the key
// is relabelled, and only its public keys are used: the bech32 addresses it would build are not.
const ZPUB = Buffer.from('04b24746', 'hex');
const VPUB = Buffer.from('045f1cf6', 'hex');

export function networkOfKey(key: string): ZcashNetwork | null {
	return key.startsWith('xpub') ? 'main' : key.startsWith('tpub') ? 'test' : null;
}

function relabelled(key: string): string {
	const network = networkOfKey(key);
	if (!network) {
		throw new Error('A Zcash transparent account key starts with xpub (mainnet) or tpub (testnet)');
	}
	const decoded = Buffer.from(bs58check.decode(key));
	return bs58check.encode(Buffer.concat([network === 'main' ? ZPUB : VPUB, decoded.subarray(4)]));
}

const hash160 = (data: Buffer) =>
	createHash('ripemd160').update(createHash('sha256').update(data).digest()).digest();

/** The receiving address at `index`: m/…/0/index under the account key. */
export function transparentAddress(key: string, index: number): string {
	const network = networkOfKey(key);
	if (!network) {
		throw new Error('A Zcash transparent account key starts with xpub (mainnet) or tpub (testnet)');
	}
	const publicKey = Buffer.from(new bip84.fromZPub(relabelled(key)).getPublicKey(index), 'hex');

	return bs58check.encode(Buffer.concat([P2PKH_PREFIX[network], hash160(publicKey)]));
}

export function isValidAccountKey(key: string): boolean {
	try {
		transparentAddress(key, 0);
		return true;
	} catch {
		return false;
	}
}

/** The script of a transparent output paying `address`: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG. */
export function p2pkhScript(address: string): Buffer {
	const decoded = Buffer.from(bs58check.decode(address));
	return Buffer.concat([
		Buffer.from('76a914', 'hex'),
		decoded.subarray(2),
		Buffer.from('88ac', 'hex')
	]);
}
