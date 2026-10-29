import { Router } from 'express';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import Entry, { CATEGORIES, PROJECT_TYPES, STATUSES } from '../models/Entry.js';
import upload from '../upload.js';
import { requireAdmin } from '../middleware/auth.js';
import { saveUploaded, getDownloadUrl } from '../storage.js';
import { sendMail, confirmationEmail, paymentInstructionsEmail } from '../mailer.js';
import { paymentsEnabled, feeTable, pickCurrency, providerName, createCheckout } from '../payments/index.js';
import { markPaid } from './payments.js';

const r = Router();
const submitLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

const VIDEO_CATS = ['singing', 'dance'];
const removeFile = (f) => f && fs.unlink(f.path, () => {});

// Public: submit an entry
r.post('/', submitLimit, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'poster', maxCount: 1 }, { name: 'images', maxCount: 8 }]), async (req, res, next) => {
  try {
    const b = req.body;
    const f = req.files?.file?.[0];
    const extras = req.files?.images || [];   // pictures 2 to 9
    const everyFile = () => [req.files?.file?.[0], req.files?.poster?.[0], ...extras];
    let p = req.files?.poster?.[0];
    // The cover picture is a bonus: keep it only if it is a small JPEG, otherwise just ignore it
    if (p && (p.mimetype !== 'image/jpeg' || p.size > 2 * 1024 * 1024)) { removeFile(p); p = undefined; }
    const ratioNum = Number(b.ratio);
    const ratio = Number.isFinite(ratioNum) && ratioNum > 0 ? Math.min(2.5, Math.max(0.4, ratioNum)) : undefined;
    const errors = [];
    const age = Number(b.age);

    if (!b.name?.trim()) errors.push('Name is required.');
    if (!Number.isFinite(age) || age < 1 || age > 120) errors.push('Enter a valid age.');
    if (!/^\S+@\S+\.\S+$/.test(b.email || '')) errors.push('Enter a valid email address.');
    if (!CATEGORIES.includes(b.category)) errors.push('Choose a category.');
    if (!PROJECT_TYPES.includes(b.projectType)) errors.push('Choose who is entering.');
    if (!b.workTitle?.trim()) errors.push('Work title is required.');
    if (age < 18 && b.guardianConsent !== 'true') errors.push('Guardian consent is required for entrants under 18.');
    if (b.rulesAccepted !== 'true') errors.push('You must accept the competition rules.');
    if (b.publicConsent !== 'true') errors.push('You must agree to the public display of your entry.');

    if (VIDEO_CATS.includes(b.category) && f?.mimetype !== 'video/mp4') errors.push('Singing and dance entries need an MP4 video.');
    if (b.category === 'calligraphy-painting' && !(f && f.mimetype !== 'video/mp4')) errors.push('Calligraphy and painting entries need a JPG, PNG or PDF.');

    // Several pictures are only for photo categories, and every extra one must be a JPG or PNG
    if (extras.length) {
      const okCategory = ['calligraphy-painting', 'other'].includes(b.category);
      const okFirst = f && ['image/jpeg', 'image/png'].includes(f.mimetype);
      const okExtras = extras.every((x) => ['image/jpeg', 'image/png'].includes(x.mimetype));
      if (!okCategory || !okFirst || !okExtras) errors.push('You can add up to 9 pictures (JPG or PNG).');
    }

    if (errors.length) { everyFile().forEach(removeFile); return res.status(400).json({ errors }); }

    const stored = f ? await saveUploaded(f) : null; // local disk, or cloud storage
    const storedPoster = p ? await saveUploaded(p) : null;
    const storedExtras = [];
    for (const x of extras) storedExtras.push({ originalName: x.originalname, size: x.size, mimetype: x.mimetype, ...(await saveUploaded(x)) });
    const paying = paymentsEnabled();
    const currency = paying ? pickCurrency(b.currency) : undefined; // the entrant chooses; we only accept currencies we offer
    const entry = await Entry.create({
      name: b.name, age, email: b.email, phone: b.phone, category: b.category,
      projectType: b.projectType, workTitle: b.workTitle, organization: b.organization,
      instructor: b.instructor, guardianConsent: b.guardianConsent === 'true', publicConsent: true,
      paymentStatus: paying ? 'unpaid' : 'not_required', amount: paying ? feeTable()[currency] : undefined, currency,
      file: f && { originalName: f.originalname, size: f.size, mimetype: f.mimetype, ...stored },
      poster: p && { mimetype: 'image/jpeg', ...storedPoster }, images: storedExtras, ratio
    });
    if (paying) {
      // The confirmation email is sent after the payment succeeds. Send the visitor to the payment page.
      try {
        const { ref, url } = await createCheckout(entry, { lang: b.lang });
        entry.paymentRef = ref; await entry.save();
        if (providerName() === 'manual') sendMail(paymentInstructionsEmail(entry, url)).catch((err) => console.error(err.message));
        return res.status(201).json({ id: entry._id, checkoutUrl: url });
      } catch (err) {
        console.error(err);
        return res.status(201).json({ id: entry._id, paymentError: true }); // entry is saved, visitor can retry
      }
    }
    // Email problems must never block a saved entry
    sendMail(confirmationEmail(entry)).catch((err) => console.error(err.message));
    res.status(201).json({ id: entry._id, message: 'Entry received.' });
  } catch (e) { [req.files?.file?.[0], req.files?.poster?.[0], ...(req.files?.images || [])].forEach(removeFile); next(e); }
});

