'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../../components/PageHeader';
import { useAuth } from '@/context/AuthContext';

// ─── Constants ───
const WRITE_ROLES = ['super-admin', 'operations'];

const EXPENSE_CATEGORIES = [
  'Hosting & Infrastructure',
  'Domain & SSL',
  'API Services',
  'Marketing & Ads',
  'Influencer & Promotions',
  'Salaries & Payroll',
  'Contractors & Freelancers',
  'Software & Subscriptions',
  'Office & Equipment',
  'Legal & Compliance',
  'Miscellaneous',
];

const INCOME_CATEGORIES = [
  'Subscriptions',
  'Commissions',
  'Boost Fees',
  'Partnerships',
  'Sponsorships',
  'Grants & Funding',
  'Ad Revenue',
  'Miscellaneous',
];

const formatNaira = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ─── Stat Card ───
function StatCard({ label, value, sub, color }) {
  const colors = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

// ─── Main Page ───
export default function FinancePage() {
  const { user, adminData } = useAuth();
  const canWrite = WRITE_ROLES.includes(adminData?.role);

  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Add form
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [formErr, setFormErr] = useState('');

  // Delete
  const [deleting, setDeleting] = useState(null);

  // ─── Data fetching ───
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/summary');
      const data = await res.json();
      if (data.success) setSummary(data);
    } catch (err) {
      console.error('Summary fetch error:', err);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterCategory) params.set('category', filterCategory);
      if (filterMonth) params.set('month', filterMonth);
      if (filterYear) params.set('year', filterYear);

      const res = await fetch(`/api/finance/transactions?${params.toString()}`);
      const data = await res.json();
      if (data.success) setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Transactions fetch error:', err);
    }
  }, [filterType, filterCategory, filterMonth, filterYear]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchTransactions()]).finally(() =>
      setLoading(false)
    );
  }, [fetchSummary, fetchTransactions]);

  // ─── Add Transaction ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg('');
    setFormErr('');

    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          addedBy: adminData?.name || 'Admin',
          addedByRole: adminData?.role || '',
          addedByUid: user?.uid || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add transaction');

      setFormMsg(`${form.type === 'income' ? 'Income' : 'Expense'} of ${formatNaira(form.amount)} recorded successfully`);
      setForm({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        reference: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });

      // Refresh data
      fetchSummary();
      fetchTransactions();
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete Transaction ───
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    setDeleting(id);
    try {
      const res = await fetch(
        `/api/finance/transactions?id=${id}&role=${adminData?.role}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      fetchSummary();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const allCategories = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].sort();

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'transactions', name: 'Transactions' },
    ...(canWrite ? [{ id: 'add', name: 'Add Entry' }] : []),
  ];

  return (
    <main className="container mx-auto">
      <div className="space-y-6">
        <PageHeader
          HeaderText="Finance Dashboard"
          SubHeaderText="Track income, expenses, and financial health for team transparency."
        />

        {/* Role badge */}
        {!canWrite && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
            You have view-only access. Only Super Admins and Operations Managers can add or delete entries.
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2">
          <nav className="flex space-x-2 md:space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3 md:px-5 font-semibold text-sm rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-gray-400">
            <svg className="animate-spin h-6 w-6 mx-auto mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading financial data...
          </div>
        )}

        {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
        {!loading && activeTab === 'overview' && summary && (
          <div className="space-y-6">
            {/* Current Month Stats */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {summary.currentMonth?.label || 'This Month'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Monthly Income"
                  value={formatNaira(summary.currentMonth?.income || 0)}
                  sub={`${summary.currentMonth?.count || 0} transactions`}
                  color="green"
                />
                <StatCard
                  label="Monthly Expenses"
                  value={formatNaira(summary.currentMonth?.expense || 0)}
                  color="red"
                />
                <StatCard
                  label="Monthly Net"
                  value={formatNaira(summary.currentMonth?.net || 0)}
                  color={summary.currentMonth?.net >= 0 ? 'blue' : 'red'}
                />
                <StatCard
                  label="All-Time Balance"
                  value={formatNaira(summary.overall?.netBalance || 0)}
                  sub={`${summary.overall?.transactionCount || 0} total records`}
                  color="purple"
                />
              </div>
            </div>

            {/* Overall Stats */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                All-Time Totals
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Total Income"
                  value={formatNaira(summary.overall?.totalIncome || 0)}
                  color="green"
                />
                <StatCard
                  label="Total Expenses"
                  value={formatNaira(summary.overall?.totalExpense || 0)}
                  color="red"
                />
                <StatCard
                  label="Net Balance"
                  value={formatNaira(summary.overall?.netBalance || 0)}
                  color={summary.overall?.netBalance >= 0 ? 'blue' : 'red'}
                />
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            {summary.monthly?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Monthly Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Month</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500">Income</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500">Expenses</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500">Net</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500">Entries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {summary.monthly.map((m) => (
                        <tr key={m.month} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3 font-medium text-gray-800">{m.label}</td>
                          <td className="px-5 py-3 text-right text-emerald-600 font-medium">
                            {formatNaira(m.income)}
                          </td>
                          <td className="px-5 py-3 text-right text-red-600 font-medium">
                            {formatNaira(m.expense)}
                          </td>
                          <td
                            className={`px-5 py-3 text-right font-bold ${
                              m.net >= 0 ? 'text-blue-600' : 'text-red-600'
                            }`}
                          >
                            {formatNaira(m.net)}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-400">{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income by category */}
              {summary.categoryBreakdown?.income &&
                Object.keys(summary.categoryBreakdown.income).length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                      <h3 className="font-semibold text-emerald-700">Income by Category</h3>
                    </div>
                    <div className="p-5 space-y-3">
                      {Object.entries(summary.categoryBreakdown.income)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amt]) => {
                          const pct = summary.overall?.totalIncome
                            ? Math.round((amt / summary.overall.totalIncome) * 100)
                            : 0;
                          return (
                            <div key={cat}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-700">{cat}</span>
                                <span className="font-medium text-emerald-700">
                                  {formatNaira(amt)} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-emerald-100 rounded-full h-2">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

              {/* Expenses by category */}
              {summary.categoryBreakdown?.expense &&
                Object.keys(summary.categoryBreakdown.expense).length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                      <h3 className="font-semibold text-red-700">Expenses by Category</h3>
                    </div>
                    <div className="p-5 space-y-3">
                      {Object.entries(summary.categoryBreakdown.expense)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amt]) => {
                          const pct = summary.overall?.totalExpense
                            ? Math.round((amt / summary.overall.totalExpense) * 100)
                            : 0;
                          return (
                            <div key={cat}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-700">{cat}</span>
                                <span className="font-medium text-red-700">
                                  {formatNaira(amt)} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-red-100 rounded-full h-2">
                                <div
                                  className="bg-red-500 h-2 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
            </div>

            {/* Empty state */}
            {(!summary.overall || summary.overall.transactionCount === 0) && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 text-lg font-medium">No financial records yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  {canWrite
                    ? 'Switch to the "Add Entry" tab to record your first transaction.'
                    : 'Waiting for finance team to add the first entry.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ TRANSACTIONS TAB ═══════════════ */}
        {!loading && activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Filters
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Categories</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('en', { month: 'long' })}
                    </option>
                  ))}
                </select>

                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Years</option>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-lg font-medium">No transactions found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or add a new entry.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Description</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Ref</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Added By</th>
                        {canWrite && (
                          <th className="text-center px-4 py-3 font-medium text-gray-500">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                t.type === 'income'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {t.type === 'income' ? 'Income' : 'Expense'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{t.category}</td>
                          <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={t.description}>
                            {t.description}
                            {t.notes && (
                              <span className="block text-xs text-gray-400 mt-0.5 truncate" title={t.notes}>
                                {t.notes}
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                              t.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {t.type === 'income' ? '+' : '-'}
                            {formatNaira(t.amount)}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{t.reference || '-'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {t.addedBy}
                          </td>
                          {canWrite && (
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDelete(t.id)}
                                disabled={deleting === t.id}
                                className="text-red-400 hover:text-red-600 transition text-xs font-medium disabled:opacity-50"
                              >
                                {deleting === t.id ? '...' : 'Delete'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary row */}
            {transactions.length > 0 && (
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-gray-500">
                  Showing {transactions.length} transaction(s)
                </span>
                <span className="text-emerald-600 font-medium">
                  Income:{' '}
                  {formatNaira(
                    transactions
                      .filter((t) => t.type === 'income')
                      .reduce((s, t) => s + Number(t.amount), 0)
                  )}
                </span>
                <span className="text-red-600 font-medium">
                  Expenses:{' '}
                  {formatNaira(
                    transactions
                      .filter((t) => t.type === 'expense')
                      .reduce((s, t) => s + Number(t.amount), 0)
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ ADD ENTRY TAB ═══════════════ */}
        {!loading && activeTab === 'add' && canWrite && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Record a Transaction</h3>
            <p className="text-sm text-gray-500 mb-6">
              Add an income or expense entry for team transparency.
            </p>

            {formMsg && (
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm font-medium">
                {formMsg}
              </div>
            )}
            {formErr && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                {formErr}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {['expense', 'income'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, type: t, category: '' }))}
                      className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        form.type === t
                          ? t === 'expense'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {t === 'expense' ? 'Expense (Money Out)' : 'Income (Money In)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (NGN) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 50000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference / Receipt #
                  </label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
                    placeholder="e.g. INV-2026-042, receipt #123"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What was it for? <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Vercel Pro plan renewal for April 2026"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any extra context, links to invoices, approval details..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md ${
                  submitting
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : form.type === 'expense'
                    ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Recording...
                  </span>
                ) : (
                  `Record ${form.type === 'income' ? 'Income' : 'Expense'}`
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
