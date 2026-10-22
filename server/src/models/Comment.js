import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  entry: { type: mongoose.Schema.Types.ObjectId, ref: 'Entry', required: true, index: true },
  viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true }, // top-level comment this replies to
  replyToAuthor: String,                  // shown as "@name" when replying to a reply
  text: { type: String, required: true, trim: true, maxlength: 500 },
  likeCount: { type: Number, default: 0 },
  dislikeCount: { type: Number, default: 0 },
  reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],
  hidden: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Comment', schema);
