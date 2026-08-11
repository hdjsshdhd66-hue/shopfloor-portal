# IT Handover — Shop Floor Digital Portal (pladis KSA)

**App version:** `1.0` · **Build:** `v93` · **Service worker cache:** `v93`
**Document date:** 2026-08-11

---

## 1. System

**Shop Floor Digital Portal** — a five-portal operations application for pladis KSA factory
teams: **Quality, Safety, Maintenance, Production, Visitor Management**. Covers line
checklists, metal detector / check-weigher logs, NCRs, Near Miss / Incident Investigation,
Risk Assessment, CAPA, permits-to-work, PM schedules, work orders, production/downtime
logging, and portal dashboards.

## 2. Current status

**Production-ready frontend, pilot architecture.** The UI/UX, forms, calculations and
portal workflows are complete and stable. The application currently runs entirely
**client-side** — there is no backend server, no central database, and no server-side
authentication. It is suitable for a single-site pilot as-is, but **enterprise IT
integration is required before this can be treated as the company's system of record.**

> **This is the single most important fact in this document.** Client-side/local
> authentication and browser `localStorage` are **pilot/offline-operation conveniences,
> not the final security or database architecture.** No production rollout, multi-site
> deployment, or audit-sensitive use should proceed on the current storage/auth model
> without the backend work described below.

---

## 3. Current frontend architecture

- **Single static file**: `index.html` — all HTML, CSS and JavaScript are inline in one
  file (~2 MB). No build step, bundler, or framework (no React/Vue/webpack). Edits are
  made directly to this file and deployed as a static asset.
- **Third-party libraries** (vendored, no CDN/network dependency): `xlsx.full.min.js`
  (Excel export), `qrcode.min.js`, `JsBarcode.all.min.js`.
- **No server-rendering, no API calls today** — every screen renders from in-memory
  JavaScript state that is persisted to and rehydrated from `localStorage`
  (`DATA_SCHEMA_VERSION = 1`, written through a `safeSetItem()` wrapper).
- **Role-based UI gating is client-side only**: a `ROLE_ACCESS` JavaScript object maps
  each role name to an allowed list of view IDs, enforced inside the single `nav(v)`
  routing function. This restricts what a user *sees* in the browser; it is **not** a
  security boundary, since all code and data for every portal ships to every client.

## 4. PWA files and service worker

- `manifest.json` — installable PWA metadata (icons, standalone display, theme colors).
- `service-worker.js` — caches the app shell and static assets
  (`CACHE_NAME = 'shopfloor-cache-' + CACHE_VERSION`, currently `v93`).
  - **App shell (`index.html`) uses network-first**: an online client always fetches the
    latest deploy and only falls back to the cached copy when offline. This means most
    deploys reach installed devices automatically without needing a cache-version bump.
  - **Static assets** (icons, vendored libraries, brand/splash images) use
    cache-first-with-background-refresh — appropriate since they rarely change.
  - Old cache buckets are deleted on `activate`, keyed off `CACHE_VERSION`.

## 5. Required production hosting

Currently served as a **static site via GitHub Pages** with a custom domain (`CNAME` →
`shopfloordigitaloperation.com`). This is adequate for a pilot but not for enterprise
production:

- IT should host the static bundle (`index.html`, `manifest.json`, `service-worker.js`,
  icons, images, vendored JS) behind the company's standard web infrastructure
  (reverse proxy / CDN / internal web server), with its own deployment pipeline.
- No server-side rendering or app-server process is required for the **frontend
  itself** — it can continue to be served as static files — but see §8–§9 for the
  backend services that must sit alongside it.

## 6. HTTPS requirement

**Mandatory for production.** The app already reads `location.protocol` and expects
`https:` (see the readiness check `HTTPS recommended for production` in the in-app IT
Integration panel). Plain HTTP must not be used for any authenticated or factory-data
traffic. Enforce HTTPS (redirect HTTP→HTTPS, HSTS) at the hosting/reverse-proxy layer.

## 7. Server-side authentication / SSO requirement

**Current state (pilot only):** each portal has a single shared password, hashed and
checked entirely in the browser (`authVerifyLocal()` against portal-scoped hash
constants). There is no per-user login, no server session, no password rotation/reset
flow, and no SSO.

