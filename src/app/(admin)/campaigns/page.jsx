'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import AudienceSection from '@/components/campaigns/AudienceSection';
import MessageSection from '@/components/campaigns/MessageSection';
import PreviewSection from '@/components/campaigns/PreviewSection';
import SendSection from '@/components/campaigns/SendSection';
import CampaignHistory from '@/components/campaigns/CampaignHistory';
import CampaignSettings from '@/components/campaigns/CampaignSettings';
import {
  getCampaignOptions, listCampaigns, previewAudience, previewMessage,
  sendTest, createCampaign, saveCampaignSettings, runCampaign,
} from '@/utils/campaignClient';

// Campaigns: segment- and school-targeted WhatsApp and email
// (08-campaign-messaging.md). Server logic lives in src/lib/campaigns.js.

const EMPTY_AUDIENCE = { segments: [], schools: [], kyc: null, signedUpWithinDays: null };

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function CampaignsPage() {
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState('');

  const [audience, setAudience] = useState(EMPTY_AUDIENCE);
  const [mode, setMode] = useState('whatsapp_then_email');
  const [email, setEmail] = useState({ subject: '', body: '' });
  const [whatsapp, setWhatsApp] = useState({ templateName: '', variables: {} });
  const [name, setName] = useState('');

  const [counts, setCounts] = useState(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState('');

  const [previewRecipient, setPreviewRecipient] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [testError, setTestError] = useState('');

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);
  const [sendError, setSendError] = useState('');

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');
  const [resumingId, setResumingId] = useState(null);

  const loadOptions = useCallback(async () => {
    try {
      setOptions(await getCampaignOptions());
      setOptionsError('');
    } catch (err) {
      setOptionsError(err.message);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaigns(await listCampaigns());
      setCampaignsError('');
    } catch (err) {
      setCampaignsError(err.message);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    loadCampaigns();
  }, [loadOptions, loadCampaigns]);

  // Live audience counts. Only the latest request may update the numbers.
  const debouncedAudience = useDebounced(audience, 400);
  const countsRequest = useRef(0);
  useEffect(() => {
    if (!options) return;
    const id = ++countsRequest.current;
    setCountsLoading(true);
    previewAudience(debouncedAudience, mode)
      .then((c) => { if (id === countsRequest.current) { setCounts(c); setCountsError(''); } })
      .catch((err) => { if (id === countsRequest.current) setCountsError(err.message); })
      .finally(() => { if (id === countsRequest.current) setCountsLoading(false); });
  }, [debouncedAudience, mode, options]);

  const content = useMemo(() => ({ email, whatsapp }), [email, whatsapp]);

  // What's still missing before the campaign can be previewed or sent.
  const blockers = useMemo(() => {
    const list = [];
    if (mode !== 'email') {
      const t = options?.templates.find(x => x.name === whatsapp.templateName);
      if (!t) list.push('Choose a WhatsApp template.');
      else if (t.variables.some(v => !String(whatsapp.variables?.[v] || '').trim())) list.push('Fill in every WhatsApp template value.');
    }
    if (mode !== 'whatsapp') {
      if (!email.subject.trim()) list.push('Add an email subject.');
      if (!email.body.trim()) list.push('Write the email message.');
    }
    return list;
  }, [mode, options, whatsapp, email]);
  const canSend = blockers.length === 0;

  const previewRequest = useRef(0);
  const refreshPreview = useCallback(async () => {
    if (!canSend) {
      setPreview(null);
      setPreviewError('');
      return;
    }
    const id = ++previewRequest.current;
    setPreviewLoading(true);
    try {
      const p = await previewMessage(mode, content, previewRecipient?.uid);
      if (id === previewRequest.current) { setPreview(p); setPreviewError(''); }
    } catch (err) {
      if (id === previewRequest.current) setPreviewError(err.message);
    } finally {
      if (id === previewRequest.current) setPreviewLoading(false);
    }
  }, [canSend, mode, content, previewRecipient]);

  const debouncedContent = useDebounced(content, 700);
  useEffect(() => {
    refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent, mode, previewRecipient, canSend]);

  const audienceSummary = useMemo(() => {
    if (!options) return '';
    const segLabel = Object.fromEntries(options.segments.map(s => [s.key, s.label]));
    const schoolLabel = Object.fromEntries(options.schools.map(s => [s.value, s.label]));
    const parts = [
      audience.segments.length ? audience.segments.map(s => segLabel[s]).join(', ') : 'All users',
      audience.schools.length ? `at ${audience.schools.map(s => schoolLabel[s] || s).join(', ')}` : 'at all schools',
    ];
    if (audience.kyc) parts.push(audience.kyc === 'verified' ? '(KYC verified)' : '(not KYC verified)');
    if (audience.signedUpWithinDays) parts.push(`who signed up in the last ${audience.signedUpWithinDays} days`);
    return `${parts.join(' ')}.`;
  }, [audience, options]);

  const handleTest = async ({ sendEmail, whatsappNumber }) => {
    setTesting(true);
    setTestResult('');
    setTestError('');
    try {
      const r = await sendTest({ mode, content, sendEmail, whatsappNumber });
      setTestResult([r.email && `Email sent to ${r.email.to}`, r.whatsapp && `WhatsApp sent to +${r.whatsapp.to}`].filter(Boolean).join(' · '));
      loadOptions(); // today's email count changed
    } catch (err) {
      setTestError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const run = async (id) => {
    const final = await runCampaign(id, (p) => {
      setProgress(p);
      setCampaigns(prev => prev.map(c => (c.id === id ? { ...c, status: p.status, counts: p.counts } : c)));
    });
    await Promise.all([loadCampaigns(), loadOptions()]);
    return final;
  };

  const handleSend = async () => {
    setSending(true);
    setSendError('');
    setProgress(null);
    try {
      const created = await createCampaign({ name, mode, audience, content });
      setProgress({ status: 'sending', counts: { whatsapp: { targeted: created.whatsapp, sent: 0, failed: 0 }, email: { targeted: created.email, sent: 0, failed: 0 } } });
      await loadCampaigns();
      await run(created.id);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleResume = async (id) => {
    setResumingId(id);
    setSendError('');
    try {
      await run(id);
    } catch (err) {
      setCampaignsError(err.message);
    } finally {
      setResumingId(null);
    }
  };

  const handleSaveSettings = async (settings) => {
    const saved = await saveCampaignSettings(settings);
    setOptions(prev => ({ ...prev, settings: saved }));
    loadOptions();
  };

  return (
    <main className="container mx-auto">
      <div className="space-y-6">
        <PageHeader
          HeaderText="Campaigns"
          SubHeaderText="Send offers and updates on WhatsApp and email to a segment of users at chosen schools."
        />

        {optionsError ? (
          <div className="bg-white rounded-xl border border-red-200 p-6 text-sm text-red-600">
            Couldn&apos;t load campaign options: {optionsError}
          </div>
        ) : !options ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            <AudienceSection
              options={options}
              audience={audience}
              mode={mode}
              onAudienceChange={setAudience}
              onModeChange={setMode}
              counts={counts}
              countsLoading={countsLoading}
              countsError={countsError}
              onPreviewRecipient={setPreviewRecipient}
            />
            <MessageSection
              options={options}
              mode={mode}
              email={email}
              whatsapp={whatsapp}
              onEmailChange={setEmail}
              onWhatsAppChange={setWhatsApp}
            />
            <PreviewSection
              preview={canSend ? preview : null}
              loading={previewLoading}
              error={canSend ? previewError : ''}
              hint={canSend ? '' : 'Finish the message to see a preview.'}
              onRefresh={refreshPreview}
              previewName={previewRecipient?.fullName}
            />
            <SendSection
              name={name}
              onNameChange={setName}
              mode={mode}
              counts={counts}
              emailToday={options.emailToday}
              audienceSummary={audienceSummary}
              onTest={handleTest}
              testing={testing}
              testResult={testResult}
              testError={testError}
              onSend={handleSend}
              sending={sending}
              progress={progress}
              sendError={sendError}
              canSend={canSend}
              blockers={blockers}
            />
            <CampaignHistory
              campaigns={campaigns}
              loading={campaignsLoading}
              error={campaignsError}
              onResume={handleResume}
              resumingId={resumingId}
            />
            <CampaignSettings
              settings={options.settings}
              emailToday={options.emailToday}
              onSave={handleSaveSettings}
            />
          </>
        )}
      </div>
    </main>
  );
}
