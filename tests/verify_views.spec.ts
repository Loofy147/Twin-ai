import { test, expect } from '@playwright/test';

test('verify all main views', async ({ page }) => {
  // Navigation to Home
  await page.goto('http://localhost:5173/');
  await expect(page.locator('text=Home')).toBeVisible();
  await page.screenshot({ path: '/home/jules/verification/home_view.png' });

  // Navigation to Questions
  await page.click('text=Questions');
  await expect(page.locator('text=Daily Questions')).toBeVisible();
  await page.screenshot({ path: '/home/jules/verification/questions_view_check.png' });

  // Navigation to Analytics
  await page.click('text=Analytics');
  await expect(page.locator('text=Analytics Overview')).toBeVisible();
  await page.screenshot({ path: '/home/jules/verification/analytics_view.png' });

  // Navigation to Integrations
  await page.click('text=Integrations');
  await expect(page.locator('text=External Integrations')).toBeVisible();
  await page.screenshot({ path: '/home/jules/verification/integrations_view.png' });
});
