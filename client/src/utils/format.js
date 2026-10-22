// "1.2K" / "1.2千" style short numbers
export const compact = (n, lang) =>
  new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en', { notation: 'compact' }).format(n || 0);

// "3 days ago" / "3天前"
export function timeAgo(date, lang) {
  if (!date) return '';
  const diff = (new Date(date) - Date.now()) / 1000; // negative = in the past
  const rtf = new Intl.RelativeTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { numeric: 'auto' });
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(0, 'minute');
}
