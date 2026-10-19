import { requireAdminPages } from '@/lib/requireAdmin';
import { adminDb } from '@/lib/firebaseAdmin';
import { prepareContent, renderEmail, renderWhatsAppValues, getFooterLookup } from '@/lib/campaigns';
import { renderTemplateText } from '@/lib/whatsapp';
import { DEFAULT_FROM } from '@/lib/mailer';
import { sendCampaignError } from '@/lib/campaignApi';

/**
 * POST /api/campaigns/preview { mode, content, uid? }
 * The email and WhatsApp message one recipient would get — `uid` picks the
 * recipient (from the audience sample); without it, a stand-in student.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const admin = await requireAdminPages(req, res);
  if (!admin) return;

  try {
    const { mode, content, uid } = req.body || {};
    const prepared = await prepareContent(mode, content);

    let recipient = { uid: null, fullName: 'Tolu Adeyemi', school: 'Lead City University of Ibadan' };
    if (uid) {
      const snap = await adminDb.collection('users').doc(String(uid)).get();
      if (snap.exists) recipient = { uid: snap.id, fullName: snap.data().fullName || '', school: snap.data().selectedUniversity || '' };
    }

    const result = { recipient: { fullName: recipient.fullName, school: recipient.school } };
    if (prepared.email) {
      const footerFor = await getFooterLookup();
      const email = renderEmail(prepared.email, recipient, footerFor);
      result.email = { subject: email.subject, html: email.html, from: email.from || DEFAULT_FROM };
    }
    if (prepared.whatsapp) {
      const values = renderWhatsAppValues(prepared.whatsapp, recipient);
      result.whatsapp = { text: renderTemplateText(prepared.whatsapp.template, values), values };
    }
    return res.status(200).json(result);
  } catch (error) {
    return sendCampaignError(res, error, 'preview');
  }
}
