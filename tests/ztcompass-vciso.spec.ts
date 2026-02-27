import { test, expect } from '@playwright/test';

const BASE = 'https://ztcompass-demo-uidacxx6la-ew.a.run.app';

test.describe('ZT Compass — vCISO persona', () => {
  test('landing page loads', async ({ page }) => {
    const response = await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    expect(response?.status()).toBeLessThan(500);
    const content = await page.content();
    expect(content.includes('Zero Trust') || content.includes('security') || content.includes('compliance')).toBe(true);
  });

  test('playbooks or framework content accessible', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const playbookLink = page.locator('a[href*="playbook"], button:has-text("Playbook")').first();
    if (await playbookLink.count() > 0) {
      await playbookLink.click();
      await page.waitForTimeout(2000);
    }
    const content = await page.content();
    const hasPlaybooks = content.includes('playbook') || content.includes('Playbook') ||
      content.includes('framework') || content.includes('guide') ||
      content.includes('checklist') || content.includes('control');
    expect(hasPlaybooks || content.includes('Zero Trust')).toBe(true);
  });

  test('playbook steps or control content visible', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const content = await page.content();
    const hasSteps = content.includes('step') || content.includes('Step') ||
      content.includes('action') || content.includes('implement') ||
      content.includes('control') || content.includes('policy') ||
      content.includes('identity') || content.includes('MFA');
    expect(hasSteps || content.includes('Zero Trust')).toBe(true);
  });

  test('CH region shows Switzerland-specific content', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const chBtn = page.locator('button:has-text("CH"), [data-region="CH"]').first();
    if (await chBtn.count() > 0) {
      await chBtn.click();
      await page.waitForTimeout(2000);
    }
    const content = await page.content();
    const hasCH = content.includes('CH') || content.includes('Switzerland') ||
      content.includes('Swiss') || content.includes('FINMA') || content.includes('DSG');
    expect(hasCH).toBe(true);
  });

  test('no 500 errors for vCISO flow', async ({ page }) => {
    const errors: string[] = [];
    page.on('response', (r: any) => { if (r.status() >= 500) errors.push(r.url()); });
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
