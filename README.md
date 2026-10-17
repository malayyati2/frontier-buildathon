# Frontier — Small Business OS

Frontier is a buildathon MVP for small-business owners who need one calm place to see cash, outstanding invoices, customer follow-ups, and the next action to take.

## What is implemented

- **Tenant-scoped workspaces:** Acme Services and Northwind Studio demonstrate that dashboard data, assistant answers, imports, and exports stay inside the selected business.
- **Deterministic money center:** cash, monthly revenue, expenses, receivables, partial invoice payments, and overdue invoices use integer minor units rather than floating-point arithmetic.
- **Follow-up list:** create, complete, reopen, filter, assign to a customer, and set a due date/priority.
- **Safe CSV center:** import customers, invoices, ledger entries, and tasks with row validation, duplicate skipping by stable IDs, a 2 MB upload limit, and all-or-nothing failure behavior. Export the current tenant only.
- **Central assistant:** a controlled intent router answers supported questions from local records and includes source IDs. It does not execute arbitrary SQL, call an LLM, or invent an answer.
- **Honest integration boundary:** Google Business Profile, Google Sheets, and external AI provider cards explain the next step without claiming a connection exists.
- **Local persistence:** demo records and changes persist in browser `localStorage` and the app works offline after the assets are loaded.

This is an explicitly labeled local demo environment, not a production SaaS backend. It is intentionally the first milestone: prove trustworthy tenant-scoped business data and useful deterministic operations before adding authentication, PostgreSQL, OAuth, background jobs, and official Google APIs.

## Run it

Requires Node.js 22 LTS or newer.

```sh
cd frontier-buildathon
npm install
npm run dev
```

Open the Vite URL (normally [http://localhost:5174](http://localhost:5174)). The app seeds clearly labeled demo data on first run. Use **Reset demo** in the bottom-right corner to restore the original local records.

## Checks

```sh
npm test
npm run build
npm run preview
```

`npm test` runs a dependency-free Node test suite covering tenant isolation, integer money calculations, overdue invoice logic, assistant routing, CSV validation, duplicate-safe import, and tenant-scoped export.

## CSV import shape

The easiest way to get a valid template is to use **Import & export → Export workspace CSV** and edit the resulting file. Supported `record_type` values are `customer`, `invoice`, `ledger`, and `task`. Important columns include:

```text
record_type,external_id,name,email,status,customer_id,number,issue_date,due_date,amount,entry_type,effective_date,description,title,notes,priority
```

Use stable `external_id` values for repeatable imports. A duplicate is skipped; it is not silently overwritten. Invalid rows reject the whole import and show the row-level reason.

## Architecture and next milestone

The UI calls small domain modules rather than embedding business logic in components:

- `src/lib/domain.js` — tenant filtering, money calculations, task windows, and the constrained assistant router.
- `src/lib/csv.js` — safe CSV parsing, validation, import, and export.
- `src/lib/storage.js` — versioned local persistence boundary.
- `src/data/demoData.js` — demo-only records, isolated from the existing Malay Tyres project.

Recommended next milestone: add a FastAPI or TypeScript API with PostgreSQL, secure sessions, organization/business membership tables, server-side tenant authorization, migrations, audit events, and a Google OAuth integration service. Keep the deterministic domain functions as the reference behavior and add contract tests before wiring external actions.

## Existing workspace safety

This project is a new sibling at `frontier-buildathon/`. It does not import Malay Tyres assets, data, credentials, or dependencies. No Google account, review, lead, payment, or business record has been fabricated as a connected external record; the visible records are explicitly demo data.
