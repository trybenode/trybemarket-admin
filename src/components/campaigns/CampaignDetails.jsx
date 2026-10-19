'use client'
import React, { useCallback, useEffect, useState } from 'react';
import { getCampaignDetail } from '@/utils/campaignClient';

// Delivery results for one campaign (GET /api/campaigns/[id]). Delivery
// reports keep arriving after sending, so there's a Refresh button.

const CHANNEL_LABEL = { email: 'Email', whatsapp: 'WhatsApp' };
const PROBLEM_LABEL = { failed: 'Failed', bounced: 'Bounced', complained: 'Marked as spam' };

function Bar({ label, value, of, tone = 'bg-indigo-600', note }) {
  const pct = of > 0 ? Math.round((value / of) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}{note ? <span className="text-gray-400"> · {note}</span> : null}</span>
        <span className="tabular-nums">{value}{of > 0 ? ` (${pct}%)` : ''}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-2 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CampaignDetails({ id, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await getCampaignDetail(id));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const email = detail?.delivery?.email;
  const whatsapp = detail?.delivery?.whatsapp;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="campaign-detail-title">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
          <div className="min-w-0">
            <h3 id="campaign-detail-title" className="text-lg font-semibold text-gray-900 truncate">{detail?.name || 'Campaign'}</h3>
            {detail && (
              <p className="text-xs text-gray-500">
                {new Date(detail.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {detail.createdBy} · {detail.recipientCount} recipients
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={load} disabled={loading} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {detail && (
            <>
              <div className="text-sm text-gray-700 space-y-1">
                {detail.subject && <p><span className="text-gray-500">Email subject:</span> {detail.subject}{detail.emailStyle === 'plain' ? ' (plain style)' : ''}</p>}
                {detail.template && <p><span className="text-gray-500">WhatsApp template:</span> {detail.template}</p>}
              </div>

              {whatsapp && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-800">WhatsApp</p>
                  <Bar label="Sent" value={whatsapp.accepted} of={whatsapp.accepted + whatsapp.failed + whatsapp.pending} />
                  <Bar label="Delivered" value={whatsapp.delivered} of={whatsapp.accepted} tone="bg-green-600" />
                  <Bar label="Read" value={whatsapp.read} of={whatsapp.accepted} tone="bg-emerald-500" note="only for people with read receipts on" />
                  {whatsapp.failed > 0 && <Bar label="Failed" value={whatsapp.failed} of={whatsapp.accepted + whatsapp.failed} tone="bg-red-500" />}
                  {whatsapp.pending > 0 && <p className="text-xs text-gray-500">{whatsapp.pending} not sent yet.</p>}
                </div>
              )}

              {email && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Email</p>
                  <Bar label="Sent" value={email.accepted} of={email.accepted + email.failed + email.pending} />
                  <Bar label="Delivered" value={email.delivered} of={email.accepted} tone="bg-green-600" note="reached the inbox server (inbox or spam)" />
                  {email.waiting > 0 && <Bar label="Waiting for a delivery report" value={email.waiting} of={email.accepted} tone="bg-gray-400" />}
                  {email.bounced > 0 && <Bar label="Bounced" value={email.bounced} of={email.accepted} tone="bg-red-500" />}
                  {email.complained > 0 && <Bar label="Marked as spam" value={email.complained} of={email.accepted} tone="bg-red-700" />}
                  {email.failed > 0 && <Bar label="Failed to send" value={email.failed} of={email.accepted + email.failed} tone="bg-red-500" />}
                  {email.pending > 0 && <p className="text-xs text-gray-500">{email.pending} not sent yet (daily email allowance).</p>}
                </div>
              )}

              {detail.problems.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-2">Didn&apos;t work for</p>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                    {detail.problems.map(p => (
                      <div key={`${p.channel}-${p.uid}`} className="px-3 py-2 text-sm">
                        <p className="text-gray-900">{p.name || 'Unnamed'} <span className="text-gray-500">· {p.school || 'No school'}</span></p>
                        <p className="text-xs text-gray-600">{CHANNEL_LABEL[p.channel]}: {PROBLEM_LABEL[p.status] || p.status}{p.reason ? ` — ${p.reason}` : ''}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">People who marked an email as spam are unsubscribed automatically; addresses that don&apos;t exist are skipped in future campaigns.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
