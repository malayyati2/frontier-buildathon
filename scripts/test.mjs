import assert from 'node:assert/strict'
import { createDemoState } from '../src/data/demoData.js'
import { answerQuestion, getMetrics, invoiceOutstandingMinor, toMinorUnits } from '../src/lib/domain.js'
import { exportTenantCsv, importTenantCsv } from '../src/lib/csv.js'

const state = createDemoState()
const acme = getMetrics(state, 'tenant-acme', '2026-10-16')
const northwind = getMetrics(state, 'tenant-northwind', '2026-10-16')

assert.equal(toMinorUnits('12.34'), 1234)
assert.equal(toMinorUnits('$1,000.00'), 100000)
assert.equal(acme.cashMinor, 197000)
assert.equal(acme.revenueMinor, 257000)
assert.equal(acme.expensesMinor, 42000)
assert.equal(acme.arMinor, 272000)
assert.equal(acme.overdueInvoices.length, 1)
assert.equal(invoiceOutstandingMinor(state, state.invoices[0], 'tenant-acme'), 248000)
assert.equal(northwind.cashMinor, 237000)

const overdue = answerQuestion(state, 'tenant-acme', 'Which invoices are overdue?')
assert.equal(overdue.intent, 'overdue_invoices')
assert.match(overdue.answer, /AC-1042/)
assert.doesNotMatch(overdue.answer, /NW-2031/)
const unsupported = answerQuestion(state, 'tenant-acme', 'Should I hire an employee?')
assert.equal(unsupported.intent, 'unsupported')
const cash = answerQuestion(state, 'tenant-acme', 'How much cash do we have?')
assert.match(cash.answer, /Acme Services/)
assert.match(cash.answer, /\$1,970\.00/)

const exported = exportTenantCsv(state, 'tenant-acme')
assert.match(exported, /AC-1042/)
assert.doesNotMatch(exported, /NW-2031/)
const imported = importTenantCsv({ ...state, customers: [], invoices: [], ledgerEntries: [], tasks: [] }, 'tenant-acme', [
  'record_type,external_id,name,email,status,customer_id,number,issue_date,due_date,amount,entry_type,effective_date,description,title,notes,priority',
  ['customer', 'C-100', 'Imported Person', 'person@example.com', 'active', '', '', '', '', '', '', '', '', '', '', ''].join(','),
  ['invoice', 'I-100', '', '', 'open', 'C-100', 'I-100', '2026-10-16', '2026-10-30', '10.50', '', '', '', '', '', ''].join(','),
  ['ledger', 'L-100', '', '', '', '', '', '', '', '10.00', 'income', '2026-10-16', 'Imported payment', '', '', ''].join(','),
  ['task', 'T-100', '', '', '', 'C-100', '', '', '2026-10-20', '', '', '', '', 'Call imported person', 'Ask about renewal', 'normal'].join(','),
].join('\n'))
assert.equal(imported.imported, 4)
assert.equal(imported.state.invoices[0].amountMinor, 1050)
assert.equal(imported.state.ledgerEntries[0].amountMinor, 1000)
assert.throws(() => importTenantCsv({ ...state }, 'tenant-acme', 'record_type,name\ncustomer,'), /failed validation/)

console.log('Frontier MVP tests passed: tenant isolation, money math, assistant routing, CSV import/export.')
