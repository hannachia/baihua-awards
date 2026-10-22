import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

const r = Router();
// Single admin from .env (fine for testing). Replace with a User model later.
const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || '', 10);

r.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), (req, res) => {
  const { email, password } = req.body || {};
  const ok = email === process.env.ADMIN_EMAIL && bcrypt.compareSync(String(password || ''), hash);
  if (!ok) return res.status(401).json({ errors: ['Wrong email or password.'] });
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

export default r;
