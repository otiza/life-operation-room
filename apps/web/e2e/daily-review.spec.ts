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

async function installApps(page: Page, names: string[]) {
  // By URL: on a phone the sidebar (and its Marketplace link) is collapsed.
  await page.goto(`${page.url()}/apps`);
  for (const name of names) {
    const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await card.getByRole('button', { name: 'Install' }).click();
    await expect(card.getByRole('button', { name: 'Uninstall' })).toBeVisible();
  }
}

async function addTodayTask(page: Page, title: string) {
  const composer = page.getByRole('textbox', { name: 'Add a task for today' });
  await composer.fill(title);
  await composer.press('Enter');
  await expect(page.getByRole('button', { name: `Mark ${title} done` })).toBeVisible();
}

test('review the day: done list, decisions, reflection, tomorrow, close', async ({ page }) => {
  await signUp(page);
  const homeUrl = page.url();
  await installApps(page, ['Projects', 'Tasks', 'Notes']);
  await page.goto(homeUrl);

  const stamp = Date.now();
  const finished = `Finished ${stamp}`;
  const postpone = `Postpone ${stamp}`;
  await addTodayTask(page, finished);
  await addTodayTask(page, postpone);
  await page.getByRole('button', { name: `Mark ${finished} done` }).click();
  await expect(page.getByText('1 of 2 done')).toBeVisible();

  await page.getByRole('button', { name: 'Review day' }).first().click();
  await page.waitForURL(/\/review$/);

  const doneStep = page.getByRole('region', { name: 'What got done' });
  await expect(doneStep.getByText(finished)).toBeVisible();

  await page.getByRole('button', { name: `Tomorrow: ${postpone}` }).click();
  await expect(page.getByText('Nothing left open on today.')).toBeVisible();
  const tomorrowStep = page.getByRole('region', { name: 'Look at tomorrow' });
  await expect(tomorrowStep.getByText(postpone)).toBeVisible();

  const planned = `Planned ${stamp}`;
  const tomorrowInput = page.getByRole('textbox', { name: 'Add a task for tomorrow' });
  await tomorrowInput.fill(planned);
  await tomorrowInput.press('Enter');
  await expect(tomorrowStep.getByText(planned)).toBeVisible();

  const reflection = page.getByRole('textbox', { name: 'Reflection for today' });
  await reflection.fill('A calm, focused day.');
  await page.getByRole('button', { name: 'Save reflection' }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Reflection for today' })).toHaveValue('A calm, focused day.');

  await page.getByRole('button', { name: 'Close the day' }).click();
  await page.waitForURL(/\/w\/[^/]+$/);
  await expect(page.getByRole('button', { name: 'Day closed. Open the review' })).toBeVisible();
});

test('review page fits a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page);
  const homeUrl = page.url();
  await installApps(page, ['Projects', 'Tasks']);
  await page.goto(homeUrl);
  await addTodayTask(page, `A fairly long task title to test wrapping ${Date.now()}`);
  await page.goto(`${homeUrl}/review`);
  await expect(page.getByRole('heading', { name: 'Review your day' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
