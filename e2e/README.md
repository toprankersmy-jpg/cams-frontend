# E2E Tests (Playwright)

Read-only regression checks across all 6 CAMS roles: sidebar nav visibility,
dashboard rendering, no console errors on any accessible page, and that
permission-restricted routes redirect away. No task/data writes — safe to
run anytime against the production database.

## Prerequisites

Both dev servers must be running locally (Playwright will auto-start the
frontend if it isn't already up, but not the backend):

```
# terminal 1
cd cams-backend && npm run dev

# terminal 2 (optional — playwright will start this if needed)
cd cams-frontend && npm run dev
```

## Run

```
npm run test:e2e          # run the full suite headless
npm run test:e2e:report   # view the last HTML report
```

Login uses the dev-only `mock-token-<role>` bypass (see `AuthContext.jsx` /
`middleware/auth.js`), the same mechanism used for manual role-switch
testing during development. It only works when `NODE_ENV !== 'production'`.

## Expanding coverage

`roles.spec.js` encodes the expected nav item set per role from the
`CAMS.HTML` reference design (`D:\CAMS.HTML`). If a role's nav intentionally
changes, update `ROLE_EXPECTATIONS` in that file to match — don't just
delete a failing assertion, since a nav item silently disappearing is
usually a real permission regression (see the `hq_executive` / `page:centres`
gap this suite caught on its first run).
