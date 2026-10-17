// Campaign message formatting: placeholders and the simple text format the
// composer uses (08-campaign-messaging.md §6). Pure functions, no I/O, so the
// same code renders previews in the browser and real sends on the server.
//
// Format:
//   blank line           → new paragraph
//   **bold**             → bold
//   [text](https://…)    → link (http/https only)
//   lines starting "- "  → bullet list
//   {{firstName}}, {{fullName}}, {{school}}, optional fallback:
//   {{firstName|there}}  → "there" when the recipient has no first name

export const PLACEHOLDERS = {
  firstName: 'First name, e.g. Tolu',
  fullName: 'Full name, e.g. Tolu Adeyemi',
  school: "The recipient's school",
};

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z]+)\s*(?:\|([^}]*))?\}\}/g;

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Placeholder names used in `text` that don't exist (e.g. a typo like {{frstName}}). */
export function findUnknownPlaceholders(text) {
  const unknown = new Set();
  for (const match of String(text || '').matchAll(PLACEHOLDER_RE)) {
    if (!(match[1] in PLACEHOLDERS)) unknown.add(match[1]);
  }
  return [...unknown];
}

// "ALLEN" / "allen" → "Allen"; mixed case like "McDonald" is left alone.
function tidyName(word) {
  if (!word) return '';
  const isSingleCase = word === word.toUpperCase() || word === word.toLowerCase();
  return isSingleCase ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word;
}

/** Placeholder values for one recipient ({ fullName, school }). */
export function recipientValues({ fullName, school } = {}) {
  const name = String(fullName || '').trim().replace(/\s+/g, ' ');
  const firstName = tidyName(name.split(' ')[0] || '');
  return {
    firstName,
    fullName: name.split(' ').map(tidyName).join(' '),
    school: String(school || '').trim(),
  };
}

/**
 * Replaces {{placeholders}} in `text`. `escapeValue` is applied to recipient
 * values only — the template text (including fallbacks) is the caller's
 * responsibility.
 */
export function fillPlaceholders(text, values, escapeValue = (v) => v) {
  return String(text || '').replace(PLACEHOLDER_RE, (_, name, fallback) => {
    const value = values?.[name];
    if (value) return escapeValue(value);
    return (fallback ?? '').trim();
  });
}

const LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BOLD_RE = /\*\*([^*\n]+)\*\*/g;

function inlineHtml(escapedLine) {
  return escapedLine
    .replace(LINK_RE, (_, label, url) =>
      `<a href="${url}" style="color:#4c7bfc;text-decoration:underline;">${label}</a>`)
    .replace(BOLD_RE, '<strong>$1</strong>');
}

/**
 * Composer text → email HTML for one recipient. The admin's text is escaped
 * first, then formatting is applied, then recipient values are inserted
 * (escaped) — so neither the admin's text nor a user's own name can inject
 * HTML or formatting.
 */
export function formatEmailHtml(text, values) {
  const escaped = escapeHtml(String(text || '').replace(/\r\n?/g, '\n').trim());
  const blocks = escaped.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const html = blocks.map(block => {
    const lines = block.split('\n');
    if (lines.every(l => /^\s*[-*]\s+/.test(l))) {
      const items = lines.map(l => `<li style="margin:0 0 6px;">${inlineHtml(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('');
      return `<ul style="margin:0 0 16px;padding-left:22px;">${items}</ul>`;
    }
    return `<p style="margin:0 0 16px;">${lines.map(inlineHtml).join('<br>')}</p>`;
  }).join('\n');
  return fillPlaceholders(html, values, escapeHtml);
}

/** Composer text → plain-text email body (the text/plain alternative). */
export function formatEmailText(text, values) {
  return fillPlaceholders(
    String(text || '').replace(/\r\n?/g, '\n').trim()
      .replace(LINK_RE, '$1 ($2)')
      .replace(BOLD_RE, '$1'),
    values
  );
}

/** Subject line for one recipient (plain text). */
export function formatSubject(subject, values) {
  return fillPlaceholders(String(subject || ''), values).replace(/\s+/g, ' ').trim();
}

/**
 * A WhatsApp template variable value for one recipient. Meta rejects values
 * with line breaks, tabs or more than 4 spaces in a row, and empty values.
 */
export function formatWhatsAppValue(text, values) {
  return fillPlaceholders(String(text || ''), values)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}
