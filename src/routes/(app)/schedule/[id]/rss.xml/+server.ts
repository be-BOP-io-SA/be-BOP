import { ORIGIN } from '$env/static/private';
import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import { format } from 'date-fns';

export const GET = async ({ params }) => {
	const schedule = await collections.schedules.findOne({ _id: params.id });

	if (!schedule) {
		throw error(404, 'schedule not found');
	}

	let rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0">\n<channel>\n`;
	rssFeed += `<title>${schedule.name.replaceAll(/</g, '&lt;')}</title>\n`;
	rssFeed += `<link>${ORIGIN}/schedule/${schedule._id.replaceAll(/</g, '&lt;')}</link>\n`;
	rssFeed += `<description>List of events</description>\n`;
	rssFeed += `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
	rssFeed += `<language>fr</language>\n`;

	schedule.events.forEach((event) => {
		rssFeed += `<item>\n`;
		rssFeed += `  <title>${event.title.replaceAll(/</g, '&lt;')}</title>\n`;
		rssFeed += `<link>${ORIGIN}/schedule/${schedule._id.replaceAll(/</g, '&lt;')}</link>\n`;
		rssFeed += `  <description>${
			event.shortDescription?.replaceAll(/</g, '&lt;') || ''
		}</description>\n`;
		rssFeed += `  <pubDate>${format(
			event.beginsAt,
			"EEE, dd MMM yyyy HH:mm:ss 'GMT'"
		)}</pubDate>\n`;
		rssFeed += `</item>\n`;
	});

	rssFeed += `</channel>\n</rss>`;

	return new Response(rssFeed, {
		headers: {
			'Content-Type': 'application/rss+xml'
		}
	});
};
