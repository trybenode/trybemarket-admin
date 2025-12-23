'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Users, Loader2, Mail, RefreshCw } from 'lucide-react';
import Select from 'react-select';
import { sendBulkEmail } from '@/utils/email';
import { db } from '../lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const initialFormData = {
  target: 'all_users',
  selectedEmails: [],
  subject: '',
  body: '',
  adminName: 'Admin Team',
};

const audiences = {
  all_users: { id: 'all_users', name: 'All Registered Users', icon: Users },
  specific_users: { id: 'specific_users', name: 'Specific Recipients', icon: Mail },
};

export default function BulkSendTab() {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userOptions, setUserOptions] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 1. AUTO-LOAD & CONDITIONAL AUTO-SYNC
    useEffect(() => {
      const initData = async () => {
        setLoading(true);
        
        // First, try to get what is already in the cache
        const initialUsers = await fetchCachedUsers();
        
        // If the cache is empty (e.g., first time setup or deleted), 
        // trigger the sync API automatically so the user doesn't have to click.
        if (!initialUsers || initialUsers.length === 0) {
          console.log("Cache empty, triggering auto-sync...");
          await handleSyncDatabase();
        }
        
        setLoading(false);
      };
      initData();
    }, []);

    // Update fetchCachedUsers to return the data so useEffect can check it
    const fetchCachedUsers = async () => {
      try {
        const cacheRef = doc(db, 'admin_metadata', 'user_index');
        const cacheSnap = await getDoc(cacheRef);
        
        if (cacheSnap.exists()) {
          const data = cacheSnap.data();
          const emails = data.emails || [];
          setUserOptions(emails);
          return emails; // Return data for the useEffect check
        }
        return [];
      } catch (err) {
        console.error("Error loading user cache:", err);
        return [];
      }
    };

  const handleSyncDatabase = async () => {
    setIsSyncing(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/sync-users', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        // Update local UI immediately with the data returned from the API
        if (data.dummyData || data.emails) {
          setUserOptions(data.dummyData || data.emails);
        } else {
          await fetchCachedUsers(); 
        }
        setMessage(`Successfully updated index with ${data.count} users.`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError("Sync failed: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // ... (handleChange, handleSelectChange, handleSend remain the same)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (selected) => {
    setFormData(prev => ({
      ...prev,
      selectedEmails: selected ? selected.map(opt => opt.value) : []
    }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      if (!formData.subject.trim()) throw new Error('Subject is required');
      if (!formData.body.trim()) throw new Error('Email content is required');
      if (formData.target === 'specific_users' && formData.selectedEmails.length === 0) {
        throw new Error('Please select at least one recipient');
      }
      const response = await sendBulkEmail(formData);
      setMessage(`Bulk send initiated! Target: ${response.totalAttempted} users.`);
      setFormData((prev) => ({ ...initialFormData, adminName: prev.adminName }));
    } catch (err) {
      setError(err.message || 'Failed to start bulk send job.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Header with Sync Button */}
      <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Megaphone className="w-7 h-7 text-emerald-600" />
            Bulk Communications
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {userOptions.length > 0 ? `${userOptions.length} users ready to receive.` : 'Loading users...'}
          </p>
        </div>
        
        <button
          type="button"
          onClick={handleSyncDatabase}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'SYNCING...' : 'REFRESH USER LIST'}
        </button>
      </div>

      <form onSubmit={handleSend} className="p-6 md:p-8 space-y-8">
        {/* Audience Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-4">Target Audience</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Object.values(audiences).map((aud) => (
              <label 
                key={aud.id}
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.target === aud.id 
                  ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100' 
                  : 'border-gray-100 hover:border-gray-50'
                }`}
              >
                <input type="radio" name="target" value={aud.id} checked={formData.target === aud.id} onChange={handleChange} className="sr-only" />
                <div className="flex flex-col items-center">
                  <aud.icon className={`w-10 h-10 mb-3 ${formData.target === aud.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div className={`font-bold text-lg ${formData.target === aud.id ? 'text-indigo-700' : 'text-gray-600'}`}>{aud.name}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Multi-Select Dropdown */}
        {formData.target === 'specific_users' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-sm font-medium text-gray-700">Select Recipients ({formData.selectedEmails.length})</label>
            <Select
              isMulti
              options={userOptions}
              onChange={handleSelectChange}
              placeholder="Search by email..."
              classNamePrefix="react-select"
              styles={{
                menu: (base) => ({ ...base, zIndex: 9999 }),
                control: (base) => ({ ...base, borderRadius: '0.5rem', borderColor: '#e2e8f0' })
              }}
            />
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-6">
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Subject Line"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-100 outline-none"
          />
          <textarea
            name="body"
            rows={10}
            value={formData.body}
            onChange={handleChange}
            placeholder="Email HTML Content..."
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-100 font-mono text-sm outline-none"
          />
          <input
            type="text"
            name="adminName"
            value={formData.adminName}
            onChange={handleChange}
            placeholder="Your Name"
            className="w-full max-w-md px-4 py-3 rounded-lg border border-slate-200 outline-none"
          />
        </div>

        {message && <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">{message}</div>}
        {error && <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">{error}</div>}

        <button
          type="submit"
          disabled={loading || !formData.subject || !formData.body}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:grayscale"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Megaphone />}
          Send Broadcast
        </button>
      </form>
    </div>
  );
}