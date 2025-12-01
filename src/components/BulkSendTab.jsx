'use client';

import React, { useState } from 'react';
import { Megaphone, Users, Loader2 } from 'lucide-react';
import { sendBulkEmail } from '@/utils/email';

const initialFormData = {
  target: 'all_users',
  subject: '',
  body: '',
  adminName: 'Admin Team',
};

// Simplified audience
const audiences = {
  all_users: { name: 'All Registered Users', count: 'All', color: 'indigo' },
};

export default function BulkSendTab() {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedAudience = audiences.all_users;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

      const response = await sendBulkEmail(formData);

      setMessage(
        `Bulk send initiated successfully! Job ID: ${response.jobId}. Target: ${response.totalAttempted.toLocaleString()} users.`
      );

      setFormData((prev) => ({ ...initialFormData, adminName: prev.adminName }));
    } catch (err) {
      setError(err.message || 'Failed to start bulk send job. Check API logs.');
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
        <p className="mt-2 text-gray-600">
          This system queues the job into Firestore for background processing.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSend} className="p-6 md:p-8 space-y-8">
        {/* Audience Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            Target Audience
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <label className="relative p-6 rounded-xl border-2 cursor-pointer transition-all border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100">
              <input
                type="radio"
                name="target"
                value={selectedAudience.target}
                checked={true}
                onChange={handleChange}
                className="sr-only"
              />
              <div className="text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-indigo-600" />
                <div className="font-semibold text-lg text-indigo-700">{selectedAudience.name}</div>
                <div className="text-3xl font-black mt-2 text-gray-900">{selectedAudience.count}</div>
                <div className="text-sm text-gray-500">users</div>
              </div>
            </label>
          </div>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm font-medium">
            ⚠️ Warning: This will query all users in the 'users' collection. Please ensure your query cost expectations are met.
          </div>
        </div>

        {/* Email Content */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Newsletter Subject
            </label>
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

        {/* Feedback Messages */}
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

        {/* Submit Button */}
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
              Initiate Bulk Send Job
            </>
          )}
        </button>
      </form>
    </div>
  );
}
