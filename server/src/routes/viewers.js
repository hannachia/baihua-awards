import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Viewer from '../models/Viewer.js';
import LoginCode from '../models/LoginCode.js';
import { sendMail, loginCodeEmail } from '../mailer.js';
import { requireViewer } from '../middleware/auth.js';

const r = Router();
const limit = (max) => rateLimit({ windowMs: 15 * 60 * 1000, max, message: { errors: ['Too many requests. Please try again later.'] } });

// Throw-away email domains are blocked to make fake accounts harder
const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com']);

const hash = (email, code) => crypto.createHash('sha256').update(`${email}:${code}:${process.env.JWT_SECRET}`).digest('hex');
const cleanEmail = (v) => String(v || '').trim().toLowerCase();

// Step 1: ask for a code
r.post('/request-code', limit(10), async (req, res, next) => {
  try {
    const email = cleanEmail(req.body?.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ errors: ['Enter a valid email address.'] });
    if (DISPOSABLE.has(email.split('@')[1])) return res.status(400).json({ errors: ['Please use a permanent email address.'] });

    const recent = await LoginCode.findOne({ email, createdAt: { $gt: new Date(Date.now() - 60 * 1000) } });
    if (recent) return res.status(429).json({ errors: ['Please wait a minute before asking for another code.'] });

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await LoginCode.deleteMany({ email });
    await LoginCode.create({ email, codeHash: hash(email, code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendMail(loginCodeEmail(email, code));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Step 2: check the code, return a login token (30 days)
r.post('/verify', limit(30), async (req, res, next) => {
  try {
    const email = cleanEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();
    const rec = await LoginCode.findOne({ email });
    if (!rec || rec.expiresAt < new Date()) return res.status(400).json({ errors: ['The code has expired. Request a new one.'] });
    if (rec.attempts >= 5) { await rec.deleteOne(); return res.status(400).json({ errors: ['Too many wrong attempts. Request a new code.'] }); }
    if (rec.codeHash !== hash(email, code)) {
      rec.attempts += 1; await rec.save();
      return res.status(400).json({ errors: ['Wrong code.'] });
    }
    await rec.deleteOne();
    const viewer = await Viewer.findOneAndUpdate({ email }, { $set: { lastLoginAt: new Date() } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const token = jwt.sign({ role: 'viewer', id: String(viewer._id), email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, email, name: viewer.name || '' });
  } catch (e) { next(e); }
});

r.get('/me', requireViewer, async (req, res, next) => {
  try {
    const v = await Viewer.findById(req.viewer.id).select('name email');
    res.json({ email: req.viewer.email, name: v?.name || '' });
  } catch (e) { next(e); }
});

// Choose the name shown next to your comments
const RESERVED = /admin|organi[sz]er|committee|moderator|official|staff|组委会|管理员|官方|客服/i;
r.post('/name', requireViewer, limit(20), async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 30) return res.status(400).json({ errors: ['Please choose a name of 2 to 30 characters.'] });
    if (!/^[\p{L}\p{N} _.\-·]+$/u.test(name) || RESERVED.test(name)) return res.status(400).json({ errors: ['This name is not allowed.'] });
    await Viewer.updateOne({ _id: req.viewer.id }, { $set: { name } });
    res.json({ name });
  } catch (e) { next(e); }
});

export default r;
