import { expect, test } from '@playwright/test';

import { installMockElectron } from './helpers/mockElectron';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(installMockElectron);
    await page.goto('/');
    await expect(page.getByTestId('browser-chrome')).toBeVisible();
});

test('creates a new tab from the tab bar', async ({ page }) => {
    const tabs = page.getByTestId('browser-tab');

    await expect(tabs).toHaveCount(1);

    await page.getByTestId('new-tab-button').click();

    await expect(tabs).toHaveCount(2);
});

test('navigates to the settings page through the address bar', async ({ page }) => {
    await page.getByTestId('address-input').fill('neuralweb://settings');
    await page.getByTestId('address-input').press('Enter');

    await expect(page.getByTestId('settings-page')).toBeVisible();
    await expect(page.getByTestId('search-engine-select')).toHaveValue('google');
});

test('opens the AI sidebar from the toolbar', async ({ page }) => {
    await page.getByTestId('ai-toggle-button').click();

    await expect(page.getByTestId('ai-sidebar')).toBeVisible();
    await expect(page.getByText('How can I help?')).toBeVisible();
    await expect(page.getByTestId('ai-input')).toBeVisible();
});