// Admin: list with optional filters
r.get('/', requireAdmin, async (req, res, next) => {
  try {
    const q = {};
    if (CATEGORIES.includes(req.query.category)) q.category = req.query.category;
    if (STATUSES.includes(req.query.status)) q.status = req.query.status;
    const entries = await Entry.find(q).sort({ createdAt: -1 }).select('-file.path -poster.path -images.path -images.key');
    res.json(entries);
  } catch (e) { next(e); }
});

// Admin: CSV export
r.get('/export.csv', requireAdmin, async (req, res, next) => {
  try {
    const rows = await Entry.find().sort({ createdAt: 1 });
    const cols = ['createdAt', 'name', 'age', 'email', 'phone', 'category', 'projectType', 'workTitle', 'organization', 'instructor', 'status', 'paymentStatus', 'currency', 'amount', 'paymentRef', 'published', 'voteCount'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map((e) => cols.map((c) => esc(e[c])).join(','))].join('\n');
    res.type('text/csv').attachment('entries.csv').send('\uFEFF' + csv);
  } catch (e) { next(e); }
});

// Admin: change status
r.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    if (!STATUSES.includes(req.body.status)) return res.status(400).json({ errors: ['Invalid status.'] });
    const e = await Entry.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    res.json(e);
  } catch (e) { next(e); }
});

// Admin: confirm a payment by hand (bank transfer, cash...) or undo it. Confirming sends the confirmation email.
r.patch('/:id/payment', requireAdmin, async (req, res, next) => {
  try {
    const e = await Entry.findById(req.params.id);
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    if (req.body.status === 'paid') {
      if (e.paymentStatus === 'not_required') return res.status(400).json({ errors: ['This entry does not need payment.'] });
      await markPaid(String(e._id), { ref: e.paymentRef || 'manual' });
    } else if (req.body.status === 'unpaid') {
      if (e.paymentStatus === 'paid') { e.paymentStatus = 'unpaid'; e.paidAt = undefined; e.published = false; await e.save(); }
    } else return res.status(400).json({ errors: ['Something went wrong on the server.'] });
    const fresh = await Entry.findById(e._id).select('paymentStatus paidAt published');
    res.json({ paymentStatus: fresh.paymentStatus, published: fresh.published });
  } catch (err) { next(err); }
});

// Admin: show / hide an entry on the public gallery
r.patch('/:id/publish', requireAdmin, async (req, res, next) => {
  try {
    const publish = req.body.published === true;
    const e = await Entry.findById(req.params.id);
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    if (publish && e.paymentStatus === 'unpaid') return res.status(400).json({ errors: ['This entry has not been paid yet.'] });
    if (publish && !e.publicConsent) return res.status(400).json({ errors: ['This entrant did not agree to public display.'] });
    e.published = publish;
    if (publish && !e.publishedAt) e.publishedAt = new Date();
    await e.save();
    res.json({ id: e._id, published: e.published });
  } catch (e) { next(e); }
});

// Admin: download picture number n of an entry (0 = the main file, 1 and up = the extra pictures)
r.get('/:id/image/:n', requireAdmin, async (req, res, next) => {
  try {
    const e = await Entry.findById(req.params.id);
    const n = Number(req.params.n);
    const f = e && Number.isInteger(n) && n >= 0 ? (n === 0 ? e.file : e.images?.[n - 1]) : null;
    if (!f) return res.status(404).json({ errors: ['No file for this entry.'] });
    if (f.storage === 's3') return res.json({ url: await getDownloadUrl(f, { download: true }) });
    if (!f.path || !fs.existsSync(f.path)) return res.status(404).json({ errors: ['No file for this entry.'] });
    res.download(f.path, f.originalName);
  } catch (err) { next(err); }
});

// Admin: download the submitted file
r.get('/:id/file', requireAdmin, async (req, res, next) => {
  try {
    const e = await Entry.findById(req.params.id);
    if (e?.file?.storage === 's3') return res.json({ url: await getDownloadUrl(e.file, { download: true }) });
    if (!e?.file?.path || !fs.existsSync(e.file.path)) return res.status(404).json({ errors: ['No file for this entry.'] });
    res.download(e.file.path, e.file.originalName);
  } catch (e) { next(e); }
});

export default r;
