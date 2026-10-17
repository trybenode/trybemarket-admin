import { requireAdminPages } from '@/lib/requireAdmin';
import { prepareContent, renderEmail, renderWhatsAppValues, getFooterLookup, reserveEmails } from '@/lib/campaigns';
import { sendEmail } from '@/lib/mailer';
import { sendTemplateMessage } from '@/lib/whatsapp';
import { sendCampaignError } from '@/lib/campaignApi';

const WHATSAPP_NUMBER_RE = /^234[789]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/campaigns/test { mode, content, testEmail?, whatsappNumber? }
 * Sends the campaign once as a test, to the email address and/or WhatsApp
 * number the admin enters (the page pre-fills their admin email). Uses the
 * admin's name for placeholders and puts [TEST] in the subject.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const admin = await requireAdminPages(req, res);
  if (!admin) return;

  try {
    const { mode, content, testEmail, whatsappNumber } = req.body || {};
    const prepared = await prepareContent(mode, content);
    const recipient = { uid: admin.uid, fullName: admin.name, school: 'Lead City University of Ibadan' };
    const result = {};

    const to = String(testEmail || '').trim();
    if (to && prepared.email) {
      if (!EMAIL_RE.test(to)) return res.status(400).json({ error: 'Enter a valid email address for the test.' });
      if ((await reserveEmails(1)) < 1) return res.status(400).json({ error: "Today's email allowance is used up." });
      const footerFor = await getFooterLookup();
      const email = renderEmail(prepared.email, recipient, footerFor, { test: true });
      const sent = await sendEmail({ to, ...email });
      result.email = { to, id: sent.id };
    }

    if (whatsappNumber && prepared.whatsapp) {
      const to = String(whatsappNumber).replace(/\D/g, '').replace(/^0/, '234');
      if (!WHATSAPP_NUMBER_RE.test(to)) return res.status(400).json({ error: 'Enter a Nigerian WhatsApp number, e.g. 08012345678.' });
      const values = renderWhatsAppValues(prepared.whatsapp, recipient);
      const sent = await sendTemplateMessage({ to, template: prepared.whatsapp.template, values });
      result.whatsapp = { to, messageId: sent.messageId };
    }

    if (!result.email && !result.whatsapp) return res.status(400).json({ error: 'Choose where to send the test.' });
    return res.status(200).json(result);
  } catch (error) {
    return sendCampaignError(res, error, 'test');
  }
}
