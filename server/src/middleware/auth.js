import jwt from 'jsonwebtoken';

function read(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function requireAdmin(req, res, next) {
  try {
    const p = read(req);
    if (p.role !== 'admin') throw new Error('not admin');
    req.admin = p;
    next();
  } catch {
    res.status(401).json({ errors: ['Please log in again.'] });
  }
}

export function requireViewer(req, res, next) {
  try {
    const p = read(req);
    if (p.role !== 'viewer') throw new Error('not viewer');
    req.viewer = p;
    next();
  } catch {
    res.status(401).json({ errors: ['Please sign in first.'] });
  }
}

// Attaches req.viewer when a valid viewer token is sent, otherwise carries on anonymously
export function optionalViewer(req, res, next) {
  try {
    const p = read(req);
    if (p.role === 'viewer') req.viewer = p;
  } catch { /* anonymous */ }
  next();
}
