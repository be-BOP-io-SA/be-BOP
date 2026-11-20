import { expect, type Locator, type Page } from './client-ip.js';

/** Searches the list, picks the option and checks the field shows it once the list closes */
export async function choose(select: Locator, search: string, option: string): Promise<void> {
	const input = select.locator('input').first();
	// Before hydration the field is plain markup that ignores the click, so retry until it opens.
	await expect(async () => {
		await input.click();
		await expect(select.locator('.svelte-select-list')).toBeVisible({ timeout: 1000 });
	}).toPass();
	await input.fill(search);
	await expect(select.locator('.svelte-select-list .item').first()).toHaveText(option);
	// The keyboard, because the sticky save bar of admin forms can cover the open list.
	await input.press('Enter');
	await expect(select.locator('.svelte-select-list')).toHaveCount(0);
	await expect(select.locator('.selected-item')).toHaveText(option);
}

/** The select whose choice is posted through the hidden input of that name */
export function selectFor(page: Page, hiddenName: string): Locator {
	return page
		.locator('label', { has: page.locator(`input[type=hidden][name="${hiddenName}"]`) })
		.locator('.svelte-select');
}
