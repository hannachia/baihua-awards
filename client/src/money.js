// Amounts are stored in minor units (fen, øre, cent): 60000 CNY shows as ¥600
export const money = (minor, currency = 'CNY', lang = 'en') =>
  new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en', {
    style: 'currency', currency, minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2
  }).format((minor || 0) / 100);
