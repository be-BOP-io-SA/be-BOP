import type { ThemeData } from './theme';

// --- Color utility functions (inspired by WordPress twentytwenty color-calculations.js) ---

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	return {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	};
}

/** WCAG 2.1 relative luminance */
function getLuminance(hex: string): number {
	const { r, g, b } = hexToRgb(hex);
	const [rs, gs, bs] = [r, g, b].map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG 2.1 contrast ratio between two colors */
function getContrastRatio(hex1: string, hex2: string): number {
	const l1 = getLuminance(hex1);
	const l2 = getLuminance(hex2);
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

/** Returns #000000 or #ffffff for best readability on the given background (WCAG AA 4.5:1 target) */
function getReadableTextColor(bgHex: string): string {
	const whiteContrast = getContrastRatio(bgHex, '#ffffff');
	const blackContrast = getContrastRatio(bgHex, '#000000');
	return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
}

function colorPair(light: string, dark: string) {
	return { light, dark };
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
	const { r: r255, g: g255, b: b255 } = hexToRgb(hex);
	const r = r255 / 255;
	const g = g255 / 255;
	const b = b255 / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) {
		return { h: 0, s: 0, l };
	}
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === r) {
		h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	} else if (max === g) {
		h = ((b - r) / d + 2) / 6;
	} else {
		h = ((r - g) / d + 4) / 6;
	}
	return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	let r: number, g: number, b: number;
	if (s === 0) {
		r = g = b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return (
		'#' +
		[r, g, b]
			.map((c) =>
				Math.round(c * 255)
					.toString(16)
					.padStart(2, '0')
			)
			.join('')
	);
}

/** Darken a color for dark mode: keep hue, reduce lightness, boost saturation slightly */
function toDarkVariant(hex: string): string {
	const { h, s, l } = hexToHsl(hex);
	// Target lightness: 15-25% range, darker colors stay close, lighter colors get pulled down
	const darkL = Math.min(0.25, l * 0.4);
	// Slightly boost saturation to keep color identity visible on dark backgrounds
	const darkS = Math.min(1, s * 1.2);
	return hslToHex(h, darkS, darkL);
}

/**
 * Generates a full ThemeData object from minimal user inputs.
 *
 * Color mapping:
 * - Primary color → header bg, footer bg, mainCTA backgrounds, calendar highlights, credit card SVG
 * - Secondary color → navbar bg, secondaryCTA backgrounds
 * - Neutral backgrounds → white (light) / darkened neutral (dark)
 * - Text colors → auto-calculated for WCAG contrast
 * - Dark mode → darkened primary/secondary colors, contrast-safe text
 * - Touch screen → uses primary/secondary for CTAs
 */
export function generateThemeData(params: {
	name: string;
	primaryColor: string;
	secondaryColor: string;
	mainFont: string;
	secondaryFont?: string;
}): ThemeData {
	const { name, primaryColor, secondaryColor, mainFont } = params;
	const titleFont = params.secondaryFont || mainFont;

	// Light mode text on colored backgrounds
	const textOnPrimary = getReadableTextColor(primaryColor);
	const textOnSecondary = getReadableTextColor(secondaryColor);

	// Dark mode variants of the chosen colors
	const darkPrimary = toDarkVariant(primaryColor);
	const darkSecondary = toDarkVariant(secondaryColor);

	// Dark mode text on dark variants
	const textOnDarkPrimary = getReadableTextColor(darkPrimary);
	const textOnDarkSecondary = getReadableTextColor(darkSecondary);

	const lightBg = '#ffffff';
	const darkBg = '#111111';
	const lightText = '#000000';
	const darkText = '#ffffff';

	const activeTabColor = textOnPrimary === '#ffffff' ? '#000000' : '#ffffff';
	const darkActiveTabColor = textOnDarkPrimary === '#ffffff' ? '#000000' : '#ffffff';

	// Neutral dark surface (slightly lighter than darkBg for cards/surfaces)
	const darkSurface = '#1a1a1a';
	const textOnDarkSurface = '#ffffff';

	return {
		name,
		header: {
			backgroundColor: colorPair(primaryColor, darkPrimary),
			shopName: {
				color: colorPair(textOnPrimary, textOnDarkPrimary),
				fontFamily: titleFont
			},
			tab: {
				color: colorPair(textOnPrimary, textOnDarkPrimary),
				fontFamily: mainFont
			},
			activeTab: {
				textDecoration: {
					color: colorPair(activeTabColor, darkActiveTabColor)
				}
			}
		},
		navbar: {
			backgroundColor: colorPair(secondaryColor, darkSecondary),
			color: colorPair(textOnSecondary, textOnDarkSecondary),
			fontFamily: mainFont,
			searchInput: {
				backgroundColor: colorPair(lightBg, darkSurface)
			}
		},
		footer: {
			backgroundColor: colorPair(primaryColor, darkPrimary),
			fontFamily: mainFont,
			color: colorPair(textOnPrimary, textOnDarkPrimary)
		},
		cartPreview: {
			backgroundColor: colorPair(lightBg, darkBg),
			fontFamily: mainFont,
			color: colorPair(lightText, darkText),
			cta: { fontFamily: mainFont },
			mainCTA: {
				backgroundColor: colorPair(primaryColor, darkPrimary),
				color: colorPair(textOnPrimary, textOnDarkPrimary)
			},
			secondaryCTA: {
				backgroundColor: colorPair(secondaryColor, darkSecondary),
				color: colorPair(textOnSecondary, textOnDarkSecondary)
			}
		},
		body: {
			mainPlan: { backgroundColor: colorPair(lightBg, darkBg) },
			secondPlan: { backgroundColor: colorPair(lightBg, darkSurface) },
			cta: { fontFamily: mainFont },
			title: {
				fontFamily: titleFont,
				color: colorPair(lightText, darkText)
			},
			text: {
				fontFamily: mainFont,
				color: colorPair(lightText, darkText)
			},
			secondaryText: {
				fontFamily: mainFont,
				color: colorPair(lightText, darkText)
			},
			mainCTA: {
				backgroundColor: colorPair(primaryColor, darkPrimary),
				color: colorPair(textOnPrimary, textOnDarkPrimary)
			},
			secondaryCTA: {
				backgroundColor: colorPair(secondaryColor, darkSecondary),
				color: colorPair(textOnSecondary, textOnDarkSecondary)
			},
			hyperlink: {
				color: colorPair(primaryColor, textOnDarkPrimary)
			}
		},
		tagWidget: {
			main: { backgroundColor: colorPair(lightBg, darkBg) },
			transparent: { backgroundColor: colorPair(lightBg, darkBg) },
			secondary: { backgroundColor: colorPair(lightBg, darkSurface) },
			cta: {
				backgroundColor: colorPair(primaryColor, darkPrimary),
				color: colorPair(textOnPrimary, textOnDarkPrimary)
			},
			fontFamily: mainFont,
			color: colorPair(lightText, darkText),
			hyperlink: {
				color: colorPair(primaryColor, textOnDarkPrimary)
			}
		},
		touchScreen: {
			category: {
				cta: {
					backgroundColor: colorPair(primaryColor, darkPrimary),
					color: colorPair(textOnPrimary, textOnDarkPrimary)
				},
				fontFamily: mainFont
			},
			product: {
				cta: {
					backgroundColor: colorPair(primaryColor, darkPrimary),
					color: colorPair(textOnPrimary, textOnDarkPrimary),
					fontFamily: mainFont
				},
				secondaryCTA: {
					backgroundColor: colorPair(secondaryColor, darkSecondary),
					color: colorPair(textOnSecondary, textOnDarkSecondary),
					fontFamily: mainFont
				}
			},
			ticket: {
				menu: {
					backgroundColor: colorPair(lightBg, darkSurface),
					color: colorPair(lightText, textOnDarkSurface),
					fontFamily: mainFont
				}
			},
			action: {
				cta: {
					backgroundColor: colorPair(primaryColor, darkPrimary),
					color: colorPair(textOnPrimary, textOnDarkPrimary),
					fontFamily: mainFont
				},
				secondaryCTA: {
					backgroundColor: colorPair(secondaryColor, darkSecondary),
					color: colorPair(textOnSecondary, textOnDarkSecondary),
					fontFamily: mainFont
				},
				cancel: {
					backgroundColor: colorPair(lightBg, darkSurface)
				},
				delete: {
					backgroundColor: colorPair('#ff4444', '#cc0000')
				}
			}
		},
		order: {
			creditCard: {
				svg: {
					color: colorPair(primaryColor, textOnDarkPrimary)
				}
			}
		},
		eventCalendar: {
			main: { backgroundColor: colorPair(lightBg, darkBg) },
			navCTA: { backgroundColor: colorPair(primaryColor, darkPrimary) },
			hasEvent: {
				backgroundColor: colorPair(lightBg, darkSurface),
				color: colorPair(lightText, darkText)
			},
			currentDate: {
				backgroundColor: colorPair(primaryColor, darkPrimary),
				color: colorPair(textOnPrimary, textOnDarkPrimary)
			},
			fontFamily: mainFont,
			color: colorPair(lightText, darkText)
		}
	};
}
