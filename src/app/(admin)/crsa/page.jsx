'use client'
import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import AttributeReferralForm from "@/components/crsa/AttributeReferralForm";
import {
  getCrsaLeaderboard,
  addCrsaMember,
  setCrsaMemberActive,
  buildReferralLink,
} from "@/utils/crsa";

function Page() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyUid, setBusyUid] = useState(null);
  const [copiedUid, setCopiedUid] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setMembers(await getCrsaLeaderboard());
    } catch (error) {
      console.error("Error fetching CRSA members:", error);
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setAdding(true);
      const result = await addCrsaMember(email.trim());
      await fetchMembers();
      setEmail('');
      alert(
        result.created
          ? `Member added. Their referral code is ${result.referralCode}.`
          : result.reactivated
            ? "Member reactivated with their original referral code."
            : "That user is already an active CRSA member."
      );
    } catch (error) {
      console.error("Error adding CRSA member:", error);
      alert(error.message || "Failed to add member. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (member) => {
    const action = member.active ? 'deactivate' : 'reactivate';
    const warning = member.active
      ? "\n\nTheir CRSA badge will be removed and new referrals will no longer count for them. Counts already earned are kept."
      : "";
    if (!confirm(`Are you sure you want to ${action} ${member.fullName}?${warning}`)) return;

    try {
      setBusyUid(member.uid);
      await setCrsaMemberActive(member.uid, !member.active);
      await fetchMembers();
    } catch (error) {
      console.error("Error updating CRSA member:", error);
      alert(error.message || "Failed to update member. Please try again.");
    } finally {
      setBusyUid(null);
    }
  };

  const handleCopyLink = async (member) => {
    const link = buildReferralLink(member.referralCode);
    if (!link) {
      alert("NEXT_PUBLIC_WEB_APP_URL is not set, so a full link can't be built. The code is " + member.referralCode);
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopiedUid(member.uid);
      setTimeout(() => setCopiedUid((current) => (current === member.uid ? null : current)), 2000);
    } catch {
      alert(`Couldn't copy automatically. The link is:\n${link}`);
    }
  };

  const stats = {
    total: members.length,
    active: members.filter((m) => m.active).length,
    verified: members.reduce((sum, m) => sum + (m.kycCompletions || 0), 0),
    installs: members.reduce((sum, m) => sum + (m.installs || 0), 0),
  };

  const filteredMembers = filterStatus === 'all'
    ? members
    : members.filter((m) => (filterStatus === 'active') === m.active);

  return (
    <div className="space-y-6">
      <PageHeader
        HeaderText="CRSA Management"
        SubHeaderText="Add Course Rep Student Ambassadors and track the verified students they refer"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-4">
              <p className="text-sm text-red-700">{loadError}</p>
              <button
                onClick={fetchMembers}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total Members</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  <p className="text-sm text-gray-600">Active Members</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.verified}</p>
                  <p className="text-sm text-gray-600">Verified Referrals</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.installs}</p>
                  <p className="text-sm text-gray-600">App Installs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Add Member */}
          <form onSubmit={handleAddMember} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Add a Course Rep Student Ambassador</h2>
            <p className="text-sm text-gray-600 mb-4">
              They must already have a TrybeMarket account. A unique referral link is generated automatically;
              re-adding a deactivated member restores their original code so links they already shared keep working.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Their TrybeMarket account email"
                disabled={adding}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={adding || !email.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>

          {/* Credit a student onboarded without the referral link */}
          <AttributeReferralForm members={members} onDone={fetchMembers} />

          {/* Filter Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-semibold text-gray-700">Filter by Status:</span>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active ({stats.active})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'inactive'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inactive ({stats.total - stats.active})
              </button>
            </div>
          </div>

          {/* Members / Leaderboard Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ambassador</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Referral Code</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Verified Referrals</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Installs</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">#{member.rank}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-indigo-600 font-semibold text-sm">
                              {member.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{member.fullName || 'N/A'}</p>
                            <p className="text-xs text-gray-500">User ID: {member.uid?.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-gray-100 rounded-md text-sm font-mono text-gray-800">
                          {member.referralCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">{member.kycCompletions}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{member.installs}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          member.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleCopyLink(member)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                          >
                            {copiedUid === member.uid ? 'Copied!' : 'Copy Link'}
                          </button>
                          <button
                            onClick={() => handleToggleActive(member)}
                            disabled={busyUid === member.uid}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              member.active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {busyUid === member.uid ? 'Saving...' : member.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredMembers.length === 0 && !loadError && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {members.length === 0
                    ? "No CRSA members yet. Add the first one above."
                    : "No members match this filter."}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Page;
