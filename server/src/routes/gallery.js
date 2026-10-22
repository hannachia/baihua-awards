import { Router } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import Entry, { CATEGORIES } from '../models/Entry.js';
import Vote from '../models/Vote.js';
import Dislike from '../models/Dislike.js';
import Comment from '../models/Comment.js';
import CommentReaction from '../models/CommentReaction.js';
import Viewer from '../models/Viewer.js';
import { requireViewer, optionalViewer } from '../middleware/auth.js';
import { getDownloadUrl } from '../storage.js';

const r = Router();
const limit = (max) => rateLimit({ windowMs: 10 * 60 * 1000, max, message: { errors: ['Too many requests. Please try again later.'] } });

// Optional voting window: set VOTING_START / VOTING_END (ISO dates) in .env. Unset = always open.
function votingOpen() {
  const now = Date.now();
  const s = process.env.VOTING_START ? Date.parse(process.env.VOTING_START) : null;
  const e = process.env.VOTING_END ? Date.parse(process.env.VOTING_END) : null;
  return !(s && now < s) && !(e && now > e);
}

const mediaType = (m = '') => (m.startsWith('video/') ? 'video' : m.startsWith('image/') ? 'image' : 'other');

// Public view of an entry. Never exposes email, phone or exact age. Dislike counts stay private.
// Minors are shown by first name only.
function shape(e) {
  const display = e.age < 18 ? e.name.split(/\s+/)[0] : e.name;
  return {
    id: e._id, name: display, workTitle: e.workTitle, category: e.category, projectType: e.projectType,
    organization: e.organization, voteCount: e.voteCount, viewCount: e.viewCount || 0,
    publishedAt: e.publishedAt, mediaType: mediaType(e.file?.mimetype)
  };
}

// Viewers are shown by a short masked name, never a full email address
const maskName = (em = '') => `${em.slice(0, 2)}***`;
// The name a viewer chose, or a short masked name for people who have not chosen one yet
const nameOf = (v) => v?.name || maskName(v?.email);
const validId = (id) => mongoose.isValidObjectId(id);

async function findPublished(id) {
  if (!validId(id)) return null;
  return Entry.findOne({ _id: id, published: true });
}

// What the viewer has done on an entry, plus the counts to show
async function reactionState(entryId, viewerId) {
  const e = await Entry.findById(entryId).select('voteCount');
  const [liked, disliked] = viewerId
    ? await Promise.all([Vote.exists({ entry: entryId, viewer: viewerId }), Dislike.exists({ entry: entryId, viewer: viewerId })])
    : [null, null];
  return { voteCount: e?.voteCount ?? 0, hasVoted: !!liked, hasDisliked: !!disliked };
}

// ---------------------------------------------------------------- entries
r.get('/', async (req, res, next) => {
  try {
    const q = { published: true };
    if (CATEGORIES.includes(req.query.category)) q.category = req.query.category;
    const sort = req.query.sort === 'new' ? { publishedAt: -1 }
      : req.query.sort === 'views' ? { viewCount: -1, publishedAt: -1 }
        : { voteCount: -1, publishedAt: 1 };
    const rows = await Entry.find(q).sort(sort).limit(120);
    res.json({ votingOpen: votingOpen(), entries: rows.map(shape) });
  } catch (e) { next(e); }
});

r.get('/:id', optionalViewer, async (req, res, next) => {
  try {
    const e = await findPublished(req.params.id);
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    const st = await reactionState(e._id, req.viewer?.id);
    res.json({ ...shape(e), hasVoted: st.hasVoted, hasDisliked: st.hasDisliked, votingOpen: votingOpen() });
  } catch (e) { next(e); }
});

