import mongoose from 'mongoose';

// value 1 = like, -1 = dislike. One reaction per viewer per comment.
const schema = new mongoose.Schema({
  comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
  viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true },
  value: { type: Number, enum: [1, -1], required: true }
}, { timestamps: true });

schema.index({ comment: 1, viewer: 1 }, { unique: true });

export default mongoose.model('CommentReaction', schema);
