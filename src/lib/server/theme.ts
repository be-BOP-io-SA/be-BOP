import { z } from 'zod';

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
	})
});

export type ThemeData = z.infer<typeof themeValidator>;
