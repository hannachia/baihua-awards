import { Router } from 'express';
import mongoose from 'mongoose';
import Entry from '../models/Entry.js';
import Vote from '../models/Vote.js';
import Comment from '../models/Comment.js';
import { requireAdmin } from '../middleware/auth.js';

const r = Router();
r.use(requireAdmin);

const ok = (id) => mongoose.isValidObjectId(id);

// Everything an organizer needs to check one entry for fake votes or bad comments
r.get('/entries/:id', async (req, res, next) => {
  try {
    if (!ok(req.params.id)) return res.status(404).json({ errors: ['Entry not found.'] });
    const entry = await Entry.findById(req.params.id).select('name workTitle category voteCount dislikeCount viewCount published');
    if (!entry) return res.status(404).json({ errors: ['Entry not found.'] });
    const votes = await Vote.find({ entry: entry._id }).sort({ createdAt: -1 }).populate('viewer', 'email');
    const comments = await Comment.find({ entry: entry._id }).sort({ createdAt: -1 }).populate('viewer', 'email name');
    res.json({
      entry,
      votes: votes.map((v) => ({ id: v._id, email: v.viewer?.email, createdAt: v.createdAt })),
      comments: comments.map((c) => ({ id: c._id, text: c.text, hidden: c.hidden, isReply: !!c.parent, reports: c.reportedBy?.length || 0, name: c.viewer?.name, email: c.viewer?.email, createdAt: c.createdAt }))
    });
  } catch (e) { next(e); }
});

// Remove a suspicious vote
r.delete('/votes/:voteId', async (req, res, next) => {
  try {
    if (!ok(req.params.voteId)) return res.status(404).json({ errors: ['Entry not found.'] });
    const v = await Vote.findByIdAndDelete(req.params.voteId);
    if (!v) return res.status(404).json({ errors: ['Entry not found.'] });
    const e = await Entry.findByIdAndUpdate(v.entry, { $inc: { voteCount: -1 } }, { new: true });
    res.json({ voteCount: e?.voteCount ?? 0 });
  } catch (e) { next(e); }
});

// Hide / show a comment
r.patch('/comments/:cid', async (req, res, next) => {
  try {
    if (!ok(req.params.cid)) return res.status(404).json({ errors: ['Entry not found.'] });
    const c = await Comment.findByIdAndUpdate(req.params.cid, { hidden: req.body.hidden === true }, { new: true });
    if (!c) return res.status(404).json({ errors: ['Entry not found.'] });
    res.json({ id: c._id, hidden: c.hidden });
  } catch (e) { next(e); }
});

export default r;