// The video / image itself. Range requests work, so the video can be scrubbed.
// TESTING: served from local disk. With STORAGE_DRIVER=s3 it redirects to a short-lived link.
r.get('/:id/file', async (req, res, next) => {
  try {
    const e = await findPublished(req.params.id);
    if (e?.file?.storage === 's3') return res.redirect(await getDownloadUrl(e.file));
    if (!e?.file?.path || !fs.existsSync(e.file.path)) return res.status(404).end();
    res.sendFile(path.resolve(e.file.path), { headers: { 'Content-Type': e.file.mimetype, 'Cache-Control': 'public, max-age=3600' } });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------- views
// One view per person per entry within the cooldown (default 30 minutes), so refreshing does not inflate it.
// A person is a signed-in account, or the IP address for visitors who are not signed in.
// For testing set VIEW_COOLDOWN_MINUTES=0 in .env: then every page open counts.
// (Kept in memory: fine for one server. Use Redis if you run several servers.)
const recentViews = new Map();
r.post('/:id/view', optionalViewer, limit(300), async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ errors: ['Entry not found.'] });
    const cooldown = Number(process.env.VIEW_COOLDOWN_MINUTES ?? 30) * 60 * 1000;
    const who = req.viewer ? `u:${req.viewer.id}` : `ip:${req.ip}`;
    const key = `${who}:${req.params.id}`;
    const now = Date.now();
    if (recentViews.size > 50000) recentViews.clear();
    const last = recentViews.get(key);
    if (cooldown > 0 && last && now - last < cooldown) {
      const e = await Entry.findOne({ _id: req.params.id, published: true }).select('viewCount');
      return res.json({ viewCount: e?.viewCount ?? 0 });
    }
    recentViews.set(key, now);
    const e = await Entry.findOneAndUpdate({ _id: req.params.id, published: true }, { $inc: { viewCount: 1 } }, { new: true });
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    res.json({ viewCount: e.viewCount });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------- like (= vote) and dislike
r.post('/:id/vote', requireViewer, limit(120), async (req, res, next) => {
  try {
    if (!votingOpen()) return res.status(403).json({ errors: ['Voting is closed.'] });
    const e = await findPublished(req.params.id);
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    try {
      await Vote.create({ entry: e._id, viewer: req.viewer.id });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ errors: ['You have already voted for this entry.'] });
      throw err;
    }
    const inc = { voteCount: 1 };
    if (await Dislike.findOneAndDelete({ entry: e._id, viewer: req.viewer.id })) inc.dislikeCount = -1; // liking replaces a dislike
    await Entry.updateOne({ _id: e._id }, { $inc: inc });
    res.json(await reactionState(e._id, req.viewer.id));
  } catch (e) { next(e); }
});

r.delete('/:id/vote', requireViewer, limit(120), async (req, res, next) => {
  try {
    if (!votingOpen()) return res.status(403).json({ errors: ['Voting is closed.'] });
    if (!validId(req.params.id)) return res.status(404).json({ errors: ['Entry not found.'] });
    if (await Vote.findOneAndDelete({ entry: req.params.id, viewer: req.viewer.id })) {
      await Entry.updateOne({ _id: req.params.id }, { $inc: { voteCount: -1 } });
    }
    res.json(await reactionState(req.params.id, req.viewer.id));
  } catch (e) { next(e); }
});

r.post('/:id/dislike', requireViewer, limit(120), async (req, res, next) => {
  try {
    if (!votingOpen()) return res.status(403).json({ errors: ['Voting is closed.'] });
    const e = await findPublished(req.params.id);
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    const made = await Dislike.updateOne({ entry: e._id, viewer: req.viewer.id }, { $setOnInsert: { entry: e._id, viewer: req.viewer.id } }, { upsert: true });
    const inc = {};
    if (made.upsertedCount) inc.dislikeCount = 1;
    if (await Vote.findOneAndDelete({ entry: e._id, viewer: req.viewer.id })) inc.voteCount = -1; // disliking replaces a like
    if (Object.keys(inc).length) await Entry.updateOne({ _id: e._id }, { $inc: inc });
    res.json(await reactionState(e._id, req.viewer.id));
  } catch (e) { next(e); }
});