**Client is already prepared for this to change**, but the server side does not exist
yet:
- An `authMode` config (`local | server | sso`) and adapter functions
  (`authVerifyServer()`, `authVerifyCredentials()`) already exist client-side and will
  `POST` to `/auth/login` or `/auth/sso/exchange` once `apiBaseUrl` is configured.
- An access token, once returned by a real backend, is held in `sessionStorage` and sent
  as `Authorization: Bearer …` on API calls.

**IT must build:** real per-user authentication (ideally SSO against the corporate IdP —
Azure AD / Okta / etc.), issuing short-lived tokens the frontend can consume via the
adapter above. Until that exists, treat every "login" in this app as a shared PIN, not an
identity.

## 8. Central database requirement

**Current state:** none. All records (checklists, NCRs, Near Miss, Risk Assessments,
CAPA, permits, production logs, etc.) live only in the browser's `localStorage` **on the
device that created them.** Nothing is shared across devices or browsers unless someone
manually exports/imports a file.

**IT must build:** a central database (and the API in front of it — see §9) as the
system of record. This is the single biggest gap between "pilot" and "production."

## 9. API integration layer

A thin client-side API wrapper already exists (`apiRequest()`), sending
`Content-Type`, `X-Device-Id`, `X-Tenant-Id`, and `X-App-Build` headers plus a bearer
token when present. It currently has **no backend to talk to** — `apiBaseUrl` is empty
by default. Endpoints the client already expects, if IT stands up a matching API:

| Purpose            | Method & path                       |
|---------------------|--------------------------------------|
| Health check         | `GET /health`                        |
| Local/portal login   | `POST /auth/login`                   |
| SSO token exchange   | `POST /auth/sso/exchange`            |
| Push offline queue    | `POST /sync/push`                    |
| Pull server changes   | `GET /sync/pull?since=…&deviceId=…`  |
| Ship an audit event  | `POST /audit/events`                 |

These are **client intentions, not a ratified contract** — IT/dev should agree the real
request/response schemas, error format, and auth requirements before implementation
(the in-app panel refers to this as `API-CONTRACT.md`, still to be written jointly).

## 10. Central device synchronization

**Current state:** a client-only "Sync Center" (Wave 3) supports manual, file-based
export/import between devices (an offline queue a supervisor can hand-carry via a JSON
file), plus best-effort `syncPushToServer()` / `syncPullFromServer()` calls (Wave 4) that
activate once `syncMode` is set to `server`/`hybrid` and a real `apiBaseUrl` exists.
**No automatic multi-device sync happens today** — two tablets on the same line do not
see each other's records until IT's server-sync backend exists.

## 11. Role Based Access Control / Permission Matrix

The `ROLE_ACCESS` object (one entry per role: Quality Manager, HSE Officer, Maintenance
Technician, Production Manager, Operator, etc.) lists the view IDs each role may open,
enforced client-side in `nav()`. This is a good **starting point for a real permission
matrix** but must be re-implemented as **server-side authorization** once real
authentication exists — a client-side allow-list is a UX convenience, not a security
control, since the underlying data and code are already present in every browser.

## 12. Server-side audit logging

**Current state:** a client-side ring buffer (`auditLogEvent()`, capped at 500 events,
stored under a `localStorage` key) records actions like config changes, sync
push/pull, and handoff exports, with a best-effort remote `POST /audit/events` when
server sync is enabled. **This is not a durable or tamper-resistant audit log** — it
lives in the same browser storage as everything else and is lost on a cleared cache or
a new device.

**IT must build:** durable, server-side audit logging (who did what, when, from which
device/portal) as part of the backend, satisfying whatever compliance/traceability
requirement applies to Safety/Quality records (Risk Assessments, NCRs, Incident
Investigations, CAPA).

## 13. Security headers / CSP / frame-ancestors

