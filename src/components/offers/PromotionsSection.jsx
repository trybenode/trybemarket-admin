'use client'
import React, { useState } from 'react';
import { createPromotion, updatePromotion, applyToVerified } from '@/utils/offersClient';

// Promotions: "the first N students to verify KYC at a school get a plan for
// D days" (09-offers.md). The web app hands them out as students verify.

const STATUS = {
  active: ['Active', 'bg-green-100 text-green-800'],
  paused: ['Paused', 'bg-amber-100 text-amber-800'],
  full: ['All spots given', 'bg-indigo-100 text-indigo-800'],
  ended: ['Ended', 'bg-gray-100 text-gray-600'],
};
const DURATION_PRESETS = [30, 90, 180];
const inputClass = 'w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const planLabel = (p) => `${p.name} (${p.category}) · normally ₦${Number(p.price).toLocaleString()}`;

export default function PromotionsSection({ promotions, plans, schools, onChanged }) {
  const [form, setForm] = useState({ name: '', school: '', planId: '', durationDays: '30', cap: '300', applyToVerified: true });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [progress, setProgress] = useState(null);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const plan = plans.find(p => p.id === form.planId);
  const schoolOptions = schools.filter(s => s.value !== '__none__');

  const runApply = async (id) => {
    setProgress({ id, granted: 0, extended: 0, skipped: 0 });
    const totals = await applyToVerified(id, (t) => setProgress({ id, ...t }));
    setProgress(null);
    return totals;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!confirm(`Create "${form.name}"?\n\nThe first ${form.cap} students to verify KYC at ${form.school} get ${plan?.name || 'the plan'} free for ${form.durationDays} days.${form.applyToVerified ? '\n\nStudents already verified there get it now, earliest verification first.' : ''}`)) return;
    setCreating(true);
    try {
      const { id } = await createPromotion({
        name: form.name, school: form.school, planId: form.planId,
        durationDays: Number(form.durationDays), cap: Number(form.cap),
      });
      let text = 'Promotion created. New verifications at this school now get it automatically.';
      if (form.applyToVerified) {
        const t = await runApply(id);
        text += ` Already-verified students: ${t.granted} given${t.extended ? `, ${t.extended} extended` : ''}${t.skipped ? `, ${t.skipped} skipped (they already have a plan)` : ''}${t.full ? '. All spots are now used.' : '.'}`;
      }
      setMessage(text);
      setForm(f => ({ ...f, name: '' }));
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const act = async (promo, body, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusyId(promo.id);
    setError('');
    setMessage('');
    try {
      if (body.action === 'applyToVerified') {
        const t = await runApply(promo.id);
        setMessage(`"${promo.name}": ${t.granted} given${t.extended ? `, ${t.extended} extended` : ''}${t.skipped ? `, ${t.skipped} skipped` : ''}.`);
      } else {
        await updatePromotion(promo.id, body);
      }
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeSpots = (promo) => {
    const value = prompt(`How many spots in total? (${promo.granted} already given)`, String(promo.cap));
    if (value === null) return;
    act(promo, { action: 'setCap', cap: Number(value) });
  };

  const btn = 'text-xs font-medium px-2.5 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50';

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Promotions</h2>
        <p className="text-sm text-gray-500">The first students to verify KYC at a school get a free plan, automatically, until the spots run out.</p>
      </div>

      {promotions.length > 0 && (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {promotions.map(p => {
            const [label, style] = STATUS[p.status] || [p.status, 'bg-gray-100 text-gray-700'];
            const pct = p.cap > 0 ? Math.min(100, Math.round((p.granted / p.cap) * 100)) : 0;
            const busy = busyId === p.id;
            return (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.planName} for {p.durationDays} days · {p.school} · by {p.createdBy?.name || 'admin'}</p>
                  </div>
                  <span className={`self-start text-xs font-medium px-2 py-1 rounded-full ${style}`}>{label}</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Spots given</span>
                    <span className="tabular-nums">{p.granted} / {p.cap}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 bg-indigo-600" style={{ width: `${pct}%` }} /></div>
                </div>
                {progress?.id === p.id && (
                  <p className="text-xs text-indigo-700">Giving to already-verified students… {progress.granted} given so far</p>
                )}
                {p.status !== 'ended' && (
                  <div className="flex flex-wrap gap-2">
                    {p.status === 'active' && <button type="button" className={btn} disabled={busy} onClick={() => act(p, { action: 'pause' })}>Pause</button>}
                    {p.status === 'paused' && <button type="button" className={btn} disabled={busy} onClick={() => act(p, { action: 'resume' })}>Resume</button>}
                    <button type="button" className={btn} disabled={busy} onClick={() => changeSpots(p)}>Change spots</button>
                    {p.status === 'active' && (
                      <button type="button" className={btn} disabled={busy} onClick={() => act(p, { action: 'applyToVerified' })}>Give to already-verified</button>
                    )}
                    <button
                      type="button"
                      className={`${btn} text-red-700`}
                      disabled={busy}
                      onClick={() => act(p, { action: 'end' }, `End "${p.name}"? Nobody new will get it. People who already got it keep their plan until it expires.`)}
                    >
                      End
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-800">New promotion</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="promo-name" className="block text-sm font-medium text-gray-700 mb-1">Name (for your records)</label>
            <input id="promo-name" className={inputClass} value={form.name} onChange={set('name')} placeholder="e.g. Lead City first 300: free Premium" required />
          </div>
          <div>
            <label htmlFor="promo-school" className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <select id="promo-school" className={inputClass} value={form.school} onChange={set('school')} required>
              <option value="">Choose a school…</option>
              {schoolOptions.map(s => <option key={s.value} value={s.value}>{s.label} ({s.users} users)</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="promo-plan" className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select id="promo-plan" className={inputClass} value={form.planId} onChange={set('planId')} required>
              <option value="">Choose a plan…</option>
              {plans.map(p => <option key={p.id} value={p.id}>{planLabel(p)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="promo-days" className="block text-sm font-medium text-gray-700 mb-1">Free for (days)</label>
              <input id="promo-days" type="number" min="1" max="366" className={inputClass} value={form.durationDays} onChange={set('durationDays')} required />
              <div className="mt-1 flex gap-1">
                {DURATION_PRESETS.map(d => (
                  <button key={d} type="button" onClick={() => setForm(f => ({ ...f, durationDays: String(d) }))} className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">{d}</button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="promo-cap" className="block text-sm font-medium text-gray-700 mb-1">Spots</label>
              <input id="promo-cap" type="number" min="1" className={inputClass} value={form.cap} onChange={set('cap')} required />
            </div>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.applyToVerified} onChange={set('applyToVerified')} className="mt-1 accent-indigo-600" />
          <span>Also give it now to students already verified at this school (earliest verification first). Anyone who already has a paid plan is skipped and doesn&apos;t use a spot.</span>
        </label>
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          {creating ? (progress ? `Giving to verified students… ${progress.granted} so far` : 'Creating…') : 'Create promotion'}
        </button>
      </form>
    </section>
  );
}
