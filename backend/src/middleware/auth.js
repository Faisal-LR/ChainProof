import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const issueToken = (user) => jwt.sign({ sub: user.id, role: user.role, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const requireAuth = (repository) => async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await repository.findUser(payload.sub);
    if (!user) return res.status(401).json({ error: 'Session is no longer valid.' });
    req.user = user;
    return next();
  } catch { return res.status(401).json({ error: 'Invalid or expired session.' }); }
};

export const requireAdmin = (req, res, next) => req.user?.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Administrator access required.' });
