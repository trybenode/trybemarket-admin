'use client'
import React from 'react';

// Recent campaigns, with a Resume button for any still sending or paused.

const STATUS_STYLE = {
  sending: 'bg-blue-100 text-blue-800',
  paused_quota: 'bg-amber-100 text-amber-800',
  sent: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-700',
};
const STATUS_LABEL = { sending: 'Sending', paused_quota: 'Paused (email allowance)', sent: 'Sent', partial: 'Partly sent', failed: 'Failed' };

const formatWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');

export default function CampaignHistory({ campaigns, loading, error, onResume, resumingId }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent campaigns</h2>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-gray-500">No campaigns yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {campaigns.map(c => (
            <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-500">
                  {formatWhen(c.createdAt)} · {c.createdBy} · {c.recipientCount} recipients
                  {c.template ? ` · WhatsApp: ${c.template}` : ''}{c.subject ? ` · Email: “${c.subject}”` : ''}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {c.counts?.whatsapp?.targeted > 0 && <>WhatsApp {c.counts.whatsapp.sent}/{c.counts.whatsapp.targeted}{c.counts.whatsapp.failed ? ` (${c.counts.whatsapp.failed} failed)` : ''} </>}
                  {c.counts?.email?.targeted > 0 && <>· Email {c.counts.email.sent}/{c.counts.email.targeted}{c.counts.email.failed ? ` (${c.counts.email.failed} failed)` : ''}</>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[c.status] || 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[c.status] || c.status}
                </span>
                {(c.status === 'sending' || c.status === 'paused_quota') && (
                  <button
                    type="button"
                    onClick={() => onResume(c.id)}
                    disabled={Boolean(resumingId)}
                    className="text-xs font-medium px-2.5 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {resumingId === c.id ? 'Sending…' : 'Resume'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
