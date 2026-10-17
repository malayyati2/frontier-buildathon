import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft, ArrowUpRight, Bell, Bot, BriefcaseBusiness, CalendarDays, Check, ChevronDown,
  CircleDollarSign, ClipboardList, Download, FileUp, Home, Landmark, LayoutDashboard, ListChecks,
  MessageSquareText, MoreHorizontal, Plus, RefreshCw, Search, Send, Settings2, ShieldCheck, Sparkles,
  Upload, Users, WalletCards, X, Zap,
} from 'lucide-react'
import { answerQuestion, addAudit, formatMoney, getMetrics, invoiceOutstandingMinor, TODAY, toMinorUnits } from './lib/domain.js'
import { exportTenantCsv, importTenantCsv } from './lib/csv.js'
import { createId, loadState, resetState, saveState } from './lib/storage.js'

const NAV = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'ledger', label: 'Money', icon: WalletCards },
  { id: 'followups', label: 'Follow-ups', icon: ListChecks },
  { id: 'import', label: 'Import & export', icon: FileUp },
  { id: 'connections', label: 'Connections', icon: Zap },
]

function App() {
  const [state, setState] = useState(loadState)
  const [tenantId, setTenantId] = useState(() => loadState().tenants[0]?.id)
  const [page, setPage] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const tenant = state.tenants.find((item) => item.id === tenantId) || state.tenants[0]
  const metrics = useMemo(() => getMetrics(state, tenantId, TODAY), [state, tenantId])

  useEffect(() => saveState(state), [state])
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(null), 4200); return () => clearTimeout(timer) }, [toast])

  function mutate(next, message) {
    setState(next)
    if (message) setToast({ type: 'success', message })
  }

  function addTask(task) {
    const next = addAudit({ ...state, tasks: [...state.tasks, { ...task, id: createId('task'), tenantId, status: 'open', createdAt: new Date().toISOString() }] }, tenantId, 'Follow-up created', task.title)
    mutate(next, 'Follow-up added to your task list.')
  }

  function toggleTask(taskId) {
    const task = state.tasks.find((item) => item.id === taskId)
    if (!task) return
    const completed = task.status !== 'completed'
    const next = addAudit({ ...state, tasks: state.tasks.map((item) => item.id === taskId ? { ...item, status: completed ? 'completed' : 'open', completedAt: completed ? new Date().toISOString() : undefined } : item) }, tenantId, completed ? 'Follow-up completed' : 'Follow-up reopened', task.title)
    mutate(next, completed ? 'Nice work — follow-up marked complete.' : 'Follow-up reopened.')
  }

  function addLedger(entry) {
    const next = addAudit({ ...state, ledgerEntries: [...state.ledgerEntries, { ...entry, id: createId('ledger'), tenantId, source: 'manual' }] }, tenantId, 'Ledger entry added', entry.description)
    mutate(next, 'Money movement saved to the workspace.')
  }

  function importCsv(file) {
    if (!file) return
    if (file.size > 2_000_000) { setToast({ type: 'error', message: 'That file is larger than 2 MB. Export a smaller CSV and try again.' }); return }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = importTenantCsv(state, tenantId, String(reader.result))
        mutate(addAudit(result.state, tenantId, 'CSV imported', `${result.imported} imported, ${result.skipped} duplicate rows skipped.`), `${result.imported} row${result.imported === 1 ? '' : 's'} imported safely.`)
      } catch (error) { setToast({ type: 'error', message: error.message }) }
    }
    reader.onerror = () => setToast({ type: 'error', message: 'The file could not be read. Try saving it as UTF-8 CSV.' })
    reader.readAsText(file)
  }

  function downloadExport() {
    const blob = new Blob([exportTenantCsv(state, tenantId)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${tenant.name.toLowerCase().replaceAll(' ', '-')}-frontier-export.csv`; anchor.click(); URL.revokeObjectURL(url)
    setToast({ type: 'success', message: 'A tenant-scoped CSV export is ready.' })
  }

  function resetDemo() {
    if (window.confirm('Reset this local demo workspace to its original records? Your local changes will be removed.')) { setState(resetState()); setTenantId('tenant-acme'); setToast({ type: 'success', message: 'Demo data restored.' }) }
  }

  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} tenant={tenant} />
    <div className="main-column">
      <Header state={state} tenant={tenant} tenantId={tenantId} setTenantId={setTenantId} page={page} />
      <main className="page-content">
        {page === 'dashboard' && <Dashboard state={state} tenantId={tenantId} metrics={metrics} setPage={setPage} toggleTask={toggleTask} />}
        {page === 'ledger' && <Ledger state={state} tenantId={tenantId} metrics={metrics} addLedger={addLedger} />}
        {page === 'followups' && <FollowUps state={state} tenantId={tenantId} metrics={metrics} addTask={addTask} toggleTask={toggleTask} />}
        {page === 'import' && <ImportExport tenant={tenant} onImport={importCsv} onExport={downloadExport} />}
        {page === 'connections' && <Connections />}
      </main>
    </div>
    <Assistant state={state} tenantId={tenantId} />
    {toast && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`} role="status"><span>{toast.type === 'error' ? <X size={16} /> : <Check size={16} />}</span>{toast.message}</div>}
    <button className="reset-demo" onClick={resetDemo} title="Restore local demo records"><RefreshCw size={14} /> Reset demo</button>
  </div>
}

