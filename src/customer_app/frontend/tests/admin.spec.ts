import { expect, test } from '@playwright/test';

test.describe('admin console smoke', () => {
  test('renders navigation and export buttons', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Admin console/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Products/i })).toBeVisible();
  });

  test('loads reminder configuration screen', async ({ page }) => {
    await page.goto('/reminders');
    await expect(page.getByRole('heading', { name: /Reminder configuration/i })).toBeVisible();
  });
});