`index.html` already ships a restrictive CSP via `<meta http-equiv="Content-Security-
Policy">` (`default-src 'self'`, no third-party script/style origins, `object-src
'none'`, image/connect allowances scoped narrowly). **Important limitation, already
called out in-code:** a `<meta>` CSP tag **cannot** carry `frame-ancestors`, and no
`<meta>` tag can set `X-Frame-Options`. Real clickjacking protection, plus any other
response-header-only security controls (HSTS, `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, a server-delivered CSP that also sets `frame-ancestors`), must be
added by IT **at the hosting/reverse-proxy layer** — they cannot be done from inside
the HTML file.

## 14. Backup and disaster recovery

**Current state:** none, beyond manual per-portal Excel/JSON export buttons a user can
trigger themselves. Because all data lives in individual browsers' `localStorage`,
there is no automated backup, no retention policy, and no recovery path if a device is
lost, reset, or has its browser data cleared.

**IT must build:** this becomes straightforward once §8's central database exists —
standard DB backup/retention/DR practices apply. Until then, treat every device's local
data as **not backed up.**

## 15. UAT environment

Not yet established. Recommend a separate hosted copy of the static frontend pointed at
a non-production `apiBaseUrl` (once the backend exists), with its own `tenantId`/
`environment: 'pilot'` config in the in-app IT Integration panel, so UAT testing never
touches production data.

## 16. Production environment

Not yet established beyond the current GitHub Pages pilot deployment. Moving to
production requires: enterprise hosting (§5) + HTTPS (§6) + real auth (§7) + central DB
(§8) + API backend (§9) + security headers (§13) + backup/DR (§14) all in place first.

## 17. Service worker cache/version management

`CACHE_VERSION` in `service-worker.js` and `APP_BUILD` in `index.html` are paired
release identifiers and should be bumped together on every deploy (see `APP_VERSION`'s
in-code comment). Because the app shell fetch strategy is network-first, a cache-version
bump is mostly a clean-break/housekeeping step (forces old cached asset buckets to be
deleted) rather than the only mechanism keeping clients current — but keeping both
numbers aligned makes it trivial for IT to confirm which build a given device is
running (visible via the in-app IT Integration panel and in exported bundle filenames).

## 18. Data migration from localStorage when backend is implemented

When the central database (§8) goes live, existing pilot data sitting in each device's
`localStorage` will need a one-time migration path:

1. Use each portal's existing Excel/JSON export functions (already built, used today for
   manual reporting) to extract local data per device.
2. Use the existing **IT Integration → Export handoff JSON** bundle
   (`exportITHandoffBundle()`) as a starting point for a device inventory / config
   snapshot (no secrets included by design).
3. IT defines an import/ingest endpoint (extending the `/sync/push` contract in §9) that
   accepts these exports and writes them into the central database, tagged with
   `deviceId`/`tenantId` for traceability.
4. `DATA_SCHEMA_VERSION` (currently `1`) and the client's `migrateDataSchema()` hook
   already exist for **local** schema evolution — the same version number should be
   carried into the migration payload so the backend can validate it's importing the
   shape it expects.

This is a one-time cutover step, not an ongoing sync mechanism — ongoing sync is §10.

---

## 19. Suggested deployment flow

```
Development  →  UAT  →  Security Review  →  Production
```

- **Development** — current state: static frontend, pilot/local auth, localStorage.
  Backend work (§7–§9) also happens here.
- **UAT** — hosted frontend copy (§15) against a non-production API/database, exercised
  by real Quality/Safety/Maintenance/Production users before go-live.
- **Security Review** — IT security sign-off covering §6 (HTTPS), §7 (auth/SSO), §9 (API
  contract/auth), §12 (audit logging), §13 (security headers/CSP/frame-ancestors), and
  §14 (backup/DR) — this pass is what turns "pilot" into "enterprise-ready."
  Also re-validate the CSP in §13 against the final `apiBaseUrl` domain (the `connect-
  src` directive will need that origin added).
- **Production** — enterprise hosting (§5), real auth, central DB, monitored backend,
  backups, and the data migration (§18) from any pilot devices still in local-only mode.

---

## 20. What this document intentionally does not cover

This is a technical handover, not a project plan — it does not assign owners, dates, or
budget. It also does not change or propose changes to any in-app business logic, form
fields, calculations (including Risk Assessment scoring), portal workflows, or
permissions — those are documented here as-is, for IT to build infrastructure around,
not to redesign.
