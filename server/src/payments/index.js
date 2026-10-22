import Stripe from 'stripe';

// ---- Settings (all in server/.env) --------------------------------------------------
//   ENTRY_FEES       the price per submission in each currency the entrant can choose, e.g.
//                    CNY:600,DKK:600,EUR:80,USD:90      (empty = free entry, payments switched off)
//                    (older setting ENTRY_FEE_CNY=600 still works and means CNY only)
//   PAYMENT_PROVIDER "stripe"  cards + WeChat Pay, money goes to the owner's Stripe account
//                    "manual"  bank transfer: entrants get the bank details, an organizer marks "paid"
//                    "mock"    fake test page, no real money
//   ALLOW_BANK_TRANSFER=true   with "stripe": also offer bank transfer as a second way to pay
// To use another provider later (for example a Chinese one), add a branch in
// createCheckout() below. The rest of the website does not need to change.
// --------------------------------------------------------------------------------------

const CURRENCIES = ['CNY', 'DKK', 'EUR', 'USD'];

// { CNY: 60000, DKK: 60000, EUR: 8000, USD: 9000 }  (amounts in minor units: fen, øre, cent)
export function feeTable() {
  const out = {};
  const list = process.env.ENTRY_FEES || (process.env.ENTRY_FEE_CNY ? `CNY:${process.env.ENTRY_FEE_CNY}` : '');
  for (const part of list.split(',')) {
    const [cur, val] = part.split(':').map((x) => x?.trim());
    const code = cur?.toUpperCase();
    const n = Number(val);
    if (CURRENCIES.includes(code) && Number.isFinite(n) && n > 0) out[code] = Math.round(n * 100);
  }
  return out;
}
export const paymentsEnabled = () => Object.keys(feeTable()).length > 0;
export const defaultCurrency = () => (feeTable().CNY ? 'CNY' : Object.keys(feeTable())[0]);
// The currency the entrant asked for, if we offer it, otherwise the default one
export const pickCurrency = (wanted) => {
  const code = String(wanted || '').toUpperCase();
  return feeTable()[code] ? code : defaultCurrency();
};
export const providerName = () => (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
export const bankTransferOffered = () => providerName() === 'manual' || process.env.ALLOW_BANK_TRANSFER === 'true';
// Short code the entrant writes in the bank transfer remarks, so the organizers can match the payment
export const referenceFor = (entry) => `BH-${String(entry._id).slice(-8).toUpperCase()}`;

let stripe;
export const getStripe = () => (stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY));

const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

// Creates a payment page for one entry. Returns { ref, url }: send the visitor to url.
export async function createCheckout(entry, { lang } = {}) {
  const id = String(entry._id);

  if (providerName() === 'mock') {
    return { ref: `mock_${id}`, url: `${clientUrl()}/pay/mock?entry=${id}` };
  }

  if (providerName() === 'manual') {
    return { ref: referenceFor(entry), url: `${clientUrl()}/pay/manual?entry=${id}` };
  }

  if (providerName() === 'stripe') {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      // Payment methods (cards, WeChat Pay) are no longer listed here: Stripe now reads them from
      // Dashboard > Settings > Payment methods. WeChat Pay is offered when the currency is cny.
      line_items: [{
        quantity: 1,
        price_data: {
          currency: (entry.currency || 'CNY').toLowerCase(),
          unit_amount: entry.amount,
          product_data: { name: `Entry fee: ${entry.workTitle}` }
        }
      }],
      customer_email: entry.email,
      client_reference_id: id,
      metadata: { entryId: id },
      locale: lang === 'en' ? 'en' : 'zh',
      success_url: `${clientUrl()}/payment/success?entry=${id}`,
      cancel_url: `${clientUrl()}/payment/cancel?entry=${id}`
    });
    return { ref: session.id, url: session.url };
  }

  throw new Error(`Unknown PAYMENT_PROVIDER "${process.env.PAYMENT_PROVIDER}"`);
}