function Sidebar({ page, setPage, tenant }) {
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark"><Sparkles size={18} /></div><div><strong>frontier</strong><span>business OS</span></div></div>
    <div className="workspace-mini"><div className="workspace-icon"><BriefcaseBusiness size={15} /></div><div><small>WORKSPACE</small><strong>{tenant?.name}</strong></div><ChevronDown size={15} /></div>
    <nav className="nav-list" aria-label="Main navigation">{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(id)}><Icon size={18} /><span>{label}</span>{id === 'followups' && <em>{tenant ? '3' : ''}</em>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="ai-status"><span className="status-dot" /><div><strong>Frontier assistant</strong><span>Ready · local mode</span></div></div><button className="nav-item muted"><Settings2 size={18} /><span>Settings</span></button><div className="profile"><div className="avatar">RS</div><div><strong>Riya Sharma</strong><span>Owner account</span></div><MoreHorizontal size={16} /></div></div>
  </aside>
}

function Header({ state, tenant, tenantId, setTenantId, page }) {
  const current = NAV.find((item) => item.id === page)
  return <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><Sparkles size={17} /></div><strong>frontier</strong></div><div><p className="eyebrow">{page === 'dashboard' ? 'THURSDAY, OCTOBER 16, 2026' : 'WORKSPACE'}</p><h1>{current?.label || 'Overview'}</h1></div><div className="topbar-actions"><label className="tenant-select"><BriefcaseBusiness size={15} /><select value={tenantId} onChange={(event) => setTenantId(event.target.value)} aria-label="Select business workspace">{state.tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14} /></label><button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="avatar desktop-avatar">RS</div></div></header>
}

function Dashboard({ state, tenantId, metrics, setPage, toggleTask }) {
  const recentLedger = state.ledgerEntries.filter((entry) => entry.tenantId === tenantId).slice(-4).reverse()
  const customerById = (id) => state.customers.find((customer) => customer.id === id)?.name || 'General'
  return <div className="dashboard-grid">
    <section className="hero-card"><div><p className="eyebrow light">YOUR BUSINESS AT A GLANCE</p><h2>Good morning, Riya <span>✦</span></h2><p>Here is what needs your attention today. Frontier keeps the important things simple.</p></div><div className="hero-orb"><Sparkles size={22} /><span>3</span><small>priority actions</small></div></section>
    <div className="metric-grid">
      <MetricCard label="Net cash" value={formatMoney(metrics.cashMinor, metrics.tenant.currency)} helper="From posted money movements" icon={CircleDollarSign} tone="blue" />
      <MetricCard label="Outstanding" value={formatMoney(metrics.arMinor, metrics.tenant.currency)} helper={`${metrics.overdueInvoices.length} overdue invoice${metrics.overdueInvoices.length === 1 ? '' : 's'}`} icon={Landmark} tone="amber" action={() => setPage('ledger')} />
      <MetricCard label="Revenue this month" value={formatMoney(metrics.revenueMinor, metrics.tenant.currency)} helper={`Since ${metrics.monthStart}`} icon={ArrowUpRight} tone="green" />
      <MetricCard label="Open follow-ups" value={metrics.openTasks.length} helper={`${metrics.dueThisWeek.length} due this week`} icon={ClipboardList} tone="purple" action={() => setPage('followups')} />
    </div>
    <section className="content-card attention-card"><div className="section-heading"><div><p className="eyebrow">ATTENTION NEEDED</p><h3>Keep the momentum going</h3></div><button className="text-button" onClick={() => setPage('followups')}>View all <ArrowUpRight size={14} /></button></div><div className="attention-list"><AttentionItem icon={Bell} tone="coral" title={`${metrics.overdueInvoices.length} overdue payment${metrics.overdueInvoices.length === 1 ? '' : 's'}`} text="A quick call today can protect your cash flow." action="Review invoices" onClick={() => setPage('ledger')} /><AttentionItem icon={CalendarDays} tone="lavender" title={`${metrics.dueThisWeek.length} follow-up${metrics.dueThisWeek.length === 1 ? '' : 's'} due this week`} text="Small touches turn into repeat business." action="Open task list" onClick={() => setPage('followups')} /><AttentionItem icon={ShieldCheck} tone="mint" title="Your data is private" text="Every view is scoped to the selected workspace." action="Learn more" onClick={() => setPage('connections')} /></div></section>
    <section className="content-card table-card"><div className="section-heading"><div><p className="eyebrow">RECENT MONEY MOVEMENTS</p><h3>Latest activity</h3></div><button className="text-button" onClick={() => setPage('ledger')}>Open money <ArrowUpRight size={14} /></button></div><div className="activity-list">{recentLedger.map((entry) => <div className="activity-row" key={entry.id}><div className={`activity-icon ${entry.entryType === 'expense' ? 'expense' : 'income'}`}>{entry.entryType === 'expense' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</div><div className="activity-description"><strong>{entry.description}</strong><span>{customerById(entry.customerId)} · {entry.effectiveDate}</span></div><strong className={entry.entryType === 'expense' ? 'amount expense-text' : 'amount'}>{entry.entryType === 'expense' ? '−' : '+'}{formatMoney(entry.amountMinor, metrics.tenant.currency)}</strong></div>)}{!recentLedger.length && <EmptyState title="No money movements yet" text="Import a CSV or add your first entry." />}</div></section>
    <section className="content-card table-card"><div className="section-heading"><div><p className="eyebrow">UP NEXT</p><h3>Follow-ups this week</h3></div><button className="text-button" onClick={() => setPage('followups')}>Manage tasks <ArrowUpRight size={14} /></button></div><div className="task-preview">{metrics.dueThisWeek.slice(0, 3).map((task) => <div className="task-row" key={task.id}><button className="task-check" onClick={() => toggleTask(task.id)} aria-label={`Complete ${task.title}`}><Check size={14} /></button><div><strong>{task.title}</strong><span>{customerById(task.customerId)} · due {task.dueDate}</span></div><PriorityPill priority={task.priority} /></div>)}{!metrics.dueThisWeek.length && <EmptyState title="You are all caught up" text="No open tasks are due this week." />}</div></section>
  </div>
}

function MetricCard({ label, value, helper, icon: Icon, tone, action }) { return <button className={`metric-card metric-${tone}`} onClick={action} disabled={!action}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div><strong>{value}</strong><small>{helper}</small></button> }
function AttentionItem({ icon: Icon, tone, title, text, action, onClick }) { return <div className="attention-item"><div className={`attention-icon ${tone}`}><Icon size={17} /></div><div><strong>{title}</strong><p>{text}</p></div><button className="text-button" onClick={onClick}>{action}<ArrowUpRight size={13} /></button></div> }
function PriorityPill({ priority }) { return <span className={`priority ${priority}`}>{priority}</span> }
function EmptyState({ title, text }) { return <div className="empty-state"><div className="empty-icon"><Sparkles size={17} /></div><strong>{title}</strong><span>{text}</span></div> }

function Ledger({ state, tenantId, metrics, addLedger }) {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const invoices = state.invoices.filter((invoice) => invoice.tenantId === tenantId)
  const ledger = state.ledgerEntries.filter((entry) => entry.tenantId === tenantId).slice().reverse()
  const customers = state.customers.filter((customer) => customer.tenantId === tenantId)
  const visible = filter === 'overdue' ? metrics.overdueInvoices : ledger
  return <div className="module-page"><div className="module-intro"><div><p className="eyebrow">MONEY CENTER</p><h2>Know your numbers without a spreadsheet.</h2><p>Balances are calculated from your original entries. No hidden totals, no guesswork.</p></div><button className="primary-button" onClick={() => setShowForm((value) => !value)}><Plus size={17} /> Add money movement</button></div>
    <div className="money-summary"><div><span>Net cash</span><strong>{formatMoney(metrics.cashMinor, metrics.tenant.currency)}</strong><small>Posted cash in and out</small></div><div><span>Receivables</span><strong>{formatMoney(metrics.arMinor, metrics.tenant.currency)}</strong><small>Open customer invoices</small></div><div><span>This month</span><strong>{formatMoney(metrics.revenueMinor - metrics.expensesMinor, metrics.tenant.currency)}</strong><small>Revenue less expenses</small></div></div>
    {showForm && <LedgerForm customers={customers} onCancel={() => setShowForm(false)} onSave={(entry) => { addLedger(entry); setShowForm(false) }} />}
    <div className="content-card table-card full-width"><div className="section-heading"><div><p className="eyebrow">CASH LEDGER</p><h3>Money movements</h3></div><div className="segmented"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All activity</button><button className={filter === 'overdue' ? 'selected' : ''} onClick={() => setFilter('overdue')}>Overdue invoices</button></div></div>{filter === 'all' ? <div className="ledger-table"><div className="ledger-head"><span>DESCRIPTION</span><span>DATE</span><span>TYPE</span><span>AMOUNT</span></div>{visible.map((entry) => <div className="ledger-row" key={entry.id}><div><strong>{entry.description}</strong><span>{entry.customerId ? state.customers.find((customer) => customer.id === entry.customerId)?.name : 'Workspace entry'}</span></div><span>{entry.effectiveDate}</span><span className={`type-pill ${entry.entryType}`}>{entry.entryType.replace('_', ' ')}</span><strong className={['expense', 'refund'].includes(entry.entryType) ? 'negative' : 'positive'}>{['expense', 'refund'].includes(entry.entryType) ? '−' : '+'}{formatMoney(entry.amountMinor, metrics.tenant.currency)}</strong></div>)}{!visible.length && <EmptyState title="No entries yet" text="Add a money movement to start building your ledger." />}</div> : <InvoiceTable state={state} invoices={visible} tenantId={tenantId} currency={metrics.tenant.currency} />}</div>
    <div className="content-card table-card full-width"><div className="section-heading"><div><p className="eyebrow">CUSTOMER INVOICES</p><h3>Outstanding payments</h3></div><span className="soft-badge"><ShieldCheck size={13} /> Calculated from entries</span></div><InvoiceTable state={state} invoices={invoices.filter((invoice) => invoice.status !== 'void')} tenantId={tenantId} currency={metrics.tenant.currency} /></div>
  </div>
}

function LedgerForm({ customers, onCancel, onSave }) {
  const [form, setForm] = useState({ entryType: 'income', amount: '', effectiveDate: TODAY, description: '', customerId: '' })
  function submit(event) { event.preventDefault(); try { const amountMinor = toMinorUnits(form.amount); if (amountMinor <= 0 || !form.description.trim()) throw new Error('Add a description and a positive amount.'); onSave({ ...form, amountMinor, direction: ['expense', 'refund'].includes(form.entryType) ? 'debit' : 'credit', description: form.description.trim(), customerId: form.customerId || undefined }) } catch (error) { window.alert(error.message) } }
  return <form className="inline-form" onSubmit={submit}><div className="form-heading"><div><p className="eyebrow">NEW ENTRY</p><h3>Record a money movement</h3></div><button type="button" className="icon-button subtle" onClick={onCancel} aria-label="Close form"><X size={17} /></button></div><div className="form-grid"><label>Type<select value={form.entryType} onChange={(event) => setForm({ ...form, entryType: event.target.value })}><option value="income">Money received</option><option value="expense">Expense paid</option><option value="refund">Refund</option></select></label><label>Amount<input type="text" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label><label>Date<input type="date" value={form.effectiveDate} onChange={(event) => setForm({ ...form, effectiveDate: event.target.value })} required /></label><label>Customer (optional)<select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}><option value="">Workspace entry</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label className="wide">Description<input type="text" placeholder="e.g. Retainer payment" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> Save entry</button></div></form>
}

function InvoiceTable({ state, invoices, tenantId, currency }) { return <div className="invoice-table">{invoices.map((invoice) => { const remaining = invoiceOutstandingMinor(state, invoice, tenantId); const overdue = remaining > 0 && invoice.dueDate < TODAY; return <div className="invoice-row" key={invoice.id}><div className="invoice-number"><span className={overdue ? 'invoice-dot overdue' : 'invoice-dot'} /><div><strong>{invoice.number}</strong><span>{state.customers.find((customer) => customer.id === invoice.customerId)?.name || 'Unknown customer'}</span></div></div><span>{invoice.dueDate}</span><strong>{formatMoney(remaining, currency)}</strong><span className={overdue ? 'status-text overdue-text' : remaining === 0 ? 'status-text paid' : 'status-text'}>{remaining === 0 ? 'Paid' : overdue ? 'Overdue' : 'Open'}</span></div> })}{!invoices.length && <EmptyState title="No invoices here" text="Import or add customer invoices to track receivables." />}</div> }

function FollowUps({ state, tenantId, metrics, addTask, toggleTask }) {
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState('open')
  const tasks = state.tasks.filter((task) => task.tenantId === tenantId && (view === 'open' ? task.status === 'open' : view === 'completed' ? task.status === 'completed' : task.status === 'open' && task.dueDate < TODAY))
  const customers = state.customers.filter((customer) => customer.tenantId === tenantId)
  return <div className="module-page"><div className="module-intro"><div><p className="eyebrow">CUSTOMER CARE</p><h2>Turn “I should call them” into a clear next step.</h2><p>Frontier keeps follow-ups visible, assigned, and easy to finish.</p></div><button className="primary-button" onClick={() => setShowForm((value) => !value)}><Plus size={17} /> New follow-up</button></div><div className="task-summary"><div><strong>{metrics.openTasks.length}</strong><span>open tasks</span></div><div><strong>{metrics.dueThisWeek.length}</strong><span>due this week</span></div><div><strong>{metrics.openTasks.filter((task) => task.dueDate < TODAY).length}</strong><span>overdue</span></div></div>{showForm && <TaskForm customers={customers} onCancel={() => setShowForm(false)} onSave={(task) => { addTask(task); setShowForm(false) }} />}<div className="content-card table-card full-width"><div className="section-heading"><div><p className="eyebrow">YOUR TASK LIST</p><h3>Follow-ups</h3></div><div className="segmented"><button className={view === 'open' ? 'selected' : ''} onClick={() => setView('open')}>Open</button><button className={view === 'overdue' ? 'selected' : ''} onClick={() => setView('overdue')}>Overdue</button><button className={view === 'completed' ? 'selected' : ''} onClick={() => setView('completed')}>Done</button></div></div><div className="full-task-list">{tasks.map((task) => <div className="full-task-row" key={task.id}><button className={`task-check large ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleTask(task.id)} aria-label={task.status === 'completed' ? `Reopen ${task.title}` : `Complete ${task.title}`}>{task.status === 'completed' ? <Check size={15} /> : null}</button><div className="task-main"><strong>{task.title}</strong><span>{state.customers.find((customer) => customer.id === task.customerId)?.name || 'Workspace task'} {task.notes ? `· ${task.notes}` : ''}</span></div><div className="task-date"><CalendarDays size={14} /> {task.dueDate}</div><PriorityPill priority={task.priority} /></div>)}{!tasks.length && <EmptyState title={view === 'completed' ? 'No completed tasks yet' : 'Nothing needs your attention'} text={view === 'overdue' ? 'Great — no open tasks are overdue.' : 'Create a follow-up or import your task list.'} />}</div></div></div>
}

function TaskForm({ customers, onCancel, onSave }) {
  const [form, setForm] = useState({ title: '', notes: '', dueDate: TODAY, priority: 'normal', customerId: '' })
  function submit(event) { event.preventDefault(); if (!form.title.trim()) return; onSave({ ...form, title: form.title.trim(), customerId: form.customerId || undefined }) }
  return <form className="inline-form" onSubmit={submit}><div className="form-heading"><div><p className="eyebrow">NEW TASK</p><h3>What should happen next?</h3></div><button type="button" className="icon-button subtle" onClick={onCancel} aria-label="Close form"><X size={17} /></button></div><div className="form-grid"><label className="wide">Task<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Check in about the new quote" required /></label><label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required /></label><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label><label>Customer (optional)<select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}><option value="">No customer linked</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label className="wide">Note (optional)<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Add useful context for the person doing it" /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> Add follow-up</button></div></form>
}

function ImportExport({ tenant, onImport, onExport }) {
  const [dragging, setDragging] = useState(false)
  return <div className="module-page"><div className="module-intro"><div><p className="eyebrow">DATA CONTROL</p><h2>Bring your records with you.</h2><p>Import a clean CSV, preview errors, and keep a portable backup of this workspace.</p></div><button className="secondary-button" onClick={onExport}><Download size={17} /> Export workspace CSV</button></div><div className="import-grid"><section className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); onImport(event.dataTransfer.files[0]) }}><div className="drop-icon"><Upload size={22} /></div><h3>Import a CSV file</h3><p>Customers, invoices, ledger entries, and follow-ups can be imported together.</p><label className="primary-button file-button"><FileUp size={16} /> Choose CSV<input type="file" accept=".csv,text/csv" onChange={(event) => onImport(event.target.files?.[0])} /></label><small>Max 2 MB · UTF-8 · all-or-nothing validation</small></section><section className="content-card guide-card"><p className="eyebrow">HOW IT WORKS</p><h3>A safe, simple import</h3><div className="import-step"><span>1</span><div><strong>Prepare your file</strong><p>Use the included template columns like <code>record_type</code>, <code>name</code>, <code>amount</code>, and <code>due_date</code>.</p></div></div><div className="import-step"><span>2</span><div><strong>Preview and validate</strong><p>Frontier checks every row and refuses the entire file if any row is invalid.</p></div></div><div className="import-step"><span>3</span><div><strong>Keep control</strong><p>Duplicate external IDs are skipped. Nothing is deleted or silently overwritten.</p></div></div></section></div><section className="content-card template-card"><div><p className="eyebrow">IMPORT TEMPLATE</p><h3>Start with these columns</h3><p>Export this workspace once to get a ready-to-edit template with all supported headers.</p></div><div className="template-tags"><span>record_type</span><span>external_id</span><span>customer_id</span><span>amount</span><span>due_date</span><span>title</span></div></section><div className="privacy-note"><ShieldCheck size={18} /><div><strong>Private by default</strong><p>Exports only include records from <b>{tenant.name}</b>. Google, bank, and messaging connections are not active in this local MVP.</p></div></div></div>
}

function Connections() { return <div className="module-page"><div className="module-intro"><div><p className="eyebrow">CONNECTED WORK</p><h2>Connect the tools you already use.</h2><p>Integrations are opt-in. Frontier never asks for a password or pretends a connection succeeded.</p></div></div><div className="connection-grid"><ConnectionCard icon="G" title="Google Business Profile" text="Bring in reviews, draft replies, and publish only after approval." state="Coming next" /><ConnectionCard icon="▦" title="Google Sheets" text="Sync approved records with a spreadsheet you choose." state="Coming next" /><ConnectionCard icon="◎" title="AI provider" text="Use a low-cost model only when a task genuinely needs reasoning." state="Optional" /></div><section className="content-card security-card"><div className="security-icon"><ShieldCheck size={20} /></div><div><p className="eyebrow">TRUST BOUNDARY</p><h3>Local demo mode is honest about its limits.</h3><p>This buildathon milestone stores demo records in your browser and uses deterministic application logic. It does not call Google, send messages, or use an external AI model. The next production milestone should move tenant data to an authenticated API and encrypted database.</p></div></section></div> }
function ConnectionCard({ icon, title, text, state }) { return <div className="content-card connection-card"><div className="connection-top"><div className="connection-icon">{icon}</div><span className="soft-badge">{state}</span></div><h3>{title}</h3><p>{text}</p><button className="secondary-button" disabled>Configure later <ArrowUpRight size={14} /></button></div> }

function Assistant({ state, tenantId }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hi Riya — I can answer questions about your money, invoices, and follow-ups using only this workspace.', sources: [] }])
  function ask(value = question) { const trimmed = value.trim(); if (!trimmed) return; const result = answerQuestion(state, tenantId, trimmed, TODAY); setMessages((current) => [...current, { role: 'user', text: trimmed }, { role: 'assistant', text: result.answer, sources: result.sources, intent: result.intent }]); setQuestion('') }
  const prompts = ['Which invoices are overdue?', 'Who needs a follow-up this week?', 'What is our cash balance?']
  return <aside className="assistant-panel"><div className="assistant-heading"><div className="assistant-title"><div className="assistant-spark"><Bot size={17} /></div><div><strong>Ask Frontier</strong><span>Simple answers from your records</span></div></div><span className="live-label"><i /> local</span></div><div className="assistant-messages">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><div className="message-bubble">{message.text.split('\n').map((line, lineIndex) => <div key={lineIndex}>{line || <>&nbsp;</>}</div>)}{message.sources?.length > 0 && <small className="sources">Sources: {message.sources.slice(0, 4).join(', ')}{message.sources.length > 4 ? '…' : ''}</small>}</div></div>)}</div><div className="suggested-prompts">{messages.length === 1 && prompts.map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div><form className="assistant-input" onSubmit={(event) => { event.preventDefault(); ask() }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your business…" aria-label="Ask Frontier a question" /><button type="submit" aria-label="Send question"><Send size={16} /></button></form><div className="assistant-footnote"><ShieldCheck size={13} /> No external AI calls · deterministic answers</div></aside>
}

export default App
