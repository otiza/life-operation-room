import { expect, test, type Page } from '@playwright/test';

async function signUp(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto('/signup');
  const form = page.locator('form');
  await form.locator('input').nth(0).fill('E2E User');
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[type="password"]').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/w\/[^/]+$/);
}

async function openMarketplace(page: Page) {
  await page.getByRole('button', { name: /^Profile menu/ }).first().click();
  await page.getByRole('menuitem', { name: 'Add apps' }).first().click();
  await page.waitForURL(/\/apps$/);
}

async function installApp(page: Page, name: string) {
  const card = page.locator('div.rounded-xl').filter({ has: page.getByRole('heading', { name, exact: true }) });
  await card.getByRole('button', { name: 'Install' }).click();
  await expect(card.getByRole('button', { name: 'Uninstall' })).toBeVisible();
}

test('capture a task on Today and mark it done', async ({ page }) => {
  await signUp(page);
  const homeUrl = page.url();

  await openMarketplace(page);
  await installApp(page, 'Projects');
  await installApp(page, 'Tasks');

  await page.goto(homeUrl);
  const title = `Buy milk ${Date.now()}`;
  const composer = page.getByRole('textbox', { name: 'Add a task for today' });
  await composer.fill(title);
  await composer.press('Enter');

  const done = page.getByRole('button', { name: `Mark ${title} done` });
  await expect(done).toBeVisible();
  await expect(composer).toHaveValue('');

  await done.click();
  await expect(done).toBeHidden();

  // Survives a reload: the decision was persisted, not just applied optimistically.
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Add a task for today' })).toBeVisible();
  await expect(page.getByRole('button', { name: `Mark ${title} done` })).toBeHidden();
});

test('coming-soon apps are not offered in the marketplace', async ({ page }) => {
  await signUp(page);
  await openMarketplace(page);
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Costs', exact: true })).toHaveCount(0);
});

test('the profile menu reaches Settings and Log out', async ({ page }) => {
  await signUp(page);
  const profile = page.getByRole('button', { name: /^Profile menu/ }).first();

  await profile.click();
  await page.getByRole('menuitem', { name: 'Settings' }).first().click();
  await page.waitForURL(/\/settings$/);

  await profile.click();
  await expect(page.getByRole('group', { name: 'Theme' }).first()).toBeVisible();
  await page.getByRole('menuitem', { name: 'Log out' }).first().click();
  await page.waitForURL(/\/login/);
});
