import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  entry: { type: mongoose.Schema.Types.ObjectId, ref: 'Entry', required: true },
  viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true }
}, { timestamps: true });

// One vote per viewer per entry, enforced by the database itself
schema.index({ entry: 1, viewer: 1 }, { unique: true });

export default mongoose.model('Vote', schema);
