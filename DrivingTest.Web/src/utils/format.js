/** Backend trả UTC; nếu thiếu hậu tố múi giờ thì coi như UTC. */
export function parseUtc(value) {
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

const locale = (lang) => (lang === 'en' ? 'en-GB' : 'vi-VN');

export function formatDateTime(value, lang) {
  const d = parseUtc(value);
  return d ? new Intl.DateTimeFormat(locale(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(d) : '';
}

export function formatNumber(n, lang) {
  return new Intl.NumberFormat(locale(lang)).format(n ?? 0);
}

const pad = (n) => String(n).padStart(2, '0');

/** ms → "mm:ss" */
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** giây → "mm:ss" */
export function formatDuration(seconds) {
  return formatClock((seconds ?? 0) * 1000);
}

export const TOPIC_ICONS = {
  rules: '📘',
  signs: '🚸',
  scenarios: '🛣️',
  'driving-skills': '🚗',
  vehicle: '🔧',
  ethics: '🤝'
};
