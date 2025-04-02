import { ORIGIN } from '$env/static/private';
import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import { addMinutes, format } from 'date-fns';

export const GET = async ({ params }) => {
	const schedule = await collections.schedules.findOne({ _id: params.id });

	if (!schedule) {
		throw error(404, 'schedule not found');
	}

	let rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`;
	rssFeed += `<title>${schedule.name.replaceAll(/</g, '&lt;')}</title>\n`;
	rssFeed += `<link>${ORIGIN}/schedule/${schedule._id.replaceAll(/</g, '&lt;')}/rss.xml</link>\n`;
	rssFeed += `<description>List of events</description>\n`;
	rssFeed += `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
	rssFeed += `<language>fr</language>\n`;
	rssFeed += `<atom:link href="${ORIGIN}/schedule/${schedule._id.replaceAll(
		/</g,
		'&lt;'
	)}/rss.xml" rel="self" type="application/rss+xml"/>\n`;
	schedule.events.forEach((event, index) => {
		rssFeed += `<item>\n`;
		rssFeed += `  <title>${event.title.replaceAll(/</g, '&lt;')}</title>\n`;
		rssFeed += `<link>${ORIGIN}/schedule/${schedule._id.replaceAll(/</g, '&lt;')}</link>\n`;
		rssFeed += `  <description>${
			(event.shortDescription || 'description coming soon...').replaceAll(/</g, '&lt;') || ''
		}</description>\n`;
		rssFeed += `  <pubDate>${format(
			addMinutes(schedule.updatedAt, index),
			"EEE, dd MMM yyyy HH:mm:ss 'GMT'"
		)}</pubDate>\n`;
		rssFeed += `<guid isPermaLink="true">${ORIGIN}/schedule/${schedule._id.replaceAll(
			/</g,
			'&lt;'
		)}/event/${event.slug}</guid>\n`;
		rssFeed += `</item>\n`;
	});

	rssFeed += `</channel>\n</rss>`;

	return new Response(rssFeed, {
		headers: {
			'Content-Type': 'application/rss+xml'
		}
	});
};
