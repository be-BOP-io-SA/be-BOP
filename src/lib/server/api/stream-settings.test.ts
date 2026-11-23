import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { MAX_STREAM_LIFETIME_SECONDS } from '$lib/types/ApiKey';
import {
	optionalStreamSetting,
	streamLifetimeSetting,
	streamSettingsRefusal
} from './stream-settings';

const form = z.object({
	maxConcurrentStreams: optionalStreamSetting,
	streamLifetimeSeconds: streamLifetimeSetting
});

function refusalOf(input: { maxConcurrentStreams: string; streamLifetimeSeconds: string }) {
	const parsed = form.safeParse(input);
	if (parsed.success) {
		throw new Error('expected the form to be refused');
	}
	return streamSettingsRefusal(parsed.error);
}

describe('stream lifetime setting', () => {
	it('takes an empty field as no lifetime, and the longest lifetime there is', () => {
		expect(streamLifetimeSetting.parse('')).toBeNull();
		expect(streamLifetimeSetting.parse(String(MAX_STREAM_LIFETIME_SECONDS))).toBe(
			MAX_STREAM_LIFETIME_SECONDS
		);
	});

	it('refuses a lifetime past the ceiling in the schema itself', () => {
		expect(streamLifetimeSetting.safeParse(String(MAX_STREAM_LIFETIME_SECONDS + 1)).success).toBe(
			false
		);
	});
});

describe('streamSettingsRefusal', () => {
	it('tells the lifetime ceiling apart, without repeating it among the other errors', () => {
		const refusal = refusalOf({
			maxConcurrentStreams: '',
			streamLifetimeSeconds: String(MAX_STREAM_LIFETIME_SECONDS + 1)
		});
		expect(refusal).toEqual({
			streamLifetimeTooLong: true,
			error: { formErrors: [], fieldErrors: {} }
		});
	});

	it('keeps the other refusals as they are', () => {
		const refusal = refusalOf({ maxConcurrentStreams: '-2', streamLifetimeSeconds: '' });
		expect(refusal.streamLifetimeTooLong).toBe(false);
		expect(refusal.error.fieldErrors).toHaveProperty('maxConcurrentStreams');
	});
});
