'use client'
import React, { useState } from 'react';

// Step 4: test, confirm, send. The confirm dialog spells out who gets what,
// including how the daily email allowance spreads a large email send.

const STATUS_TEXT = {
  sending: 'Sending…',
  sent: 'Sent',
  partial: 'Sent, with some failures',
  failed: 'Failed',
  paused_quota: "Paused: today's email allowance is used up. It continues automatically tomorrow.",
};

export default function SendSection({
  name, onNameChange, mode, counts, emailToday, audienceSummary,
  onTest, testing, testResult, testError,
  onSend, sending, progress, sendError, canSend, blockers,
}) {
  const [confirming, setConfirming] = useState(false);
  const [testEmail, setTestEmail] = useState(true);
  const [testNumber, setTestNumber] = useState('');
  const showEmail = mode !== 'whatsapp';
  const showWhatsApp = mode !== 'email';

  const emailsToday = counts ? Math.min(counts.email, emailToday.remaining) : 0;
  const emailsLater = counts ? counts.email - emailsToday : 0;

  const confirmSend = () => {
    setConfirming(false);
    onSend();
  };

  const total = (c) => (c ? c.targeted : 0);
  const done = (c) => (c ? c.sent + c.failed : 0);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">4. Test and send</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Send a test to yourself</p>
          {showEmail && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={testEmail} onChange={(e) => setTestEmail(e.target.checked)} className="accent-indigo-600" />
              Email to my admin address
            </label>
          )}
          {showWhatsApp && (
            <input
              type="tel"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="WhatsApp number for the test, e.g. 08012345678"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          <button
            type="button"
            onClick={() => onTest({ sendEmail: showEmail && testEmail, whatsappNumber: showWhatsApp ? testNumber.trim() : '' })}
            disabled={testing || !canSend}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? 'Sending test…' : 'Send test'}
          </button>
          {testResult && <p className="text-sm text-green-700">{testResult}</p>}
          {testError && <p className="text-sm text-red-600">{testError}</p>}
        </div>

        <div className="space-y-3">
          <label htmlFor="campaign-name" className="block text-sm font-medium text-gray-700">Campaign name (for your records)</label>
          <input
            id="campaign-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Lead City dormant sellers, October"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {blockers.length > 0 && (
            <ul className="text-sm text-amber-700 list-disc pl-5">{blockers.map(b => <li key={b}>{b}</li>)}</ul>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!canSend || sending || !counts || counts.reachable === 0}
            className="w-full py-3 text-base font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Review and send
          </button>
        </div>
      </div>

      {(progress || sendError) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          {sendError && <p className="text-sm text-red-600">{sendError}</p>}
          {progress && (
            <>
              <p className="text-sm font-medium text-gray-900">{STATUS_TEXT[progress.status] || progress.status}</p>
              {[['WhatsApp', progress.counts?.whatsapp], ['Email', progress.counts?.email]].filter(([, c]) => total(c) > 0).map(([label, c]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{label}</span>
                    <span>{c.sent} sent{c.failed ? ` · ${c.failed} failed` : ''} of {c.targeted}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-2 bg-indigo-600 transition-all" style={{ width: `${Math.round((done(c) / total(c)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {confirming && counts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 id="confirm-title" className="text-lg font-semibold text-gray-900">Send to {counts.reachable} {counts.reachable === 1 ? 'person' : 'people'}?</h3>
            <p className="text-sm text-gray-600">{audienceSummary}</p>
            <ul className="text-sm text-gray-800 space-y-1">
              {counts.whatsapp > 0 && <li>WhatsApp: <strong>{counts.whatsapp}</strong> (Meta charges per marketing message delivered)</li>}
              {counts.email > 0 && (
                <li>
                  Email: <strong>{counts.email}</strong>
                  {emailsLater > 0 && (
                    <span className="block text-amber-700">
                      {emailsToday} today, the other {emailsLater} over the next days (daily allowance {emailToday.allowance}).
                    </span>
                  )}
                </li>
              )}
            </ul>
            <p className="text-xs text-gray-500">This can&apos;t be undone once sent.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={confirmSend} className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Send now</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
