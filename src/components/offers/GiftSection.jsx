'use client'
import React, { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { searchPeople } from '@/utils/campaignClient';
import { resolveAudience, giftInChunks } from '@/utils/offersClient';

// Gift a plan or boost credits to specific people or a group. Same audience
// rules as Campaigns (src/lib/audience.js).

const inputClass = 'w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectStyles = { menu: (b) => ({ ...b, zIndex: 50 }), control: (b) => ({ ...b, borderRadius: '0.5rem', borderColor: '#d1d5db' }) };

export default function GiftSection({ plans, options, onChanged }) {
  const [who, setWho] = useState('people');
  const [people, setPeople] = useState([]);
  const [group, setGroup] = useState({ segments: [], schools: [], kyc: '' });
  const [kind, setKind] = useState('plan');
  const [planId, setPlanId] = useState('');
  const [days, setDays] = useState('30');
  const [boostCount, setBoostCount] = useState('1');
  const [note, setNote] = useState('');

  const [resolved, setResolved] = useState(null); // { count, userIds, tooMany }
  const [resolving, setResolving] = useState(false);
  const [running, setRunning] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Search only after typing pauses.
  const timer = useRef(null);
  const loadPeople = (input) => new Promise((resolve) => {
    clearTimeout(timer.current);
    if (input.trim().length < 2) return resolve([]);
    timer.current = setTimeout(() => {
      searchPeople(input)
        .then(list => resolve(list.map(p => ({ value: p.uid, label: `${p.fullName || 'Unnamed'} · ${p.email}${p.school ? ` · ${p.school}` : ''}` }))))
        .catch(() => resolve([]));
    }, 350);
  });

  // Who a group gift reaches, kept up to date as the filters change.
  useEffect(() => {
    if (who !== 'group') return;
    let cancelled = false;
    setResolving(true);
    const t = setTimeout(() => {
      resolveAudience({ segments: group.segments, schools: group.schools, kyc: group.kyc || null })
        .then(r => { if (!cancelled) { setResolved(r); setError(''); } })
        .catch(err => { if (!cancelled) setError(err.message); })
        .finally(() => { if (!cancelled) setResolving(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [who, group]);

  const recipients = who === 'people' ? people.map(p => p.value) : resolved?.userIds || [];
  const plan = plans.find(p => p.id === planId);
  const what = kind === 'plan'
    ? (plan ? `${plan.name} (${plan.category}) free for ${days} days` : '')
    : `${boostCount} free boost${Number(boostCount) === 1 ? '' : 's'} (${days} days each once used)`;
  const canGive = recipients.length > 0 && !running && (kind === 'boost' || planId) && Number(days) >= 1 && !(who === 'group' && resolved?.tooMany);

  const handleGive = async () => {
    if (!confirm(`Give ${what} to ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}?\n\nAnyone who already has a better or different paid plan is skipped.`)) return;
    setError('');
    setResult(null);
    setRunning({ done: 0, total: recipients.length });
    // Names for the results list, kept before the picker is cleared.
    const names = Object.fromEntries(people.map(p => [p.value, p.label.split(" · ")[0]]));
    try {
      const totals = await giftInChunks(recipients, {
        kind, planId: kind === 'plan' ? planId : undefined,
        durationDays: Number(days), boostCount: kind === 'boost' ? Number(boostCount) : undefined, note,
      }, setRunning);
      setResult({ ...totals, names });
      if (who === 'people') setPeople([]);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(null);
    }
  };

  const tab = (active) => `px-4 py-2 rounded-lg text-sm font-medium border ${active ? 'bg-indigo-50 text-indigo-800 border-indigo-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Gift</h2>
        <p className="text-sm text-gray-500">Give a plan or free boosts to specific people or a group. Free gifts never count as revenue.</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Who</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tab(who === 'people')} onClick={() => setWho('people')}>Specific people</button>
          <button type="button" className={tab(who === 'group')} onClick={() => setWho('group')}>A group of users</button>
        </div>
        {who === 'people' ? (
          <AsyncSelect
            inputId="gift-people" instanceId="gift-people" isMulti cacheOptions
            loadOptions={loadPeople} value={people} onChange={(sel) => setPeople(sel || [])}
            placeholder="Type a name or email…"
            noOptionsMessage={({ inputValue }) => (inputValue.trim().length < 2 ? 'Type at least 2 letters' : 'No matching users')}
            classNamePrefix="react-select" styles={selectStyles}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setGroup(g => ({ ...g, segments: [] }))} className={`px-3 py-1.5 rounded-full text-sm border ${group.segments.length === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}>All users</button>
              {options.segments.map(s => (
                <button
                  key={s.key} type="button"
                  onClick={() => setGroup(g => ({ ...g, segments: g.segments.includes(s.key) ? g.segments.filter(k => k !== s.key) : [...g.segments, s.key] }))}
                  className={`px-3 py-1.5 rounded-full text-sm border ${group.segments.includes(s.key) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                inputId="gift-schools" instanceId="gift-schools" isMulti
                options={options.schools.map(s => ({ value: s.value, label: `${s.label} (${s.users})` }))}
                value={options.schools.filter(s => group.schools.includes(s.value)).map(s => ({ value: s.value, label: `${s.label} (${s.users})` }))}
                onChange={(sel) => setGroup(g => ({ ...g, schools: (sel || []).map(o => o.value) }))}
                placeholder="All schools" classNamePrefix="react-select" styles={selectStyles}
              />
              <select aria-label="KYC" className={inputClass} value={group.kyc} onChange={(e) => setGroup(g => ({ ...g, kyc: e.target.value }))}>
                <option value="">Anyone</option>
                <option value="verified">KYC verified</option>
                <option value="unverified">Not KYC verified</option>
              </select>
            </div>
            <p className="text-sm text-gray-600">
              {resolving ? 'Counting…' : resolved ? (
                resolved.tooMany
                  ? <span className="text-amber-700">{resolved.count} people — too many for one gift (500 max). Narrow it down.</span>
                  : <><strong className="text-gray-900">{resolved.count}</strong> {resolved.count === 1 ? 'person' : 'people'}{resolved.sample.length ? `, e.g. ${resolved.sample.slice(0, 3).map(p => p.fullName || 'Unnamed').join(', ')}` : ''}</>
              ) : null}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">What</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tab(kind === 'plan')} onClick={() => { setKind('plan'); setDays('30'); }}>A plan</button>
          <button type="button" className={tab(kind === 'boost')} onClick={() => { setKind('boost'); setDays('7'); }}>Free boosts</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {kind === 'plan' ? (
            <select aria-label="Plan" className={`${inputClass} md:col-span-2`} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Choose a plan…</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category}) · normally ₦{Number(p.price).toLocaleString()}</option>)}
            </select>
          ) : (
            <div className="md:col-span-2">
              <label htmlFor="gift-boosts" className="block text-xs font-medium text-gray-600 mb-1">How many boosts (1–10)</label>
              <input id="gift-boosts" type="number" min="1" max="10" className={inputClass} value={boostCount} onChange={(e) => setBoostCount(e.target.value)} />
            </div>
          )}
          <div>
            <label htmlFor="gift-days" className="block text-xs font-medium text-gray-600 mb-1">{kind === 'plan' ? 'Free for (days)' : 'Each boost lasts (days)'}</label>
            <input id="gift-days" type="number" min="1" max="366" className={inputClass} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
        </div>
        <input aria-label="Note" className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note for your records (optional), e.g. Reward for top seller in October" />
        {kind === 'boost' && <p className="text-xs text-gray-500">Boosts wait in the user&apos;s account until they apply one to a listing of their choice.</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {running && (
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1"><span>Giving…</span><span>{running.done} / {running.total}</span></div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 bg-indigo-600" style={{ width: `${Math.round((running.done / running.total) * 100)}%` }} /></div>
        </div>
      )}
      {result && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-2">
          <p className="text-gray-900">
            Done: <strong>{result.granted}</strong> given{result.extended ? <>, <strong>{result.extended}</strong> extended (they already had this plan)</> : ''}
            {result.skipped ? <>, <strong>{result.skipped}</strong> skipped</> : ''}{result.failed ? <>, <strong className="text-red-700">{result.failed}</strong> failed</> : ''}.
          </p>
          {result.problems.length > 0 && (
            <ul className="text-xs text-gray-600 list-disc pl-5 max-h-40 overflow-y-auto">
              {result.problems.map((p, i) => <li key={`${p.uid}-${i}`}>{result.names?.[p.uid] || p.uid}: {p.reason || p.status}</li>)}
            </ul>
          )}
        </div>
      )}

      <button type="button" onClick={handleGive} disabled={!canGive} className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
        {recipients.length > 0 && what ? `Give to ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}` : 'Give'}
      </button>
    </section>
  );
}