r.delete('/:id/dislike', requireViewer, limit(120), async (req, res, next) => {
  try {
    if (!votingOpen()) return res.status(403).json({ errors: ['Voting is closed.'] });
    if (!validId(req.params.id)) return res.status(404).json({ errors: ['Entry not found.'] });
    if (await Dislike.findOneAndDelete({ entry: req.params.id, viewer: req.viewer.id })) {
      await Entry.updateOne({ _id: req.params.id }, { $inc: { dislikeCount: -1 } });
    }
    res.json(await reactionState(req.params.id, req.viewer.id));
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------- comments (with replies, likes, reports)
r.get('/:id/comments', optionalViewer, async (req, res, next) => {
  try {
    const e = await findPublished(req.params.id);
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    const all = await Comment.find({ entry: e._id, hidden: false }).sort({ createdAt: 1 }).limit(600).populate('viewer', 'email name');
    const reacts = req.viewer
      ? await CommentReaction.find({ viewer: req.viewer.id, comment: { $in: all.map((c) => c._id) } })
      : [];
    const mineReact = new Map(reacts.map((x) => [String(x.comment), x.value]));
    const view = (c) => ({
      id: c._id, text: c.text, author: nameOf(c.viewer), replyTo: c.replyToAuthor || null,
      createdAt: c.createdAt, likeCount: c.likeCount, myReaction: mineReact.get(String(c._id)) || 0,
      mine: !!req.viewer && String(c.viewer?._id) === String(req.viewer.id)
    });
    const byParent = new Map();
    for (const c of all.filter((x) => x.parent)) {
      const k = String(c.parent);
      byParent.set(k, [...(byParent.get(k) || []), c]);
    }
    const tops = all.filter((c) => !c.parent);
    tops.sort(req.query.sort === 'new'
      ? (a, b) => b.createdAt - a.createdAt
      : (a, b) => b.likeCount - a.likeCount || b.createdAt - a.createdAt);
    res.json(tops.map((c) => ({ ...view(c), replies: (byParent.get(String(c._id)) || []).map(view) })));
  } catch (e) { next(e); }
});

r.post('/:id/comments', requireViewer, limit(30), async (req, res, next) => {
  try {
    const e = await findPublished(req.params.id);
    if (!e) return res.status(404).json({ errors: ['Entry not found.'] });
    const text = String(req.body?.text || '').trim();
    if (text.length < 1 || text.length > 500) return res.status(400).json({ errors: ['Comment must be 1 to 500 characters.'] });

    let parent = null;
    let replyToAuthor;
    if (req.body?.parent) {
      const target = validId(req.body.parent)
        ? await Comment.findOne({ _id: req.body.parent, entry: e._id, hidden: false }).populate('viewer', 'email name')
        : null;
      if (!target) return res.status(400).json({ errors: ['You cannot reply to that comment.'] });
      parent = target.parent || target._id;                 // replies are one level deep, like YouTube
      if (target.parent) replyToAuthor = nameOf(target.viewer); // "@name" when answering a reply
    }
    const me = await Viewer.findById(req.viewer.id).select('name email');
    const c = await Comment.create({ entry: e._id, viewer: req.viewer.id, text, parent, replyToAuthor });
    res.status(201).json({
      id: c._id, text: c.text, author: nameOf(me), replyTo: replyToAuthor || null, parent,
      createdAt: c.createdAt, likeCount: 0, myReaction: 0, mine: true, replies: []
    });
  } catch (e) { next(e); }
});

// Delete your own comment (and the replies under it)
r.delete('/comments/:cid', requireViewer, limit(60), async (req, res, next) => {
  try {
    if (!validId(req.params.cid)) return res.status(404).json({ errors: ['Comment not found.'] });
    const c = await Comment.findById(req.params.cid);
    if (!c) return res.status(404).json({ errors: ['Comment not found.'] });
    if (String(c.viewer) !== String(req.viewer.id)) return res.status(403).json({ errors: ['You can only delete your own comments.'] });
    const ids = (await Comment.find({ $or: [{ _id: c._id }, { parent: c._id }] }).select('_id')).map((x) => x._id);
    await Promise.all([Comment.deleteMany({ _id: { $in: ids } }), CommentReaction.deleteMany({ comment: { $in: ids } })]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Like (1), dislike (-1) or remove your reaction (0) on a comment
r.post('/comments/:cid/react', requireViewer, limit(240), async (req, res, next) => {
  try {
    const value = Number(req.body?.value);
    if (![1, -1, 0].includes(value)) return res.status(400).json({ errors: ['Something went wrong on the server.'] });
    if (!validId(req.params.cid)) return res.status(404).json({ errors: ['Comment not found.'] });
    const c = await Comment.findOne({ _id: req.params.cid, hidden: false });
    if (!c) return res.status(404).json({ errors: ['Comment not found.'] });

    const existing = await CommentReaction.findOne({ comment: c._id, viewer: req.viewer.id });
    const prev = existing?.value || 0;
    if (prev !== value) {
      if (value === 0) await existing.deleteOne();
      else await CommentReaction.updateOne({ comment: c._id, viewer: req.viewer.id }, { $set: { value } }, { upsert: true });
      const updated = await Comment.findByIdAndUpdate(c._id, {
        $inc: { likeCount: (value === 1 ? 1 : 0) - (prev === 1 ? 1 : 0), dislikeCount: (value === -1 ? 1 : 0) - (prev === -1 ? 1 : 0) }
      }, { new: true });
      return res.json({ likeCount: updated.likeCount, myReaction: value });
    }
    res.json({ likeCount: c.likeCount, myReaction: value });
  } catch (e) { next(e); }
});

// Report a comment (organizers see the report count in the admin page)
r.post('/comments/:cid/report', requireViewer, limit(60), async (req, res, next) => {
  try {
    if (!validId(req.params.cid)) return res.status(404).json({ errors: ['Comment not found.'] });
    const c = await Comment.findByIdAndUpdate(req.params.cid, { $addToSet: { reportedBy: req.viewer.id } });
    if (!c) return res.status(404).json({ errors: ['Comment not found.'] });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
