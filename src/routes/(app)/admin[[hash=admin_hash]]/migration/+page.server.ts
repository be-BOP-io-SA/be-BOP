import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { listConnectors, getConnector } from '$lib/server/migration/registry';
import { redactConfig } from '$lib/server/migration/connector';
import {
	createSource,
	deleteSource,
	getSource,
	listJobs,
	listSources,
	recordSourceTestResult,
	startJobFromSource,
	updateSource
} from '$lib/server/migration/manager';
import type { Actions } from './$types';

export const load = async ({ url }) => {
	const [jobs, sources] = await Promise.all([listJobs(), listSources()]);
	const connectors = listConnectors().map((c) => ({ id: c.id, label: c.label }));

	const editingId = url.searchParams.get('edit');
	let editingSource: {
		_id: string;
		connectorId: string;
		label: string;
		nonSecretConfig: Record<string, unknown>;
		secretFields: string[];
	} | null = null;
	if (editingId) {
		const source = await getSource(editingId);
		if (source) {
			const connector = getConnector(source.connectorId);
			const secretFields = (connector?.secretFields ?? []) as string[];
			const nonSecretConfig: Record<string, unknown> = { ...source.config };
			for (const f of secretFields) delete nonSecretConfig[f];
			editingSource = {
				_id: source._id.toString(),
				connectorId: source.connectorId,
				label: source.label,
				nonSecretConfig,
				secretFields
			};
		}
	}

	return {
		connectors,
		editingSource,
		sources: sources.map((s) => {
			const connector = getConnector(s.connectorId);
			return {
				_id: s._id.toString(),
				connectorId: s.connectorId,
				connectorLabel: connector?.label ?? s.connectorId,
				label: s.label,
				config: connector ? redactConfig(connector, s.config) : s.config,
				lastTestedAt: s.lastTestedAt,
				lastTestResult: s.lastTestResult,
				createdAt: s.createdAt
			};
		}),
		jobs: jobs.map((j) => ({
			...j,
			_id: j._id.toString(),
			sourceId: j.sourceId?.toString()
		}))
	};
};

function parseConfigFromForm(json: Record<string, unknown>, source: string) {
	const connector = getConnector(source);
	if (!connector) {
		return { ok: false as const, status: 400, error: `Unknown connector: ${source}` };
	}
	try {
		const config = connector.configSchema.parse(json);
		return { ok: true as const, connector, config };
	} catch (err) {
		return {
			ok: false as const,
			status: 400,
			error: err instanceof Error ? err.message : 'Invalid config'
		};
	}
}

export const actions: Actions = {
	saveSource: async ({ request }) => {
		const formData = await request.formData();
		const json = Object.fromEntries(formData) as Record<string, unknown>;
		const sourceIdRaw = formData.get('sourceId');

		const { source, label } = z
			.object({ source: z.string().min(1), label: z.string().trim().min(1) })
			.parse({ source: json.source, label: json.label });

		const connector = getConnector(source);
		if (!connector) {
			return fail(400, { error: `Unknown connector: ${source}` });
		}

		// Edit mode: preserve secret fields if the form left them empty.
		let configToParse: Record<string, unknown> = { ...json };
		const updatingId = typeof sourceIdRaw === 'string' && sourceIdRaw ? sourceIdRaw : null;
		if (updatingId) {
			const existing = await getSource(updatingId);
			if (!existing) {
				return fail(404, { error: 'Source not found' });
			}
			const secretFields = (connector.secretFields ?? []) as string[];
			for (const f of secretFields) {
				const incoming = configToParse[f];
				if (
					incoming === undefined ||
					incoming === null ||
					(typeof incoming === 'string' && incoming.trim() === '')
				) {
					configToParse[f] = existing.config[f];
				}
			}
		}

		let config: unknown;
		try {
			config = connector.configSchema.parse(configToParse);
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Invalid config'
			});
		}

		try {
			if (updatingId) {
				const updated = await updateSource(updatingId, {
					label,
					config: config as Record<string, unknown>
				});
				if (!updated) return fail(404, { error: 'Source not found' });
				return { updatedSourceId: updated._id.toString() };
			}
			const created = await createSource({
				connectorId: source,
				label,
				config: config as Record<string, unknown>
			});
			return { savedSourceId: created._id.toString() };
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Could not save source'
			});
		}
	},

	deleteSource: async ({ request }) => {
		const formData = await request.formData();
		const { sourceId } = z
			.object({ sourceId: z.string().min(1) })
			.parse({ sourceId: formData.get('sourceId') });
		await deleteSource(sourceId);
		return { deleted: sourceId };
	},

	testConnection: async ({ request }) => {
		const formData = await request.formData();
		const json = Object.fromEntries(formData);
		const sourceIdRaw = formData.get('sourceId');

		// Two modes:
		//   - sourceId provided → test the saved source
		//   - else → test the inline form values
		if (sourceIdRaw && typeof sourceIdRaw === 'string' && sourceIdRaw.length > 0) {
			const saved = await getSource(sourceIdRaw);
			if (!saved) {
				return fail(404, { error: 'Source not found' });
			}
			const connector = getConnector(saved.connectorId);
			if (!connector) {
				return fail(400, { error: `Unknown connector: ${saved.connectorId}` });
			}
			const result = await connector.testConnection(saved.config as never);
			await recordSourceTestResult(saved._id, result);
			return { test: result, testedSourceId: saved._id.toString() };
		}

		const source = String(json.source ?? '');
		const parsed = parseConfigFromForm(json, source);
		if (!parsed.ok) {
			return fail(parsed.status, { error: parsed.error });
		}
		const result = await parsed.connector.testConnection(parsed.config as never);
		return { test: result };
	},

	start: async ({ request }) => {
		const formData = await request.formData();
		const { sourceId } = z
			.object({ sourceId: z.string().min(1) })
			.parse({ sourceId: formData.get('sourceId') });
		try {
			const job = await startJobFromSource(sourceId);
			return { jobId: job._id.toString() };
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Could not start job'
			});
		}
	}
};
