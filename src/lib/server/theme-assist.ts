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

/**
 * Generates a full ThemeData object from minimal user inputs.
 *
 * Color mapping:
 * - Primary color → header bg, footer bg, mainCTA backgrounds, calendar highlights, credit card SVG
 * - Secondary color → navbar bg, secondaryCTA backgrounds
 * - Neutral backgrounds → white (light) / black (dark)
 * - Text colors → auto-calculated for WCAG contrast
 * - Dark mode → black backgrounds, white text
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

	const textOnPrimary = getReadableTextColor(primaryColor);
	const textOnSecondary = getReadableTextColor(secondaryColor);

	const lightBg = '#ffffff';
	const darkBg = '#000000';
	const lightText = '#000000';
	const darkText = '#ffffff';

	const activeTabColor = textOnPrimary === '#ffffff' ? '#000000' : '#ffffff';

	return {
		name,
		header: {
			backgroundColor: colorPair(primaryColor, darkBg),
			shopName: {
				color: colorPair(textOnPrimary, darkText),
				fontFamily: titleFont
			},
			tab: {
				color: colorPair(textOnPrimary, darkText),
				fontFamily: mainFont
			},
			activeTab: {
				textDecoration: {
					color: colorPair(activeTabColor, darkText)
				}
			}
		},
		navbar: {
			backgroundColor: colorPair(secondaryColor, darkBg),
			color: colorPair(textOnSecondary, darkText),
			fontFamily: mainFont,
			searchInput: {
				backgroundColor: colorPair(lightBg, darkBg)
			}
		},
		footer: {
			backgroundColor: colorPair(primaryColor, darkBg),
			fontFamily: mainFont,
			color: colorPair(textOnPrimary, darkText)
		},
		cartPreview: {
			backgroundColor: colorPair(lightBg, darkBg),
			fontFamily: mainFont,
			color: colorPair(lightText, darkText),
			cta: { fontFamily: mainFont },
			mainCTA: {
				backgroundColor: colorPair(primaryColor, darkBg),
				color: colorPair(textOnPrimary, darkText)
			},
			secondaryCTA: {
				backgroundColor: colorPair(secondaryColor, darkBg),
				color: colorPair(textOnSecondary, darkText)
			}
		},
		body: {
			mainPlan: { backgroundColor: colorPair(lightBg, darkBg) },
			secondPlan: { backgroundColor: colorPair(lightBg, darkBg) },
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
				backgroundColor: colorPair(primaryColor, darkBg),
				color: colorPair(textOnPrimary, darkText)
			},
			secondaryCTA: {
				backgroundColor: colorPair(secondaryColor, darkBg),
				color: colorPair(textOnSecondary, darkText)
			},
			hyperlink: {
				color: colorPair(lightText, darkText)
			}
		},
		tagWidget: {
			main: { backgroundColor: colorPair(lightBg, darkBg) },
			transparent: { backgroundColor: colorPair(lightBg, darkBg) },
			secondary: { backgroundColor: colorPair(lightBg, darkBg) },
			cta: {
				backgroundColor: colorPair(primaryColor, darkBg),
				color: colorPair(textOnPrimary, darkText)
			},
			fontFamily: mainFont,
			color: colorPair(lightText, darkText),
			hyperlink: {
				color: colorPair(lightText, darkText)
			}
		},
		touchScreen: {
			category: {
				cta: {
					backgroundColor: colorPair(lightBg, darkBg),
					color: colorPair(lightText, darkText)
				},
				fontFamily: mainFont
			},
			product: {
				cta: {
					backgroundColor: colorPair(lightBg, darkBg),
					color: colorPair(lightText, darkText),
					fontFamily: mainFont
				},
				secondaryCTA: {
					backgroundColor: colorPair(lightBg, darkBg),
					color: colorPair(lightText, darkText),
					fontFamily: mainFont
				}
			},
			ticket: {
				menu: {
					backgroundColor: colorPair(lightBg, darkBg),
					color: colorPair(lightText, darkText),
					fontFamily: mainFont
				}
			},
			action: {
				cta: {
					backgroundColor: colorPair(lightBg, darkBg),
					color: colorPair(lightText, darkText),
					fontFamily: mainFont
				},
				secondaryCTA: {
					backgroundColor: colorPair(lightBg, darkBg),
					color: colorPair(lightText, darkText),
					fontFamily: mainFont
				},
				cancel: {
					backgroundColor: colorPair(lightBg, darkBg)
				},
				delete: {
					backgroundColor: colorPair(lightBg, darkBg)
				}
			}
		},
		order: {
			creditCard: {
				svg: {
					color: colorPair(primaryColor, darkText)
				}
			}
		},
		eventCalendar: {
			main: { backgroundColor: colorPair(lightBg, darkBg) },
			navCTA: { backgroundColor: colorPair(primaryColor, darkBg) },
			hasEvent: {
				backgroundColor: colorPair(lightBg, darkBg),
				color: colorPair(lightText, darkText)
			},
			currentDate: {
				backgroundColor: colorPair(primaryColor, darkBg),
				color: colorPair(textOnPrimary, darkText)
			},
			fontFamily: mainFont,
			color: colorPair(lightText, darkText)
		}
	};
}
