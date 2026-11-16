import { expect, test, type Page } from '@playwright/test';

async function signUp(page: Page) {
  const email = `e2e-appearance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto('/signup');
  const form = page.locator('form');
  await form.locator('input').nth(0).fill('E2E User');
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[type="password"]').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/w\/[^/]+$/);
}

const themeOf = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);

test('pick a theme on Appearance; it survives a reload and follows the account', async ({ page, browser }) => {
  await signUp(page);
  const homeUrl = page.url();
  expect(await themeOf(page)).toBe('paper');

  await page.getByRole('button', { name: /^Profile menu/ }).first().click();
  await page.getByRole('menuitem', { name: 'Appearance' }).first().click();
  await page.waitForURL(/\/appearance$/);

  const saved = page.waitForResponse((response) => response.url().includes('/auth/me/appearance') && response.ok());
  await page.getByRole('radio', { name: /Blueprint/ }).click();
  await saved;
  await expect(page.getByRole('radio', { name: /Blueprint/ })).toHaveAttribute('aria-checked', 'true');
  expect(await themeOf(page)).toBe('blueprint');

  // Applied before the app hydrates: no Paper flash on reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await themeOf(page)).toBe('blueprint');

  // Another device: same session, no local copy. The server's choice is applied once the app loads.
  const other = await browser.newContext();
  await other.addCookies(await page.context().cookies());
  const otherPage = await other.newPage();
  await otherPage.goto(homeUrl);
  await expect.poll(() => themeOf(otherPage)).toBe('blueprint');
  await other.close();
});

test('f switches focus mode anywhere outside a text field', async ({ page }) => {
  await signUp(page);
  const focusOf = () => page.evaluate(() => document.documentElement.dataset.focus);
  expect(await focusOf()).toBe('off');

  // Wait until the shell is interactive (its keyboard listener is attached after hydration).
  await expect(page.getByRole('button', { name: /^Profile menu/ }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('f');
  await expect(page.getByText('Focus mode on')).toBeVisible();
  await expect.poll(focusOf).toBe('on');

  await page.keyboard.press('f');
  await expect.poll(focusOf).toBe('off');
});
