import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Entry from '../models/Entry.js';
import { sendMail, confirmationEmail } from '../mailer.js';
import { createCheckout, getStripe, providerName, referenceFor, bankTransferOffered } from '../payments/index.js';

const r = Router();
const limit = rateLimit({ windowMs: 10 * 60 * 1000, max: 40, message: { errors: ['Too many requests. Please try again later.'] } });
const statusLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 300, message: { errors: ['Too many requests. Please try again later.'] } });
const validId = (id) => mongoose.isValidObjectId(id);

// Marks an entry as paid exactly once (safe if the provider sends the same event twice),
// then sends the confirmation email.
export async function markPaid(entryId, { ref, amount, currency } = {}) {
  if (!validId(entryId)) return false;
  const entry = await Entry.findById(entryId);
  if (!entry || entry.paymentStatus === 'paid') return false;
  if (currency && entry.currency && entry.currency.toLowerCase() !== String(currency).toLowerCase()) {
    console.warn(`Payment currency mismatch for ${entryId}: expected ${entry.currency}, got ${currency}`);
    return false;
  }
  if (entry.amount && amount && entry.amount !== amount) {
    console.warn(`Payment amount mismatch for ${entryId}: expected ${entry.amount}, got ${amount}`);
    return false;
  }
  const updated = await Entry.findOneAndUpdate(
    { _id: entryId, paymentStatus: { $ne: 'paid' } },
    { $set: { paymentStatus: 'paid', paidAt: new Date(), ...(ref ? { paymentRef: ref } : {}) } },
    { new: true }
  );
  if (!updated) return false;
  sendMail(confirmationEmail(updated)).catch((err) => console.error(err.message));
  return true;
}

// Asks Stripe directly whether this entry's payment session was paid. Used by the status page and
// by "Pay now", so an entry is confirmed even if the webhook message was missed.
async function syncStripePayment(entry) {
  if (entry.paymentStatus !== 'unpaid' || providerName() !== 'stripe' || !entry.paymentRef?.startsWith('cs_')) return entry;
  try {
    const s = await getStripe().checkout.sessions.retrieve(entry.paymentRef);
    if (s.payment_status === 'paid') {
      await markPaid(String(entry._id), { ref: s.id, amount: s.amount_total, currency: s.currency });
      return (await Entry.findById(entry._id)) || entry;
    }
  } catch (err) { console.error('Could not check payment with Stripe:', err.message); }
  return entry;
}

// Stripe tells us here when a payment succeeded. Mounted in index.js with the RAW body,
// because the signature check needs the exact bytes.
export async function stripeWebhook(req, res) {
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  try {
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      const s = event.data.object;
      if (s.payment_status === 'paid') {
        await markPaid(s.metadata?.entryId, { ref: s.id, amount: s.amount_total, currency: s.currency });
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(500).end(); // Stripe will retry
  }
}

// Public: is this entry paid? (the success page checks this)
r.get('/status/:entryId', statusLimit, async (req, res, next) => {
  try {
    if (!validId(req.params.entryId)) return res.status(404).json({ errors: ['Entry not found.'] });
    let e = await Entry.findById(req.params.entryId);
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    e = await syncStripePayment(e);
    res.json({ status: e.paymentStatus, amount: e.amount, currency: e.currency || 'CNY', reference: referenceFor(e), bankTransfer: bankTransferOffered() });
  } catch (e) { next(e); }
});

// Public: get a fresh payment page for an unpaid entry (payment cancelled or link failed)
r.post('/retry', limit, async (req, res, next) => {
  try {
    const { entryId, lang } = req.body || {};
    if (!validId(entryId)) return res.status(404).json({ errors: ['Entry not found.'] });
    let e = await Entry.findById(entryId);
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    e = await syncStripePayment(e); // never ask someone to pay twice
    if (e.paymentStatus === 'paid') return res.status(409).json({ errors: ['This entry is already paid.'] });
    if (e.paymentStatus !== 'unpaid') return res.status(400).json({ errors: ['This entry does not need payment.'] });
    try {
      const { ref, url } = await createCheckout(e, { lang });
      e.paymentRef = ref; await e.save();
      res.json({ url });
    } catch (err) {
      console.error(err);
      res.status(502).json({ errors: ['Payment link could not be created. Please try again.'] });
    }
  } catch (e) { next(e); }
});

// TEST MODE ONLY (PAYMENT_PROVIDER=mock): the fake payment page confirms here.
r.post('/mock/confirm', limit, async (req, res, next) => {
  try {
    if (providerName() !== 'mock') return res.status(404).json({ errors: ['Entry not found.'] });
    await markPaid(req.body?.entryId, { ref: `mock_${req.body?.entryId}`, amount: undefined });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
