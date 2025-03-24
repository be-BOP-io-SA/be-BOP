import { z } from 'zod';
import { collections } from './database';
import { runtimeConfig } from './runtime-config';

const backgroundColor = z.object({
	light: z.string().regex(/^#[0-9a-f]{6}$/i),
	dark: z.string().regex(/^#[0-9a-f]{6}$/i)
});
const color = backgroundColor;

const systemFonts = [
	'Arial',
	'Verdana',
	'Helvetica',
	'Tahoma',
	'Trebuchet MS',
	'Times New Roman',
	'Georgia',
	'Garamond',
	'Courier New',
	'Brush Script MT',
	'Outfit',
	'Gloock',
	'Poppins'
];
const fontFamily = z.enum([systemFonts[0], ...systemFonts.slice(1)]);

export const themeValidator = z.object({
	name: z.string(),
	header: z.object({
		backgroundColor,
		shopName: z.object({
			color,
			fontFamily
		}),
		tab: z.object({
			color,
			fontFamily
		}),
		activeTab: z.object({
			textDecoration: z.object({
				color
			})
		})
	}),
	navbar: z.object({
		backgroundColor,
		color,
		fontFamily,
		searchInput: z.object({
			backgroundColor
		})
	}),
	footer: z.object({
		backgroundColor,
		fontFamily,
		color
	}),
	cartPreview: z.object({
		backgroundColor,
		fontFamily,
		color,
		cta: z.object({ fontFamily }),
		mainCTA: z.object({ backgroundColor, color }),
		secondaryCTA: z.object({ backgroundColor, color })
	}),
	body: z.object({
		mainPlan: z.object({ backgroundColor }),
		secondPlan: z.object({ backgroundColor }),
		cta: z.object({ fontFamily }),
		title: z.object({ fontFamily, color }),
		text: z.object({ fontFamily, color }),
		secondaryText: z.object({ fontFamily, color }),
		mainCTA: z.object({ backgroundColor, color }),
		secondaryCTA: z.object({ backgroundColor, color }),
		hyperlink: z.object({ color })
	}),
	tagWidget: z.object({
		main: z.object({ backgroundColor }),
		transparent: z.object({ backgroundColor }),
		secondary: z.object({ backgroundColor }),
		cta: z.object({ backgroundColor, color }),
		fontFamily,
		color,
		hyperlink: z.object({ color })
	}),
	touchScreen: z.object({
		category: z.object({
			cta: z.object({ backgroundColor, color }),
			fontFamily
		}),
		product: z.object({
			cta: z.object({ backgroundColor, color, fontFamily }),
			secondaryCTA: z.object({ backgroundColor, color, fontFamily })
		}),
		ticket: z.object({
			menu: z.object({ backgroundColor, color, fontFamily })
		}),
		action: z.object({
			cta: z.object({ backgroundColor, color, fontFamily }),
			secondaryCTA: z.object({ backgroundColor, color, fontFamily }),
			cancel: z.object({ backgroundColor }),
			delete: z.object({ backgroundColor })
		})
	}),
	order: z.object({
		creditCard: z.object({
			svg: z.object({ color })
		})
	}),
	eventCalendar: z.object({
		main: z.object({ backgroundColor }),
		navCTA: z.object({ backgroundColor }),
		hasEvent: z.object({ backgroundColor, color }),
		currentDate: z.object({ backgroundColor, color }),
		fontFamily,
		color
	})
});

export type ThemeData = z.infer<typeof themeValidator>;

export async function increaseThemeChangeNumber() {
	await collections.runtimeConfig.updateOne(
		{
			_id: 'themeChangeNumber'
		},
		{
			$inc: {
				data: 1 as never
			},
			$set: {
				updatedAt: new Date()
			}
		},
		{
			upsert: true
		}
	);
	runtimeConfig.themeChangeNumber++;
}
