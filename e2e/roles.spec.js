import { test, expect } from '@playwright/test';

// Mirrors CAMS.HTML's per-role NAV config — the pages each role must be able to reach.
// Presence-only checks (not exact-set) since a real DB user with is_admin=true (e.g. the
// current leadership seed user) legitimately sees a superset of their role's normal nav.
const ROLE_EXPECTATIONS = {
  hq_executive: {
    heading: 'HQ Executive Dashboard',
    navItems: ['Dashboard', 'My Tasks', 'All Tasks', 'Centres'],
    forbiddenPaths: ['/kanban', '/admin'],
  },
  hq_manager: {
    heading: 'HQ Manager Approvals Portal',
    navItems: ['Dashboard', 'Pending Approval', 'My Department', 'Centres'],
    forbiddenPaths: ['/kanban', '/admin'],
  },
  rm: {
    heading: 'Regional Operations Hub',
    navItems: ['Dashboard', 'Set Priority', 'My Region', 'Centres'],
    forbiddenPaths: ['/admin'],
  },
  centre_head: {
    heading: 'Centre Head Management Portal',
    navItems: ['Dashboard', 'My Basket', 'Kanban Board', 'Delegate Task'],
    forbiddenPaths: ['/reports', '/admin'],
  },
  centre_executive: {
    heading: 'My Assigned Workstation',
    navItems: ['Dashboard', 'My Assigned', 'Kanban Board'],
    forbiddenPaths: ['/reports', '/delegate', '/admin'],
  },
  leadership: {
    heading: 'Executive Leadership Cockpit',
    navItems: ['Dashboard', 'All Tasks', 'Centres', 'Reports'],
    forbiddenPaths: [],
  },
};

async function loginAs(page, role) {
  await page.goto('/login');
  await page.evaluate((r) => localStorage.setItem('cams_token', `mock-token-${r}`), role);
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

for (const [role, expectations] of Object.entries(ROLE_EXPECTATIONS)) {
  test.describe(`role: ${role}`, () => {
    test(`sidebar nav shows expected pages and dashboard renders`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await loginAs(page, role);

      // Dashboard heading matches role
      await expect(page.getByRole('heading', { name: expectations.heading })).toBeVisible();

      // Expected nav items are present
      const nav = page.getByRole('navigation');
      for (const item of expectations.navItems) {
        await expect(nav.getByRole('link', { name: item })).toBeVisible();
      }

      expect(consoleErrors, `console errors on dashboard for ${role}: ${consoleErrors.join('; ')}`).toEqual([]);
    });

    test(`every visible nav link renders without console errors`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`${page.url()}: ${msg.text()}`);
      });

      await loginAs(page, role);

      const nav = page.getByRole('navigation');
      const links = await nav.getByRole('link').all();
      const hrefs = [];
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href) hrefs.push(href);
      }

      for (const href of hrefs) {
        await page.goto(href);
        await page.waitForLoadState('networkidle');
        // Page must render real content, not a blank crash (React error boundary => empty body)
        const mainText = await page.locator('main, #root').first().innerText().catch(() => '');
        expect(mainText.trim().length, `page ${href} rendered empty for role ${role}`).toBeGreaterThan(0);
      }

      expect(consoleErrors, `console errors while visiting nav pages for ${role}: ${consoleErrors.join('; ')}`).toEqual([]);
    });

    for (const forbiddenPath of expectations.forbiddenPaths) {
      test(`cannot access ${forbiddenPath} (redirects away)`, async ({ page }) => {
        await loginAs(page, role);
        await page.goto(forbiddenPath);
        await page.waitForLoadState('networkidle');
        expect(page.url(), `${role} should not stay on ${forbiddenPath}`).not.toContain(forbiddenPath);
      });
    }
  });
}
