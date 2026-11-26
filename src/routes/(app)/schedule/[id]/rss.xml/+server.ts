import { ORIGIN } from '$lib/server/env-config';
import { collections } from '$lib/server/database';
import { escapeHtml as escapeXml } from '$lib/utils/escapeHtml';
import { error } from '@sveltejs/kit';
import { addMinutes, format } from 'date-fns';

export const GET = async ({ params }) => {
	const schedule = await collections.schedules.findOne({ _id: params.id });

	if (!schedule) {
		throw error(404, 'schedule not found');
	}

	const scheduleId = escapeXml(schedule._id);

	let rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`;
	rssFeed += `<title>${escapeXml(schedule.name)}</title>\n`;
	rssFeed += `<link>${ORIGIN}/schedule/${scheduleId}/rss.xml</link>\n`;
	rssFeed += `<description>List of events</description>\n`;
	rssFeed += `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
	rssFeed += `<language>fr</language>\n`;
	rssFeed += `<atom:link href="${ORIGIN}/schedule/${scheduleId}/rss.xml" rel="self" type="application/rss+xml"/>\n`;
	schedule.events.forEach((event, index) => {
		rssFeed += `<item>\n`;
		rssFeed += `  <title>${escapeXml(event.title)}</title>\n`;
		rssFeed += `<link>${ORIGIN}/schedule/${scheduleId}</link>\n`;
		rssFeed += `  <description>${escapeXml(
			event.shortDescription || 'description coming soon...'
		)}</description>\n`;
		rssFeed += `  <pubDate>${format(
			addMinutes(schedule.updatedAt, index),
			"EEE, dd MMM yyyy HH:mm:ss 'GMT'"
		)}</pubDate>\n`;
		rssFeed += `<guid isPermaLink="true">${ORIGIN}/schedule/${scheduleId}/event/${escapeXml(
			event.slug
		)}</guid>\n`;
		rssFeed += `</item>\n`;
	});

	rssFeed += `</channel>\n</rss>`;

	return new Response(rssFeed, {
		headers: {
			'Content-Type': 'application/rss+xml'
		}
	});
};
