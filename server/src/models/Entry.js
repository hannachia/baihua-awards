import mongoose from 'mongoose';

export const CATEGORIES = ['singing', 'dance', 'calligraphy-painting', 'other'];
// Chinese chess is no longer offered. Old entries keep this value so they still open, save and show up.
const LEGACY_CATEGORIES = ['chinese-chess'];
export const PROJECT_TYPES = ['individual', 'duo-ensemble', 'group', 'school'];
export const STATUSES = ['pending', 'shortlisted', 'rejected', 'awarded'];

const entrySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 1, max: 120 },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  category: { type: String, enum: [...CATEGORIES, ...LEGACY_CATEGORIES], required: true },
  projectType: { type: String, enum: PROJECT_TYPES, required: true },
  workTitle: { type: String, required: true, trim: true },
  organization: { type: String, trim: true },
  instructor: { type: String, trim: true },
  guardianConsent: { type: Boolean, default: false },
  file: { originalName: String, path: String, storage: String, key: String, size: Number, mimetype: String },
  // Pictures 2 to 9 of an entry with several photos (picture 1 is `file`)
  images: [{ originalName: String, size: Number, mimetype: String, storage: String, path: String, key: String }],
  // Small cover picture made in the browser at upload time (a frame of the video, or a shrunken photo)
  poster: { storage: String, path: String, key: String, mimetype: String },
  ratio: Number,   // width / height of the work, so the gallery can lay cards out like a photo feed
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
