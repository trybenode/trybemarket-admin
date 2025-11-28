// components/BulkSendTab.jsx
'use client';

import React, { useState } from 'react';
import { Megaphone, Users, Send, Loader2 } from 'lucide-react';
import { sendBulkEmail } from '@/utils/email';

const initialFormData = {
  target: 'all_active',
  subject: '',
  body: '',
  adminName: 'Admin Team',
};

const audiences = {
  all_active: { name: 'All Active Users', count: 12500, color: 'indigo' },
  no_login_90d: { name: 'Inactive 90+ Days', count: 3400, color: 'amber' },
  has_products: { name: 'Active Sellers', count: 8700, color: 'emerald' },
};

export default function BulkSendTab() {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedAudience = audiences[formData.target];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (!formData.subject.trim()) throw new Error('Subject is required');
      if (!formData.body.trim()) throw new Error('Email content is required');
      if (!formData.adminName.trim()) throw new Error('Your name is required');

      await sendBulkEmail(formData);

      setMessage(
        `Bulk send initiated successfully!\nTarget: ${selectedAudience.count.toLocaleString()} users`
      );
    } catch (err) {
      setError(err.message || 'Failed to start bulk send job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Megaphone className="w-7 h-7 text-emerald-600" />
          Bulk Newsletter & Announcement Sender
        </h3>
        <p className="mt-2 text-gray-600">Send HTML newsletters to thousands of users at once</p>
      </div>

      <form onSubmit={handleSend} className="p-6 md:p-8 space-y-8">
        {/* Audience Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-4">Target Audience</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.entries(audiences).map(([key, aud]) => (
              <label
                key={key}
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.target === key
                    ? `border-${aud.color}-500 bg-${aud.color}-50 ring-4 ring-${aud.color}-100`
                    : 'border-slate-200 hover:border-slate-300 bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="target"
                  value={key}
                  checked={formData.target === key}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="text-center">
                  <Users className={`w-10 h-10 mx-auto mb-3 ${formData.target === key ? `text-${aud.color}-600` : 'text-gray-400'}`} />
                  <div className={`font-semibold text-lg ${formData.target === key ? `text-${aud.color}-700` : 'text-gray-800'}`}>
                    {aud.name}
                  </div>
                  <div className="text-3xl font-black mt-2 text-gray-900">
                    {aud.count.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">users</div>
                </div>
              </label>
            ))}
          </div>

          {/* Selected Count Highlight */}
          <div className="mt-6 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <div className="text-center">
              <div className="text-4xl font-black text-gray-900">
                {selectedAudience.count.toLocaleString()}
              </div>
              <div className="text-lg font-medium text-gray-600">
                users will receive this newsletter
              </div>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Newsletter Subject</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              placeholder="e.g., Big Summer Sale – Up to 70% Off!"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Newsletter Content (Raw HTML)
            </label>
            <textarea
              name="body"
              rows={12}
              value={formData.body}
              onChange={handleChange}
              required
              placeholder="<h1>Welcome back!</h1><p>Here's what's new this week...</p>"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition font-mono text-sm leading-relaxed"
            />
            {/* <p className="mt-2 text-xs text-gray-600">
              Paste full HTML. Supports <code className="bg-gray-200 px-1 rounded"></code>, <code className="bg-gray-200 px-1 rounded">{{firstName}}</code>, and <code className="bg-gray-200 px-1 rounded">{{adminName}}</code>
            </p> */}
          </div>
        </div>

        {/* Admin Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name (for signature)
          </label>
          <input
            type="text"
            name="adminName"
            value={formData.adminName}
            onChange={handleChange}
            required
            placeholder="Admin Team"
            className="w-full max-w-md px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
          />
        </div>

        {/* Feedback */}
        {message && (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium">
            {message}
          </div>
        )}
        {error && (
          <div className="p-5 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
            Error: {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !formData.subject || !formData.body}
          className="w-full py-5 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold text-xl rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-4 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-7 h-7 animate-spin" />
              Initiating Broadcast...
            </>
          ) : (
            <>
              <Megaphone className="w-7 h-7" />
              Send to {selectedAudience.count.toLocaleString()} Users
            </>
          )}
        </button>
      </form>
    </div>
  );
}