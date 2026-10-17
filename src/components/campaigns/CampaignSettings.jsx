'use client'
import React, { useEffect, useState } from 'react';

// Head-office address (email footer for schools without a branch) and the
// daily email allowance for campaigns.

export default function CampaignSettings({ settings, emailToday, onSave }) {
  const [address, setAddress] = useState('');
  const [allowance, setAllowance] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setAddress(settings.headOfficeAddress || '');
    setAllowance(String(settings.emailDailyAllowance));
  }, [settings]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await onSave({ headOfficeAddress: address, emailDailyAllowance: Number(allowance) });
      setMessage('Saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
      <p className="text-sm text-gray-500 mb-4">
        Emails sent today by campaigns: {emailToday.used} of {emailToday.allowance}.
      </p>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor="head-office" className="block text-sm font-medium text-gray-700 mb-1">Head-office address</label>
          <textarea
            id="head-office"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Shown in the email footer for schools without a TrybeMarket branch"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">Branch addresses are set per school in School Management.</p>
        </div>
        <div>
          <label htmlFor="email-allowance" className="block text-sm font-medium text-gray-700 mb-1">Campaign emails per day</label>
          <input
            id="email-allowance"
            type="number"
            min="0"
            step="1"
            value={allowance}
            onChange={(e) => setAllowance(e.target.value)}
            className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Resend&apos;s free plan allows 100 emails a day for everything, including KYC and chat emails from the web app. Keep this below 100.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {message && <span className="text-sm text-green-700">{message}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </section>
  );
}
