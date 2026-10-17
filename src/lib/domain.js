import { createId } from './storage.js'

export const TODAY = '2026-10-16'

export function toMinorUnits(input) {
  const normalized = String(input ?? '').replace(/[$,\s]/g, '')
  if (!normalized || !/^-?\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Enter a valid amount with up to two decimal places.')
  const [whole, fraction = ''] = normalized.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function formatMoney(minor, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((minor || 0) / 100)
}

export function tenantRows(state, tenantId, key) {
  return (state[key] || []).filter((row) => row.tenantId === tenantId)
}

export function customerName(state, customerId) {
  return state.customers.find((customer) => customer.id === customerId)?.name || 'Unlinked customer'
}

export function invoicePaidMinor(state, invoiceId, tenantId) {
  return tenantRows(state, tenantId, 'ledgerEntries')
    .filter((entry) => entry.invoiceId === invoiceId && entry.entryType === 'payment_received')
    .reduce((total, entry) => total + entry.amountMinor, 0)
}

export function invoiceOutstandingMinor(state, invoice, tenantId) {
  return Math.max(0, invoice.amountMinor - invoicePaidMinor(state, invoice.id, tenantId))
}

function inRange(date, start, end) {
  return date >= start && date <= end
}

export function getMetrics(state, tenantId, today = TODAY) {
  const tenant = state.tenants.find((item) => item.id === tenantId)
  const monthStart = `${today.slice(0, 7)}-01`
  const monthEnd = today
  const ledger = tenantRows(state, tenantId, 'ledgerEntries')
  const invoices = tenantRows(state, tenantId, 'invoices')
  const tasks = tenantRows(state, tenantId, 'tasks')
  const cashMinor = ledger.reduce((total, entry) => {
    if (entry.entryType === 'income' || entry.entryType === 'payment_received') return total + entry.amountMinor
    if (entry.entryType === 'expense' || entry.entryType === 'refund') return total - entry.amountMinor
    return total
  }, 0)
  const revenueMinor = ledger.filter((entry) => inRange(entry.effectiveDate, monthStart, monthEnd) && ['income', 'payment_received'].includes(entry.entryType)).reduce((total, entry) => total + entry.amountMinor, 0)
  const expensesMinor = ledger.filter((entry) => inRange(entry.effectiveDate, monthStart, monthEnd) && entry.entryType === 'expense').reduce((total, entry) => total + entry.amountMinor, 0)
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'void' && invoiceOutstandingMinor(state, invoice, tenantId) > 0)
  const overdueInvoices = openInvoices.filter((invoice) => invoice.dueDate < today)
  const arMinor = openInvoices.reduce((total, invoice) => total + invoiceOutstandingMinor(state, invoice, tenantId), 0)
  const openTasks = tasks.filter((task) => task.status === 'open')
  const start = new Date(`${today}T12:00:00`)
  const day = start.getDay() || 7
  const monday = new Date(start)
  monday.setDate(start.getDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const iso = (date) => date.toISOString().slice(0, 10)
  const dueThisWeek = openTasks.filter((task) => inRange(task.dueDate, iso(monday), iso(sunday)))
  return { tenant, cashMinor, revenueMinor, expensesMinor, arMinor, overdueInvoices, openTasks, dueThisWeek, monthStart, monthEnd }
}

export function addAudit(state, tenantId, action, detail) {
  return { ...state, auditLog: [{ id: createId('audit'), tenantId, action, detail, createdAt: new Date().toISOString() }, ...(state.auditLog || [])] }
}

export function classifyQuestion(question) {
  const text = question.trim().toLowerCase()
  if (/(cash|bank|balance)/.test(text) && !/(owe|outstanding|receivable)/.test(text)) return 'cash_balance'
  if (/(overdue|late).*(invoice|payment)|invoice.*(overdue|late)/.test(text)) return 'overdue_invoices'
  if (/(follow.?up|call|callback|reminder).*(today|week)|who.*(call|follow)/.test(text)) return 'followups_due'
  if (/(revenue|sales|income).*(month|monthly)|this month.*(revenue|sales)/.test(text)) return 'revenue_month'
  if (/(outstanding|receivable|owe us|owes us)/.test(text)) return 'accounts_receivable'
  return 'unsupported'
}

export function answerQuestion(state, tenantId, question, today = TODAY) {
  const intent = classifyQuestion(question)
  const metrics = getMetrics(state, tenantId, today)
  const tenantName = metrics.tenant?.name || 'this workspace'
  if (intent === 'cash_balance') return { intent, answer: `${tenantName} has ${formatMoney(metrics.cashMinor, metrics.tenant.currency)} in net cash based on ${tenantRows(state, tenantId, 'ledgerEntries').length} posted ledger entries.`, sources: tenantRows(state, tenantId, 'ledgerEntries').map((entry) => entry.id) }
  if (intent === 'accounts_receivable') {
    const openInvoices = tenantRows(state, tenantId, 'invoices').filter((invoice) => invoice.status !== 'void' && invoiceOutstandingMinor(state, invoice, tenantId) > 0)
    return { intent, answer: `${tenantName} has ${formatMoney(metrics.arMinor, metrics.tenant.currency)} in outstanding customer invoices across ${openInvoices.length} open records.`, sources: openInvoices.map((invoice) => invoice.number) }
  }
  if (intent === 'overdue_invoices') {
    const lines = metrics.overdueInvoices.map((invoice) => `${invoice.number} · ${customerName(state, invoice.customerId)} · ${formatMoney(invoiceOutstandingMinor(state, invoice, tenantId), metrics.tenant.currency)} · due ${invoice.dueDate}`)
    return { intent, answer: lines.length ? `I found ${lines.length} overdue invoice${lines.length === 1 ? '' : 's'}:\n${lines.join('\n')}` : 'There are no overdue invoices in this workspace.', sources: metrics.overdueInvoices.map((invoice) => invoice.id) }
  }
  if (intent === 'followups_due') {
    const lines = metrics.dueThisWeek.map((task) => `${task.title} · ${customerName(state, task.customerId)} · due ${task.dueDate}`)
    return { intent, answer: lines.length ? `${lines.length} open follow-up${lines.length === 1 ? '' : 's'} are due this week:\n${lines.join('\n')}` : 'There are no open follow-ups due this week.', sources: metrics.dueThisWeek.map((task) => task.id) }
  }
  if (intent === 'revenue_month') return { intent, answer: `${tenantName} recorded ${formatMoney(metrics.revenueMinor, metrics.tenant.currency)} in revenue from ${metrics.monthStart} through ${metrics.monthEnd}.`, sources: tenantRows(state, tenantId, 'ledgerEntries').filter((entry) => entry.effectiveDate >= metrics.monthStart && entry.effectiveDate <= metrics.monthEnd).map((entry) => entry.id) }
  return { intent, answer: 'I can currently answer questions about cash, revenue, outstanding invoices, customers, and follow-up tasks. Try “Which invoices are overdue?”', sources: [] }
}
