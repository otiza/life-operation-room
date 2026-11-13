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
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) });
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

test('the Home masthead shows the date and the next event', async ({ page }) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  // A fixed mid-morning clock keeps "next" on the same day whenever the suite runs.
  const today = new Date();
  const at = (hours: number, minutes = 0) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
  await page.clock.setFixedTime(at(10, 35));

  await signUp(page);
  const workspaceId = page.url().split('/w/')[1];
  const install = await page.request.post(`${API_URL}/workspaces/${workspaceId}/apps/install`, {
    data: { appKey: 'calendar' },
  });
  expect(install.ok()).toBeTruthy();
  const title = `Design review ${Date.now()}`;
  const created = await page.request.post(`${API_URL}/workspaces/${workspaceId}/calendar/events`, {
    data: {
      title,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isAllDay: false,
      startAt: at(11).toISOString(),
      endAt: at(12).toISOString(),
    },
  });
  expect(created.ok()).toBeTruthy();

  await page.reload();
  const masthead = page.getByTestId('today-masthead');
  await expect(masthead.getByRole('heading', { level: 1 })).toContainText(
    at(10, 35).toLocaleDateString('en-US', { weekday: 'long' }),
  );
  const next = masthead.getByTestId('masthead-next');
  await expect(next).toContainText(title);
  await expect(next).toContainText('in 25 min');
});
