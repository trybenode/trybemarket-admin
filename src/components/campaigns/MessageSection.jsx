'use client'
import React, { useRef } from 'react';

// Step 2: what the message says. Email is free text in the simple format
// from src/lib/messageFormat.js; WhatsApp fills an approved template.

// Sensible starting values for common template variables.
export const DEFAULT_TEMPLATE_VALUES = {
  customer_name: '{{firstName|there}}',
  school_name: '{{school|your campus}}',
};

const EMAIL_STYLES = [
  { key: 'branded', label: 'Branded', description: 'Logo banner and card layout' },
  { key: 'plain', label: 'Plain', description: 'Looks like a personal email, signed by you. More likely to reach Gmail’s Primary tab.' },
];

export default function MessageSection({ options, mode, email, whatsapp, onEmailChange, onWhatsAppChange, adminName = '' }) {
  const bodyRef = useRef(null);
  const showEmail = mode !== 'whatsapp';
  const showWhatsApp = mode !== 'email';
  const template = options.templates.find(t => t.name === whatsapp.templateName);

  // Wraps the selection (or inserts at the cursor) in the email body.
  const insert = (before, after = '', placeholderText = '') => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? email.body.length;
    const end = el.selectionEnd ?? email.body.length;
    const selected = email.body.slice(start, end) || placeholderText;
    const next = email.body.slice(0, start) + before + selected + after + email.body.slice(end);
    onEmailChange({ ...email, body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const chooseTemplate = (name) => {
    const t = options.templates.find(x => x.name === name);
    const variables = {};
    (t?.variables || []).forEach(v => { variables[v] = whatsapp.variables?.[v] ?? DEFAULT_TEMPLATE_VALUES[v] ?? ''; });
    onWhatsAppChange({ templateName: name, variables });
  };

  const toolbarButton = 'px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50';

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">2. Message</h2>
        <p className="text-sm text-gray-500">
          Placeholders: {Object.keys(options.placeholders).map(p => `{{${p}}}`).join(', ')}. Add a fallback for missing values, e.g. {'{{firstName|there}}'}.
        </p>
      </div>

      {showWhatsApp && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">WhatsApp</h3>
          {options.templatesError ? (
            <p className="text-sm text-red-600">WhatsApp templates couldn&apos;t be loaded: {options.templatesError}</p>
          ) : options.templates.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No approved Marketing templates yet. Create them in Meta (WhatsApp Manager → Message templates); they appear here once approved.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="campaign-template" className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <select
                  id="campaign-template"
                  value={whatsapp.templateName}
                  onChange={(e) => chooseTemplate(e.target.value)}
                  className="w-full md:w-1/2 text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose an approved template…</option>
                  {options.templates.map(t => (
                    <option key={`${t.name}-${t.language}`} value={t.name} disabled={!t.supported}>
                      {t.name} · {t.category === 'utility' ? 'Utility' : 'Marketing'}{t.supported ? '' : ' (needs header/button values, not supported)'}
                    </option>
                  ))}
                </select>
              </div>
              {template && (
                <>
                  <p className="text-xs text-gray-600">
                    {template.category === 'utility'
                      ? 'Utility: about the student’s account (e.g. finish KYC) — no offers. Goes to people with WhatsApp message alerts on, and isn’t held back by Meta’s limit on marketing messages.'
                      : 'Marketing: offers and promotions. Goes only to people who opted in to offers on WhatsApp; Meta may hold some back (error 131049) to limit marketing per person.'}
                  </p>
                  <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-line">{template.body}</p>
                  {template.variables.map(v => (
                    <div key={v}>
                      <label htmlFor={`wa-var-${v}`} className="block text-sm font-medium text-gray-700 mb-1">{`{{${v}}}`}</label>
                      <input
                        id={`wa-var-${v}`}
                        type="text"
                        value={whatsapp.variables?.[v] ?? ''}
                        onChange={(e) => onWhatsAppChange({ ...whatsapp, variables: { ...whatsapp.variables, [v]: e.target.value } })}
                        placeholder={DEFAULT_TEMPLATE_VALUES[v] || 'One sentence, no line breaks'}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {showEmail && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Email</h3>
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Style</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EMAIL_STYLES.map(s => (
                <label
                  key={s.key}
                  className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm ${email.style === s.key ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <input
                    type="radio"
                    name="email-style"
                    value={s.key}
                    checked={email.style === s.key}
                    onChange={() => onEmailChange({
                      ...email,
                      style: s.key,
                      // Start the sign-off with the admin's first name.
                      senderName: email.senderName || (s.key === 'plain' ? String(adminName).trim().split(/\s+/)[0] || '' : ''),
                    })}
                    className="mt-1 accent-indigo-600"
                  />
                  <span>
                    <span className="font-medium">{s.label}</span>
                    <span className="block text-xs text-gray-500">{s.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          {email.style === 'plain' && (
            <div>
              <label htmlFor="campaign-sender" className="block text-sm font-medium text-gray-700 mb-1">Sign off as</label>
              <input
                id="campaign-sender"
                type="text"
                maxLength={40}
                value={email.senderName}
                onChange={(e) => onEmailChange({ ...email, senderName: e.target.value })}
                placeholder="e.g. Allen"
                className="w-full md:w-1/2 text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {`Inbox shows “${(email.senderName || 'Name').trim()} from TrybeMarket”. Replies still go to contact@trybemarket.online.`}
              </p>
            </div>
          )}
          <div>
            <label htmlFor="campaign-subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              id="campaign-subject"
              type="text"
              value={email.subject}
              onChange={(e) => onEmailChange({ ...email, subject: e.target.value })}
              placeholder="e.g. {{firstName|Hey}}, buyers at {{school|your campus}} are waiting"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label htmlFor="campaign-body" className="block text-sm font-medium text-gray-700">Message</label>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={toolbarButton} onClick={() => insert('**', '**', 'bold text')}>Bold</button>
                <button type="button" className={toolbarButton} onClick={() => insert('[', '](https://www.trybemarket.online)', 'link text')}>Link</button>
                <button type="button" className={toolbarButton} onClick={() => insert('\n- ', '', 'list item')}>List</button>
                {Object.keys(options.placeholders).map(p => (
                  <button key={p} type="button" className={toolbarButton} onClick={() => insert(`{{${p}}}`)}>{`{{${p}}}`}</button>
                ))}
              </div>
            </div>
            <textarea
              id="campaign-body"
              ref={bodyRef}
              rows={10}
              value={email.body}
              onChange={(e) => onEmailChange({ ...email, body: e.target.value })}
              placeholder={'Hi {{firstName|there}},\n\nStudents at {{school|your campus}} are shopping on TrybeMarket right now.\n\n[List an item](https://www.trybemarket.online/product-upload)'}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">Blank line = new paragraph · **bold** · [text](https://…) · lines starting with “- ” become a list. The footer with the school&apos;s branch address and unsubscribe link is added automatically.</p>
          </div>
        </div>
      )}
    </section>
  );
}
