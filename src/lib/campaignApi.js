// Shared error handling for the /api/campaigns routes: problems the admin can
// fix (bad input, missing setup) come back as 400 with a readable message.
import { CampaignError } from '@/lib/campaigns';
import { WhatsAppError } from '@/lib/whatsapp';
import { MailError } from '@/lib/mailer';

export function sendCampaignError(res, error, context) {
  if (error instanceof CampaignError) return res.status(error.status).json({ error: error.message });
  if (error instanceof WhatsAppError || error instanceof MailError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(`Campaigns ${context} error:`, error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
