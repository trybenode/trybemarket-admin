'use client'
import React, { useState } from 'react';
import { revokeGrant } from '@/utils/offersClient';

// Recent gifts and promotion grants, with Revoke.

const when = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function describe(g) {
  if (g.kind === 'boost') return `${g.count} free boost${g.count === 1 ? '' : 's'} (${g.durationDays} days each)`;
  return `${g.planName || g.planId} for ${g.durationDays} days${g.action === 'extended' ? ' (extended their plan)' : ''}`;
}

function sourceText(g) {
  if (g.source?.type === 'promotion') return `Promotion: ${g.source.promotionName || 'promotion'}`;
  return `Gift by ${g.source?.adminName || 'admin'}${g.source?.note ? ` — ${g.source.note}` : ''}`;
}

export default function GrantsSection({ grants, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRevoke = async (g) => {
    const who = g.user?.name || 'this person';
    const text = g.kind === 'boost'
      ? `Take back ${who}'s unused free boosts? Boosts already applied to a listing stay.`
      : `Take back ${who}'s free ${g.planName}? ${g.action === 'extended' ? 'Their plan goes back to its earlier end date.' : 'It ends now.'}`;
    if (!confirm(text)) return;
    setBusyId(g.id);
    setError('');
    setMessage('');
    try {
      const r = await revokeGrant(g.id);
      setMessage(r.kind === 'boost'
        ? `Revoked: ${r.cancelled} unused boost${r.cancelled === 1 ? '' : 's'} cancelled${r.alreadyUsed ? `, ${r.alreadyUsed} already used` : ''}.`
        : r.planChanged ? 'Revoked.' : 'Revoked. Their plan had already changed since (e.g. they bought one), so it was left as is.');
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Recent gifts</h2>
      <p className="text-sm text-gray-500 mb-4">The last 50, from promotions and manual gifts.</p>
      {message && <p className="text-sm text-green-700 mb-3">{message}</p>}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {grants.length === 0 ? (
        <p className="text-sm text-gray-500">No gifts yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {grants.map(g => (
            <div key={g.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {g.user?.name || 'Unknown user'} <span className="text-gray-500">· {g.user?.school || 'No school'}</span>
                </p>
                <p className="text-xs text-gray-600">{describe(g)}</p>
                <p className="text-xs text-gray-500">
                  {sourceText(g)} · {when(g.createdAt)}{g.kind === 'plan' && g.expiresAt && g.status === 'active' ? ` · ends ${when(g.expiresAt)}` : ''}
                </p>
              </div>
              <div className="shrink-0">
                {g.status === 'revoked' ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">Revoked {when(g.revokedAt)}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRevoke(g)}
                    disabled={busyId === g.id}
                    className="text-xs font-medium px-2.5 py-1 rounded-md border border-gray-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busyId === g.id ? 'Revoking…' : 'Revoke'}
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
