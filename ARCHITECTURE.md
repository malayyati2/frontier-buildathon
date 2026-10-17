# Frontier Buildathon — inspection and milestone checklist

## Repository inspection

The supplied workspace already contains a separate Malay Tyres React/Vite web experience and related workbooks/assets. It does not contain a business-management backend, authenticated multi-tenant data model, Google OAuth flow, Google Business Profile connector, Google Sheets sync, ledger service, or staff/follow-up application. The root also has no shared `package.json`.

The existing Malay Tyres project is therefore left untouched. Frontier is a new sibling project with its own package manifest, lockfile, build output, data modules, and checks. No Malay Tyres business data, imagery, credentials, or customer records are imported.

## Chosen first milestone

**Local-first owner operations dashboard.** This is the smallest complete, demonstrable slice that establishes the platform’s trust boundary before external integrations:

1. Select one of two explicitly demo workspaces.
2. Derive cash, revenue, expenses, receivables, overdue invoices, and follow-up metrics from persisted source records.
3. Create/complete/reopen follow-up tasks and record money movements.
4. Import and export the selected tenant’s records as CSV with duplicate and row-validation rules.
5. Ask a constrained assistant questions that route to deterministic functions and cite source IDs.
6. Show honest integration placeholders instead of fake Google/AI success.

## Implementation checklist

### Complete in this milestone

- [x] New isolated React/Vite project.
- [x] Versioned local persistence boundary.
- [x] Tenant IDs on business-owned records.
- [x] Integer minor-unit money calculations.
- [x] Tenant-scoped dashboard, ledger, invoices, tasks, import, and export.
- [x] Controlled assistant router; no arbitrary SQL or external model calls.
- [x] Audit entries for local data changes.
- [x] Responsive/mobile navigation and reduced-motion CSS.
- [x] Test coverage for tenant boundaries, money math, routing, import/export.
- [x] Setup and limitation documentation.

### Required before production use

- [ ] Secure registration, sessions, MFA/recovery, and organization/business membership tables.
- [ ] PostgreSQL schema and migrations with server-side tenant authorization on every query.
- [ ] Encrypted secret/token storage, rate limits, CSRF/XSS protections, structured logging, backups, and restore tests.
- [ ] Background jobs and idempotency keys for imports, exports, and synchronization.
- [ ] Official Google OAuth, Google Sheets/Drive, and eligible Google Business Profile APIs with least-privilege scopes.
- [ ] Approval records and receipts for publishing review replies or sending messages.
- [ ] XLSX/PDF parsing and export in a server-side quarantine/processing boundary.
- [ ] Usage/AI/API quotas, cost reporting, and configurable model/provider routing.
- [ ] Role-specific owner, manager, and staff permissions.

## Actual checks

Run from `frontier-buildathon/`:

```text
npm test       # passed: domain and CSV behavior
npm run build  # passed: Vite production bundle
```

The dev server was started on `http://127.0.0.1:5174` and returned HTTP 200. External Google credentials, accounts, API access, and live business records were not available and were not fabricated.
