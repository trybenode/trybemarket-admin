'use client'
import React from 'react';

// Step 3: exactly what one recipient will get (POST /api/campaigns/preview).
// The email renders in a sandboxed iframe, so its HTML can't touch the page.

export default function PreviewSection({ preview, loading, error, hint, onRefresh, previewName }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">3. Preview</h2>
          <p className="text-sm text-gray-500">
            As {preview?.recipient?.fullName || previewName || 'a sample student'}
            {preview?.recipient?.school ? ` at ${preview.recipient.school}` : ''}. Use &ldquo;Preview as&rdquo; above to switch.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Rendering…' : 'Refresh preview'}
        </button>
      </div>

      {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {preview.whatsapp && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">WhatsApp</p>
              <div className="rounded-xl bg-[#e5ddd5] p-4">
                <div className="max-w-sm rounded-lg bg-white p-3 text-sm text-gray-900 shadow-sm whitespace-pre-line">
                  {preview.whatsapp.text}
                </div>
              </div>
            </div>
          )}
          {preview.email && (
            <div className={preview.whatsapp ? '' : 'lg:col-span-2'}>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Email</p>
              <p className="text-sm text-gray-700 mb-2"><span className="text-gray-500">Subject:</span> {preview.email.subject}</p>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={preview.email.html}
                className="w-full h-[520px] rounded-lg border border-gray-200 bg-white"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
