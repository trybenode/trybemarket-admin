// Server-only: WhatsApp Cloud API for campaigns (08-campaign-messaging.md §5.3).
//
// Promotional WhatsApp messages can only use templates Meta has approved, so
// campaigns pick one of the account's approved Marketing templates and fill
// its variables per recipient. Uses the same system-user token and phone
// number as the web app's message alerts.
//
// Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
//      WHATSAPP_BUSINESS_ACCOUNT_ID (to list templates), WHATSAPP_API_URL (optional).

const API_URL = (process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0').replace(/\/$/, '');

export class WhatsAppError extends Error {
  constructor(message, { code = null, status = null } = {}) {
    super(message);
    this.name = 'WhatsAppError';
    this.code = code;
    this.status = status;
    // Meta's throughput limit — wait and retry, the message wasn't refused.
    this.isRateLimit = code === 130429 || code === 80007;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new WhatsAppError(`${name} is not set, so WhatsApp messages cannot be sent.`);
  return value;
}

async function graph(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireEnv('WHATSAPP_ACCESS_TOKEN')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const err = data.error || {};
    throw new WhatsAppError(err.error_user_msg || err.message || `WhatsApp request failed (${response.status})`, {
      code: err.code ?? null,
      status: response.status,
    });
  }
  return data;
}

// {{customer_name}} (named) or {{1}} (positional), in order of first use.
function templateVariables(text) {
  const names = [];
  for (const match of String(text || '').matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

/**
 * The account's APPROVED Marketing templates that campaigns can send:
 * [{ name, language, body, variables: [...], parameterFormat, buttons, footer }].
 * Templates whose header or buttons need per-message values are left out —
 * campaigns only fill body variables.
 */
export async function getMarketingTemplates() {
  const wabaId = requireEnv('WHATSAPP_BUSINESS_ACCOUNT_ID');
  const templates = [];
  let after = null;
  do {
    const page = await graph(
      `/${wabaId}/message_templates?fields=name,status,category,language,components,parameter_format&limit=100${after ? `&after=${after}` : ''}`
    );
    templates.push(...(page.data || []));
    after = page.paging?.next ? page.paging?.cursors?.after : null;
  } while (after);

  return templates
    .filter(t => t.status === 'APPROVED' && t.category === 'MARKETING')
    .map(t => {
      const components = t.components || [];
      const body = components.find(c => c.type === 'BODY')?.text || '';
      const header = components.find(c => c.type === 'HEADER');
      const buttons = components.find(c => c.type === 'BUTTONS')?.buttons || [];
      const needsExtraValues =
        (header && (header.format !== 'TEXT' || templateVariables(header.text).length > 0)) ||
        buttons.some(b => b.type === 'URL' && /\{\{/.test(b.url || ''));
      return {
        name: t.name,
        language: t.language,
        body,
        footer: components.find(c => c.type === 'FOOTER')?.text || '',
        header: header?.format === 'TEXT' ? header.text : '',
        variables: templateVariables(body),
        parameterFormat: t.parameter_format === 'POSITIONAL' || /\{\{\s*\d+\s*\}\}/.test(body) ? 'POSITIONAL' : 'NAMED',
        buttons: buttons.map(b => ({ type: b.type, text: b.text, url: b.url || null })),
        supported: !needsExtraValues,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sends one template message. `values` maps each body variable name to its
 * text for this recipient. Returns { messageId }. Throws WhatsAppError.
 */
export async function sendTemplateMessage({ to, template, values }) {
  const phoneNumberId = requireEnv('WHATSAPP_PHONE_NUMBER_ID');
  const parameters = template.variables.map(name => ({
    type: 'text',
    ...(template.parameterFormat === 'NAMED' ? { parameter_name: name } : {}),
    text: values[name],
  }));
  const data = await graph(`/${phoneNumberId}/messages`, {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        ...(parameters.length ? { components: [{ type: 'body', parameters }] } : {}),
      },
    },
  });
  return { messageId: data.messages?.[0]?.id || null };
}

/** The template body with values filled in — what the recipient will read. */
export function renderTemplateText(template, values) {
  return String(template.body || '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, name) => values[name] ?? `{{${name}}}`);
}
