'use client'
import React, { useState } from "react";
import { attributeReferral } from "@/utils/crsa";

// Credit a student to an ambassador when they were onboarded without the
// referral link (normal signup page, or on the ambassador's own phone). The
// automatic attribution only works at signup, so these need an admin.

const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50";

export default function AttributeReferralForm({ members, onDone }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const active = members.filter((m) => m.active).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  const ambassador = active.find((m) => m.referralCode === code);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!confirm(`Credit ${email.trim()} to ${ambassador?.fullName || code} (${code})?\n\nIf the student is already verified, it counts for the ambassador straight away. This can't be changed from here afterwards.`)) return;
    setSaving(true);
    try {
      const result = await attributeReferral(email.trim(), code, reason.trim());
      setMessage(
        result.counted
          ? `Credited to ${code}. Their KYC was counted for ${ambassador?.fullName || "the ambassador"}${result.installCounted ? ", and their app install" : ""}.`
          : `Credited to ${code}. It will count for ${ambassador?.fullName || "the ambassador"} once the student verifies KYC.`
      );
      setEmail("");
      setReason("");
      await onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Credit a student to an ambassador</h2>
        <p className="text-sm text-gray-600">
          For students an ambassador onboarded without their referral link (for example on the normal signup page or on the
          ambassador&apos;s own phone). Referral links only attach at signup, so these need to be added here.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="The student's TrybeMarket account email"
          aria-label="Student email"
          disabled={saving}
          className={inputClass}
        />
        <select value={code} onChange={(e) => setCode(e.target.value)} disabled={saving} aria-label="Ambassador" className={inputClass}>
          <option value="">Choose the ambassador…</option>
          {active.map((m) => (
            <option key={m.uid} value={m.referralCode}>{m.fullName || "Unnamed"} · {m.referralCode}</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
        placeholder="Reason (kept on the student's record), e.g. Signed up on the ambassador's phone without the link"
        aria-label="Reason"
        disabled={saving}
        className={inputClass}
      />
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving || !email.trim() || !code || reason.trim().length < 3}
        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Crediting…" : "Credit student"}
      </button>
    </form>
  );
}
