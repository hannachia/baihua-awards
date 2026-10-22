import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, trim: true, maxlength: 30 }, // display name shown next to comments
  lastLoginAt: Date
}, { timestamps: true });

export default mongoose.model('Viewer', schema);
