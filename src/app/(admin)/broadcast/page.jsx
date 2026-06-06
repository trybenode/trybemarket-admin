'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../../components/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, limit as fbLimit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

// ─── Channel Config ───
const CHANNELS = [
  {
    id: 'push',
    label: 'Push Notification',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    description: 'Mobile app notification',
  },
  {
    id: 'email',
    label: 'Email',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Email notification',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    description: 'WhatsApp message (requires approved template)',
  },
];

const AUDIENCE_TYPES = [
  { id: 'all', label: 'All Users', description: 'Send to every registered user' },
  { id: 'segment', label: 'User Segment', description: 'Target a specific group' },
  { id: 'individual', label: 'Individual Users', description: 'Pick specific users' },
];

const SEGMENTS = [
  { id: 'verified_sellers', label: 'Verified Sellers' },
  { id: 'unverified', label: 'Unverified Users' },
  { id: 'university', label: 'By University' },
  { id: 'premium', label: 'Premium Subscribers' },
];

export default function BroadcastPage() {
  const { adminData } = useAuth();

  // Form state
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [audienceType, setAudienceType] = useState('all');
  const [segment, setSegment] = useState('');
  const [university, setUniversity] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // UI state
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');

  // Data state
  const [universities, setUniversities] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch universities for the segment dropdown
  useEffect(() => {
    async function fetchSchools() {
      try {
        const snap = await getDocs(collection(db, 'schools'));
        const names = [];
        snap.forEach((doc) => {
          const name = doc.data().name;
          if (name) names.push(name);
        });
        setUniversities(names.sort());
      } catch (err) {
        console.error('Error fetching schools:', err);
      }
    }
    fetchSchools();
  }, []);

  // Fetch users when "individual" audience is selected
  useEffect(() => {
    if (audienceType !== 'individual') return;
    async function fetchUsers() {
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), orderBy('fullName'), fbLimit(500))
        );
        const list = [];
        snap.forEach((doc) => {
          const d = doc.data();
          list.push({
            id: doc.id,
            name: d.fullName || d.email || 'Unknown',
            email: d.email || '',
            university: d.selectedUniversity || '',
          });
        });
        setUsers(list);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    }
    fetchUsers();
  }, [audienceType]);

  // Fetch broadcast history
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/broadcast/history?limit=20');
      const data = await res.json();
      if (data.success) setHistory(data.logs || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  const toggleChannel = (id) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const canSend =
    selectedChannels.length > 0 &&
    body.trim() &&
    (audienceType !== 'segment' || segment) &&
    (segment !== 'university' || university) &&
    (audienceType !== 'individual' || selectedUserIds.length > 0);

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    setError('');
    setResult(null);

    const payload = {
      channels: selectedChannels,
      audience: {
        type: audienceType,
        segment: audienceType === 'segment' ? segment : undefined,
        university: segment === 'university' ? university : undefined,
        userIds: audienceType === 'individual' ? selectedUserIds : undefined,
      },
      title: title || 'TrybeMarket',
      subject: subject || title || 'Message from TrybeMarket',
      body,
      adminName: adminData?.name || 'Admin',
    };

    try {
      const res = await fetch('/api/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Broadcast failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSelectedChannels([]);
    setAudienceType('all');
    setSegment('');
    setUniversity('');
    setSelectedUserIds([]);
    setTitle('');
    setSubject('');
    setBody('');
    setResult(null);
    setError('');
  };

  // ─── Audience summary text ───
  const getAudienceSummary = () => {
    if (audienceType === 'all') return 'all users';
    if (audienceType === 'individual') return `${selectedUserIds.length} selected user(s)`;
    if (segment === 'verified_sellers') return 'verified sellers';
    if (segment === 'unverified') return 'unverified users';
    if (segment === 'university') return `users from ${university || '...'}`;
    if (segment === 'premium') return 'premium subscribers';
    return '...';
  };

  return (
    <main className="container mx-auto">
      <div className="space-y-6">
        <PageHeader
          HeaderText="Broadcast Center"
          SubHeaderText="Send push notifications, emails, and WhatsApp messages to your users."
        />

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2">
          <nav className="flex space-x-2 md:space-x-4">
            {[
              { id: 'compose', name: 'Compose Broadcast' },
              { id: 'history', name: 'Broadcast History' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3 md:px-5 font-semibold text-sm rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="space-y-6">
            {/* Success result */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-green-800 font-semibold text-lg mb-3">Broadcast Sent Successfully</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {result.results?.push && (
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <p className="text-sm text-gray-500">Push</p>
                      <p className="text-xl font-bold text-green-700">{result.results.push.sent} sent</p>
                      {result.results.push.failed > 0 && (
                        <p className="text-sm text-red-500">{result.results.push.failed} failed</p>
                      )}
                    </div>
                  )}
                  {result.results?.email && (
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-xl font-bold text-green-700">{result.results.email.sent} sent</p>
                      {result.results.email.failed > 0 && (
                        <p className="text-sm text-red-500">{result.results.email.failed} failed</p>
                      )}
                    </div>
                  )}
                  {result.results?.whatsapp && (
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <p className="text-sm text-gray-500">WhatsApp</p>
                      <p className="text-xl font-bold text-green-700">{result.results.whatsapp.sent} sent</p>
                      {result.results.whatsapp.failed > 0 && (
                        <p className="text-sm text-red-500">{result.results.whatsapp.failed} failed</p>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Reached {result.recipientCount} recipient(s). Total delivered: {result.totalSent}
                </p>
                <button
                  onClick={resetForm}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                >
                  Send Another
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            {!result && (
              <>
                {/* Step 1: Select Channels */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">1. Select Channels</h2>
                  <p className="text-sm text-gray-500 mb-4">Choose how to reach your users</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {CHANNELS.map((ch) => {
                      const active = selectedChannels.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          onClick={() => toggleChannel(ch.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                            active
                              ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className={active ? 'text-indigo-600' : 'text-gray-400'}>{ch.icon}</span>
                          <div>
                            <p className={`font-medium text-sm ${active ? 'text-indigo-700' : 'text-gray-700'}`}>
                              {ch.label}
                            </p>
                            <p className="text-xs text-gray-400">{ch.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Choose Audience */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">2. Choose Audience</h2>
                  <p className="text-sm text-gray-500 mb-4">Who should receive this message?</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {AUDIENCE_TYPES.map((at) => {
                      const active = audienceType === at.id;
                      return (
                        <button
                          key={at.id}
                          onClick={() => {
                            setAudienceType(at.id);
                            setSegment('');
                            setUniversity('');
                            setSelectedUserIds([]);
                          }}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            active
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <p className={`font-medium text-sm ${active ? 'text-indigo-700' : 'text-gray-700'}`}>
                            {at.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{at.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Segment selector */}
                  {audienceType === 'segment' && (
                    <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                      <label className="block text-sm font-medium text-gray-700">Select Segment</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SEGMENTS.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSegment(s.id)}
                            className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                              segment === s.id
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      {segment === 'university' && (
                        <select
                          value={university}
                          onChange={(e) => setUniversity(e.target.value)}
                          className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select University</option>
                          {universities.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Individual user picker */}
                  {audienceType === 'individual' && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {selectedUserIds.length > 0 && (
                        <p className="text-sm text-indigo-600 font-medium mb-2">
                          {selectedUserIds.length} user(s) selected
                        </p>
                      )}
                      <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {filteredUsers.slice(0, 100).map((u) => {
                          const selected = selectedUserIds.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              onClick={() => toggleUser(u.id)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                                selected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                  selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                                }`}
                              >
                                {selected && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                              </div>
                            </button>
                          );
                        })}
                        {filteredUsers.length === 0 && (
                          <p className="text-sm text-gray-400 p-4 text-center">No users found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Compose Message */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">3. Compose Message</h2>
                  <p className="text-sm text-gray-500 mb-4">Write your broadcast message</p>

                  <div className="space-y-4">
                    {selectedChannels.includes('push') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Push Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="TrybeMarket"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    )}

                    {selectedChannels.includes('email') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Subject
                        </label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Message from TrybeMarket"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message Body <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Type your message here..."
                        rows={6}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                      />
                      <p className="text-xs text-gray-400 mt-1">{body.length} characters</p>
                    </div>
                  </div>
                </div>

                {/* Send Button */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    Reset Form
                  </button>
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!canSend || sending}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md ${
                      canSend && !sending
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Send Broadcast'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {loadingHistory ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="animate-spin h-6 w-6 mx-auto mb-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-lg font-medium mb-1">No broadcasts yet</p>
                <p className="text-sm">Your broadcast history will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((log) => (
                  <div key={log.id} className="p-5 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 truncate">
                          {log.subject || 'Broadcast'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{log.body}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {log.channels?.map((ch) => (
                            <span
                              key={ch}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"
                            >
                              {ch}
                            </span>
                          ))}
                          <span className="text-xs text-gray-400">
                            {log.audience?.type === 'all'
                              ? 'All users'
                              : log.audience?.type === 'segment'
                              ? `Segment: ${log.audience?.segment}`
                              : `${log.recipientCount} user(s)`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-green-600">{log.totalSent} sent</p>
                        {log.totalFailed > 0 && (
                          <p className="text-xs text-red-500">{log.totalFailed} failed</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(log.createdAt).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-400">by {log.adminName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Confirm Broadcast</h3>
              <p className="text-sm text-gray-600 mb-4">
                You are about to send a broadcast via{' '}
                <span className="font-medium text-indigo-600">{selectedChannels.join(', ')}</span> to{' '}
                <span className="font-medium text-indigo-600">{getAudienceSummary()}</span>.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Message preview</p>
                <p className="text-sm text-gray-700 line-clamp-3">{body}</p>
              </div>
              <p className="text-xs text-amber-600 mb-4">
                This action cannot be undone. Messages will be sent immediately.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition shadow-md"
                >
                  Confirm & Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
