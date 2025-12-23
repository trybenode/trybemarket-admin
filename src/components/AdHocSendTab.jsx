'use client';

import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, Mail, Package } from 'lucide-react';
import { sendEmail } from '@/utils/email';

const getInitialFormData = () => ({
  templateId: 'PRODUCT_DELIST',
  recipient: '',
  productId: '',
  delistReason: '',
  adminName: 'Admin Team',
  customSubject: '',
  customBody: '',
});

export default function AdHocSendTab() {
  const [formData, setFormData] = useState(getInitialFormData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isDelist = formData.templateId === 'PRODUCT_DELIST';

  // Reset irrelevant fields when template changes
  useEffect(() => {
    if (isDelist) {
      setFormData(prev => ({
        ...prev,
        recipient: '',
        customSubject: '',
        customBody: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        productId: '',
        delistReason: '',
      }));
    }
    setMessage('');
    setError('');
  }, [formData.templateId]);

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
      // Validation
      if (isDelist) {
        if (!formData.productId.trim()) throw new Error('Product ID is required');
        if (!formData.delistReason.trim()) throw new Error('Delisting reason is required');
      } else {
        if (!formData.recipient.trim()) throw new Error('Recipient email is required');
        if (!formData.customSubject.trim()) throw new Error('Subject is required');
        if (!formData.customBody.trim()) throw new Error('Email body is required');
      }
      if (!formData.adminName.trim()) throw new Error('Your name (signature) is required');

      const response = await sendEmail(formData.templateId, formData);

      setMessage(`Email sent successfully! ID: ${response.messageId}`);
      setFormData(getInitialFormData());
    } catch (err) {
      setError(err.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="p-6 md:p-8 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <Mail className="w-5 h-5 text-indigo-600" />
          Send Targeted Email
        </h3>
        <p className="mt-2 text-gray-600">Choose a template and send a transactional or custom message</p>
      </div>

      <form onSubmit={handleSend} className="p-6 md:p-8 space-y-7">
        {/* Template Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Email Purpose</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'PRODUCT_DELIST', label: 'Product Delisting Notice', desc: 'Auto-fetches seller & product', icon: AlertCircle },
              { id: 'CUSTOM_OUTREACH', label: 'Custom One-Off Message', desc: 'Free-form email', icon: Mail },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-4 p-5 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.templateId === opt.id
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300 bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="templateId"
                  value={opt.id}
                  checked={formData.templateId === opt.id}
                  onChange={handleChange}
                  className="mt-1.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <opt.icon className={`w-5 h-5 ${formData.templateId === opt.id ? 'text-indigo-600' : 'text-gray-500'}`} />
                    <span className="font-medium text-gray-900">{opt.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Conditional Fields */}
        {isDelist ? (
          <div className="space-y-5 p-6 bg-red-50/50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 text-red-800 font-semibold">
              <Package className="w-5 h-5" />
              Product Delisting Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product ID</label>
                <input
                  type="text"
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  required
                  placeholder="e.g., prod_1a2b3c"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                />
                <p className="mt-2 text-xs text-gray-600">System will auto-lookup seller email and product name</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Delisting</label>
                <input
                  type="text"
                  name="delistReason"
                  value={formData.delistReason}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Counterfeit item, policy violation"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-6 bg-emerald-50/50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <Mail className="w-5 h-5" />
              Custom Message
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email</label>
                <input
                  type="email"
                  name="recipient"
                  value={formData.recipient}
                  onChange={handleChange}
                  required
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  name="customSubject"
                  value={formData.customSubject}
                  onChange={handleChange}
                  required
                  placeholder="Important: Action required on your account"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                <textarea
                  name="customBody"
                  rows={7}
                  value={formData.customBody}
                  onChange={handleChange}
                  required
                  placeholder="Hi there,&#10;&#10;We're writing to let you know..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition font-medium"
                />
                {/* <p className="mt-2 text-xs text-gray-600">Use {'{{adminName}}'} to insert your name automatically</p> */}
              </div>
            </div>
          </div>
        )}

        {/* Admin Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Name (for signature)</label>
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

        {/* Messages */}
        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium flex items-center gap-2">
            Email sent successfully
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium flex items-center gap-2">
            Warning: {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>Sending...</>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Email Now
            </>
          )}
        </button>
      </form>
    </div>
  );
}