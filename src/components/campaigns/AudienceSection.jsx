'use client'
import React from 'react';
import Select from 'react-select';

// Step 1: who gets the campaign, and how. Counts come from the page
// (POST /api/campaigns/audience) and update as the choices change.

const KYC_OPTIONS = [
  { value: '', label: 'Anyone' },
  { value: 'verified', label: 'KYC verified' },
  { value: 'unverified', label: 'Not KYC verified' },
];
const SIGNUP_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export default function AudienceSection({ options, audience, mode, onAudienceChange, onModeChange, counts, countsLoading, countsError, onPreviewRecipient }) {
  const toggleSegment = (key) => {
    const next = audience.segments.includes(key)
      ? audience.segments.filter(k => k !== key)
      : [...audience.segments, key];
    onAudienceChange({ ...audience, segments: next });
  };

  const schoolOptions = options.schools.map(s => ({ value: s.value, label: `${s.label} (${s.users})` }));
  const selectedSchools = schoolOptions.filter(o => audience.schools.includes(o.value));
  const segmentLabel = Object.fromEntries(options.segments.map(s => [s.key, s.label]));

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">1. Audience</h2>
        <p className="text-sm text-gray-500">Segments are the same as the dashboard&apos;s User Segments.</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Segments</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAudienceChange({ ...audience, segments: [] })}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${audience.segments.length === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            All users
          </button>
          {options.segments.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSegment(s.key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${audience.segments.includes(s.key) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label htmlFor="campaign-schools" className="block text-sm font-medium text-gray-700 mb-2">Schools</label>
          <Select
            inputId="campaign-schools"
            instanceId="campaign-schools" // fixed id: avoids a server/browser render mismatch
            isMulti
            options={schoolOptions}
            value={selectedSchools}
            onChange={(sel) => onAudienceChange({ ...audience, schools: (sel || []).map(o => o.value) })}
            placeholder="All schools"
            classNamePrefix="react-select"
            styles={{ menu: (b) => ({ ...b, zIndex: 50 }), control: (b) => ({ ...b, borderRadius: '0.5rem', borderColor: '#d1d5db' }) }}
          />
        </div>
        <div>
          <label htmlFor="campaign-kyc" className="block text-sm font-medium text-gray-700 mb-2">KYC</label>
          <select
            id="campaign-kyc"
            value={audience.kyc || ''}
            onChange={(e) => onAudienceChange({ ...audience, kyc: e.target.value || null })}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {KYC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="campaign-signup" className="block text-sm font-medium text-gray-700 mb-2">Signed up</label>
          <select
            id="campaign-signup"
            value={audience.signedUpWithinDays ? String(audience.signedUpWithinDays) : ''}
            onChange={(e) => onAudienceChange({ ...audience, signedUpWithinDays: e.target.value ? Number(e.target.value) : null })}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SIGNUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Send by</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {options.modes.map(m => (
            <label
              key={m.key}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm ${mode === m.key ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              <input type="radio" name="campaign-mode" value={m.key} checked={mode === m.key} onChange={() => onModeChange(m.key)} className="accent-indigo-600" />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        {countsError ? (
          <p className="text-sm text-red-600">{countsError}</p>
        ) : !counts || countsLoading ? (
          <p className="text-sm text-gray-500">Counting…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span><strong className="text-gray-900 text-lg">{counts.reachable}</strong> <span className="text-gray-600">will get it</span></span>
              <span className="text-gray-600">WhatsApp <strong className="text-gray-900">{counts.whatsapp}</strong></span>
              <span className="text-gray-600">Email <strong className="text-gray-900">{counts.email}</strong></span>
              {counts.unreachable > 0 && (
                <span className="text-gray-500">{counts.unreachable} matched but can&apos;t be reached this way</span>
              )}
            </div>
            {counts.sample.length > 0 && (
              <div className="mt-3 divide-y divide-gray-200 border-t border-gray-200">
                {counts.sample.map(p => (
                  <div key={p.uid} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-900 truncate">{p.fullName || 'Unnamed'}</p>
                      <p className="text-xs text-gray-500 truncate">{p.school || 'No school set'} · {segmentLabel[p.segment]} · {p.channels.join(' + ')}</p>
                    </div>
                    <button type="button" onClick={() => onPreviewRecipient(p)} className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                      Preview as
                    </button>
                  </div>
                ))}
              </div>
            )}
            {counts.whatsapp === 0 && mode !== 'email' && (
              <p className="mt-3 text-xs text-gray-500">
                WhatsApp only goes to people who switched on &ldquo;Offers &amp; updates on WhatsApp&rdquo; in the web app.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
