'use client'
import React, { useState } from 'react';
import { updateSchool } from '@/utils/schoolManagement';

// TrybeMarket's own branch at a school — the address and support contacts
// shown at the bottom of campaign messages to that school's students.
// Separate from the university's own address (the school's `location`).

const EMPTY = { address: '', supportWhatsApp: '', supportEmail: '' };

// Accepts 08012345678, 8012345678, 2348012345678 or +234 801 234 5678 and
// returns 2348012345678 (the format WhatsApp needs), or null if it isn't a
// Nigerian mobile number (those start 7, 8 or 9 after the 0 / 234).
export function toWhatsAppNumber(input) {
  const digits = (input || '').replace(/\D/g, '');
  if (/^234[789]\d{9}$/.test(digits)) return digits;
  if (/^0[789]\d{9}$/.test(digits)) return `234${digits.slice(1)}`;
  if (/^[789]\d{9}$/.test(digits)) return `234${digits}`;
  return null;
}

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function SchoolBranchCard({ schoolId, branch, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setForm({ ...EMPTY, ...(branch || {}) });
    setErrors({});
    setEditing(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const next = {
      address: form.address.trim(),
      supportWhatsApp: form.supportWhatsApp.trim(),
      supportEmail: form.supportEmail.trim(),
    };
    const nextErrors = {};
    if (next.supportWhatsApp) {
      const normalized = toWhatsAppNumber(next.supportWhatsApp);
      if (!normalized) nextErrors.supportWhatsApp = 'Use a Nigerian number, e.g. 08012345678';
      else next.supportWhatsApp = normalized;
    }
    if (next.supportEmail && !isEmail(next.supportEmail)) {
      nextErrors.supportEmail = 'Enter a valid email address';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setSaving(true);
      await updateSchool(schoolId, { branch: next });
      setEditing(false);
      await onSaved?.();
    } catch (error) {
      console.error('Error saving branch:', error);
      alert('Failed to save branch details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm';
  const hasBranch = branch && (branch.address || branch.supportWhatsApp || branch.supportEmail);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">TrybeMarket Branch</h3>
          <p className="text-sm text-gray-500">Shown at the bottom of campaign messages to students at this school.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {hasBranch ? 'Edit' : 'Set up branch'}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="branch-address" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Branch address</label>
            <textarea
              id="branch-address"
              name="address"
              rows={2}
              value={form.address}
              onChange={handleChange}
              placeholder="e.g. Shop 4, Student Centre, Lead City University, Ibadan"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="branch-whatsapp" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Support WhatsApp</label>
              <input
                id="branch-whatsapp"
                name="supportWhatsApp"
                type="tel"
                value={form.supportWhatsApp}
                onChange={handleChange}
                placeholder="08012345678"
                className={inputClass}
              />
              {errors.supportWhatsApp && <p className="mt-1 text-xs text-red-600">{errors.supportWhatsApp}</p>}
            </div>
            <div>
              <label htmlFor="branch-email" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Support email</label>
              <input
                id="branch-email"
                name="supportEmail"
                type="email"
                value={form.supportEmail}
                onChange={handleChange}
                placeholder="leadcity@trybemarket.online"
                className={inputClass}
              />
              {errors.supportEmail && <p className="mt-1 text-xs text-red-600">{errors.supportEmail}</p>}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save branch'}
            </button>
          </div>
        </form>
      ) : hasBranch ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Branch address</p>
            <p className="text-sm text-gray-900 whitespace-pre-line">{branch.address || '—'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Support WhatsApp</p>
              <p className="text-sm text-gray-900">{branch.supportWhatsApp ? `+${branch.supportWhatsApp}` : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Support email</p>
              <p className="text-sm text-gray-900">{branch.supportEmail || '—'}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No branch yet. Until one is set, messages to students here use the head-office address.
        </p>
      )}
    </div>
  );
}
