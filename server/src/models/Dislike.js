import mongoose from 'mongoose';

// A dislike on an entry. A viewer can like (vote) OR dislike an entry, never both.
const schema = new mongoose.Schema({
  entry: { type: mongoose.Schema.Types.ObjectId, ref: 'Entry', required: true },
  viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true }
}, { timestamps: true });

schema.index({ entry: 1, viewer: 1 }, { unique: true });

export default mongoose.model('Dislike', schema);
