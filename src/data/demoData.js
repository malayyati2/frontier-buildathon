export const DEMO_TENANT_ID = 'tenant-acme'

export function createDemoState() {
  return {
    version: 1,
    tenants: [
      { id: DEMO_TENANT_ID, name: 'Acme Services', currency: 'USD', timezone: 'America/New_York' },
      { id: 'tenant-northwind', name: 'Northwind Studio', currency: 'USD', timezone: 'America/New_York' },
    ],
    customers: [
      { id: 'customer-ava', tenantId: DEMO_TENANT_ID, externalId: 'AC-001', name: 'Ava Patel', email: 'ava@example.com', status: 'active' },
      { id: 'customer-noah', tenantId: DEMO_TENANT_ID, externalId: 'AC-002', name: 'Noah Williams', email: 'noah@example.com', status: 'active' },
      { id: 'customer-mia', tenantId: 'tenant-northwind', externalId: 'NW-001', name: 'Mia Chen', email: 'mia@example.com', status: 'active' },
    ],
    invoices: [
      { id: 'invoice-ac-1042', tenantId: DEMO_TENANT_ID, customerId: 'customer-ava', externalId: 'AC-1042', number: 'AC-1042', issueDate: '2026-09-19', dueDate: '2026-10-04', amountMinor: 248000, status: 'open' },
      { id: 'invoice-ac-1048', tenantId: DEMO_TENANT_ID, customerId: 'customer-noah', externalId: 'AC-1048', number: 'AC-1048', issueDate: '2026-10-08', dueDate: '2026-10-23', amountMinor: 96000, status: 'open' },
      { id: 'invoice-nw-2031', tenantId: 'tenant-northwind', customerId: 'customer-mia', externalId: 'NW-2031', number: 'NW-2031', issueDate: '2026-10-01', dueDate: '2026-10-15', amountMinor: 150000, status: 'open' },
    ],
    ledgerEntries: [
      { id: 'ledger-ac-income-1', tenantId: DEMO_TENANT_ID, entryType: 'income', direction: 'credit', amountMinor: 185000, effectiveDate: '2026-10-03', description: 'Website maintenance retainer', customerId: 'customer-ava', source: 'system' },
      { id: 'ledger-ac-payment-1', tenantId: DEMO_TENANT_ID, entryType: 'payment_received', direction: 'credit', amountMinor: 72000, effectiveDate: '2026-10-10', description: 'Part payment for AC-1036', customerId: 'customer-noah', invoiceId: 'invoice-ac-1048', source: 'system' },
      { id: 'ledger-ac-expense-1', tenantId: DEMO_TENANT_ID, entryType: 'expense', direction: 'debit', amountMinor: 42000, effectiveDate: '2026-10-07', description: 'Contractor payout', source: 'system' },
      { id: 'ledger-ac-expense-2', tenantId: DEMO_TENANT_ID, entryType: 'expense', direction: 'debit', amountMinor: 18000, effectiveDate: '2026-09-30', description: 'Workspace subscription', source: 'system' },
      { id: 'ledger-nw-income-1', tenantId: 'tenant-northwind', entryType: 'income', direction: 'credit', amountMinor: 315000, effectiveDate: '2026-10-04', description: 'Brand identity project', customerId: 'customer-mia', source: 'system' },
      { id: 'ledger-nw-expense-1', tenantId: 'tenant-northwind', entryType: 'expense', direction: 'debit', amountMinor: 78000, effectiveDate: '2026-10-06', description: 'Freelancer payout', source: 'system' },
    ],
    tasks: [
      { id: 'task-ava', tenantId: DEMO_TENANT_ID, customerId: 'customer-ava', invoiceId: 'invoice-ac-1042', title: 'Call Ava about the overdue invoice', notes: 'Confirm the revised payment date.', dueDate: '2026-10-16', priority: 'high', status: 'open', createdAt: '2026-10-12T09:00:00.000Z' },
      { id: 'task-noah', tenantId: DEMO_TENANT_ID, customerId: 'customer-noah', title: 'Send project check-in', notes: 'Ask for feedback on the new booking flow.', dueDate: '2026-10-20', priority: 'normal', status: 'open', createdAt: '2026-10-13T09:00:00.000Z' },
      { id: 'task-mia', tenantId: 'tenant-northwind', customerId: 'customer-mia', title: 'Share first concept review', notes: '', dueDate: '2026-10-18', priority: 'normal', status: 'open', createdAt: '2026-10-12T09:00:00.000Z' },
    ],
    auditLog: [
      { id: 'audit-1', tenantId: DEMO_TENANT_ID, action: 'Demo workspace created', detail: 'Seeded local records for the buildathon walkthrough.', createdAt: '2026-10-16T08:30:00.000Z' },
    ],
  }
}
