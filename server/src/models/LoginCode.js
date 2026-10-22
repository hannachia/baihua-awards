import mongoose from 'mongoose';

// One-time sign-in codes. MongoDB deletes them automatically after expiresAt.
const schema = new mongoose.Schema({
  email: { type: String, index: true },
  codeHash: String,
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, index: { expires: 0 } }
}, { timestamps: true });

export default mongoose.model('LoginCode', schema);
