import { createId } from './storage.js'
import { toMinorUnits } from './domain.js'

export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; continue }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row)
      row = []; cell = ''; continue
    }
    cell += char
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some((value) => value !== '')) rows.push(row) }
  if (!rows.length) return []
  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/\s+/g, '_'))
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function escapeCsv(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function exportTenantCsv(state, tenantId) {
  const customers = state.customers.filter((row) => row.tenantId === tenantId).map((row) => ({ record_type: 'customer', id: row.id, external_id: row.externalId, name: row.name, email: row.email, status: row.status }))
  const invoices = state.invoices.filter((row) => row.tenantId === tenantId).map((row) => ({ record_type: 'invoice', id: row.id, external_id: row.externalId, customer_id: row.customerId, number: row.number, issue_date: row.issueDate, due_date: row.dueDate, amount: (row.amountMinor / 100).toFixed(2), status: row.status }))
  const ledger = state.ledgerEntries.filter((row) => row.tenantId === tenantId).map((row) => ({ record_type: 'ledger', id: row.id, external_id: row.externalId, entry_type: row.entryType, amount: (row.amountMinor / 100).toFixed(2), effective_date: row.effectiveDate, description: row.description, invoice_id: row.invoiceId, customer_id: row.customerId }))
  const tasks = state.tasks.filter((row) => row.tenantId === tenantId).map((row) => ({ record_type: 'task', id: row.id, external_id: row.externalId, customer_id: row.customerId, invoice_id: row.invoiceId, title: row.title, notes: row.notes, due_date: row.dueDate, priority: row.priority, status: row.status }))
  const records = [...customers, ...invoices, ...ledger, ...tasks]
  const headers = ['record_type', 'id', 'external_id', 'name', 'email', 'status', 'customer_id', 'invoice_id', 'number', 'issue_date', 'due_date', 'amount', 'entry_type', 'effective_date', 'description', 'title', 'notes', 'priority']
  return [headers.join(','), ...records.map((record) => headers.map((header) => escapeCsv(record[header])).join(','))].join('\n')
}

function required(row, field) {
  return String(row[field] || '').trim()
}

export function importTenantCsv(state, tenantId, text) {
  const rows = parseCsv(text)
  if (!rows.length) throw new Error('The CSV has no data rows.')
  const next = structuredClone(state)
  const errors = []
  let imported = 0
  let skipped = 0
  rows.forEach((row, index) => {
    const line = index + 2
    const type = required(row, 'record_type').toLowerCase()
    try {
      if (!['customer', 'invoice', 'ledger', 'task'].includes(type)) throw new Error('record_type must be customer, invoice, ledger, or task')
      const externalId = required(row, 'external_id') || required(row, 'id')
      if (type === 'customer') {
        const name = required(row, 'name'); if (!name) throw new Error('name is required')
        const duplicate = next.customers.find((item) => item.tenantId === tenantId && externalId && (item.externalId === externalId || item.id === externalId))
        if (duplicate) { skipped += 1; return }
        next.customers.push({ id: externalId || createId('customer'), tenantId, externalId: externalId || undefined, name, email: required(row, 'email'), status: required(row, 'status') || 'active' })
      }
      if (type === 'invoice') {
        const number = required(row, 'number'); const customerId = required(row, 'customer_id'); if (!number || !customerId) throw new Error('number and customer_id are required')
        if (!next.customers.some((item) => item.tenantId === tenantId && item.id === customerId)) throw new Error('customer_id must belong to this workspace')
        const amountMinor = toMinorUnits(required(row, 'amount')); const dueDate = required(row, 'due_date'); if (!dueDate) throw new Error('due_date is required')
        if (next.invoices.some((item) => item.tenantId === tenantId && externalId && (item.externalId === externalId || item.id === externalId))) { skipped += 1; return }
        next.invoices.push({ id: externalId || createId('invoice'), tenantId, externalId: externalId || undefined, customerId, number, issueDate: required(row, 'issue_date') || dueDate, dueDate, amountMinor, status: required(row, 'status') || 'open' })
      }
      if (type === 'ledger') {
        const entryType = required(row, 'entry_type'); const amountMinor = toMinorUnits(required(row, 'amount')); const effectiveDate = required(row, 'effective_date'); if (!entryType || !effectiveDate) throw new Error('entry_type and effective_date are required')
        if (next.ledgerEntries.some((item) => item.tenantId === tenantId && externalId && (item.externalId === externalId || item.id === externalId))) { skipped += 1; return }
        next.ledgerEntries.push({ id: externalId || createId('ledger'), tenantId, externalId: externalId || undefined, entryType, direction: ['expense', 'refund'].includes(entryType) ? 'debit' : 'credit', amountMinor, effectiveDate, description: required(row, 'description'), invoiceId: required(row, 'invoice_id') || undefined, customerId: required(row, 'customer_id') || undefined, source: 'import' })
      }
      if (type === 'task') {
        const title = required(row, 'title'); const dueDate = required(row, 'due_date'); if (!title || !dueDate) throw new Error('title and due_date are required')
        if (next.tasks.some((item) => item.tenantId === tenantId && externalId && (item.externalId === externalId || item.id === externalId))) { skipped += 1; return }
        next.tasks.push({ id: externalId || createId('task'), tenantId, externalId: externalId || undefined, customerId: required(row, 'customer_id') || undefined, invoiceId: required(row, 'invoice_id') || undefined, title, notes: required(row, 'notes'), dueDate, priority: required(row, 'priority') || 'normal', status: required(row, 'status') || 'open', createdAt: new Date().toISOString() })
      }
      imported += 1
    } catch (error) { errors.push(`Row ${line}: ${error.message}`) }
  })
  if (errors.length) throw new Error(`${errors.length} row${errors.length === 1 ? '' : 's'} failed validation. No rows were imported.\n${errors.join('\n')}`)
  return { state: next, imported, skipped }
}
