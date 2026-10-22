import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import entryRoutes from './routes/entries.js';
import viewerRoutes from './routes/viewers.js';
import galleryRoutes from './routes/gallery.js';
import moderationRoutes from './routes/moderation.js';
import paymentRoutes, { stripeWebhook } from './routes/payments.js';
import { paymentsEnabled, feeTable, defaultCurrency, bankTransferOffered, providerName } from './payments/index.js';
import { checkStorageConfig } from './storage.js';

for (const k of ['MONGO_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']) {
  if (!process.env[k]) { console.error(`Missing ${k} in .env`); process.exit(1); }
}

const app = express();
app.set('trust proxy', 1); // correct visitor IPs behind a host/proxy (needed for rate limits)
app.use(helmet({ crossOriginResourcePolicy: false }));
// CLIENT_URL may list several website addresses separated by commas (for example the staging and the live site)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim().replace(/\/$/, ''));
app.use(cors({ origin: allowedOrigins }));
// Stripe webhook needs the raw body, so it is registered BEFORE express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json());

// The website asks for the fee so it can show it and send people to payment
app.get('/api/config', (req, res) => res.json({
  fees: feeTable(), defaultCurrency: defaultCurrency() || null, provider: providerName(), bankTransfer: bankTransferOffered()
}));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/viewers', viewerRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/payments', paymentRoutes);

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ errors: ['File is too large (max 150 MB).'] });
  if (err.message === 'BAD_FILE_TYPE') return res.status(400).json({ errors: ['Unsupported file type. Use MP4, JPG, PNG or PDF.'] });
  console.error(err);
  res.status(500).json({ errors: ['Something went wrong on the server.'] });
});

if (paymentsEnabled()) {
  if (providerName() === 'stripe') {
    for (const k of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) {
      if (!process.env[k]) { console.error(`PAYMENT_PROVIDER=stripe needs ${k} in .env`); process.exit(1); }
    }
  } else if (providerName() === 'manual') {
    console.log('Payments: bank transfer. Organizers confirm payments by hand in the admin page.');
  } else if (providerName() === 'mock') {
    console.warn('PAYMENTS ARE IN TEST MODE (PAYMENT_PROVIDER=mock): no real money is taken. Never use this on the live site.');
  }
}

checkStorageConfig();

await mongoose.connect(process.env.MONGO_URI);
const port = process.env.PORT || 5000;
const server = app.listen(port, () => console.log(`API running on http://localhost:${port}`));
// Keep idle connections open longer than proxies do. Stops the occasional "ECONNRESET" in development
// and behind hosting proxies/load balancers.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;