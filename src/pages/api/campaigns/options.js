import { requireAdminPages } from '@/lib/requireAdmin';
import { SEGMENT_KEYS, SEGMENT_LABELS, NO_SCHOOL, getSchoolsInUse } from '@/lib/audience';
import { MODES, getCampaignSettings, getEmailUsageToday } from '@/lib/campaigns';
import { getMarketingTemplates } from '@/lib/whatsapp';
import { PLACEHOLDERS } from '@/lib/messageFormat';

/**
 * GET /api/campaigns/options — what the Campaigns page needs to build a
 * campaign: segments, schools, approved WhatsApp templates, settings and
 * today's email allowance. A WhatsApp setup problem doesn't stop email
 * campaigns, so it comes back as templatesError instead of failing.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const admin = await requireAdminPages(req, res);
  if (!admin) return;

  try {
    const [schools, settings, emailToday, templates] = await Promise.all([
      getSchoolsInUse(),
      getCampaignSettings(),
      getEmailUsageToday(),
      getMarketingTemplates().then(
        (list) => ({ list }),
        (error) => ({ list: [], error: error.message })
      ),
    ]);
    return res.status(200).json({
      segments: SEGMENT_KEYS.map(key => ({ key, label: SEGMENT_LABELS[key] })),
      schools: schools.map(s => ({ value: s.name ?? NO_SCHOOL, label: s.name ?? 'No school set', users: s.users })),
      modes: Object.entries(MODES).map(([key, label]) => ({ key, label })),
      placeholders: PLACEHOLDERS,
      templates: templates.list,
      templatesError: templates.error || null,
      settings,
      emailToday,
      admin: { name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error('Campaign options error:', error);
    return res.status(500).json({ error: 'Could not load campaign options.' });
  }
}
