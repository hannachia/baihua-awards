import mongoose from 'mongoose';

export const CATEGORIES = ['singing', 'dance', 'calligraphy-painting', 'chinese-chess', 'other'];
export const PROJECT_TYPES = ['individual', 'duo-ensemble', 'group', 'school'];
export const STATUSES = ['pending', 'shortlisted', 'rejected', 'awarded'];

const entrySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 1, max: 120 },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  category: { type: String, enum: CATEGORIES, required: true },
  projectType: { type: String, enum: PROJECT_TYPES, required: true },
  workTitle: { type: String, required: true, trim: true },
  organization: { type: String, trim: true },
  instructor: { type: String, trim: true },
  guardianConsent: { type: Boolean, default: false },
  file: { originalName: String, path: String, storage: String, key: String, size: Number, mimetype: String },
  paymentStatus: { type: String, enum: ['not_required', 'unpaid', 'paid'], default: 'not_required', index: true },
  paymentRef: String,
  amount: Number,          // in fen (1/100 yuan)
  currency: String,
  paidAt: Date,
  publicConsent: { type: Boolean, default: false },
  published: { type: Boolean, default: false, index: true },
  publishedAt: Date,
  voteCount: { type: Number, default: 0, index: true },
  dislikeCount: { type: Number, default: 0 },  // never shown publicly, so dislikes cannot be used to shame rivals
  viewCount: { type: Number, default: 0, index: true },
  status: { type: String, enum: STATUSES, default: 'pending' }
}, { timestamps: true });

export default mongoose.model('Entry', entrySchema);
