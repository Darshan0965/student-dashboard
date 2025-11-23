// backend/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

// login: sets cookie `token`
router.post('/login', express.json(), (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'invalid username or password' });
    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'invalid username or password' });

    const payload = { id: user.id, username: user.username, role: user.role, student_id: user.student_id || null };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    // set HttpOnly cookie
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'ok', role: user.role, username: user.username, student_id: payload.student_id });
  });
});

// logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'logged out' });
});

// /auth/me
router.get('/me', (req, res) => {
  const token = req.cookies?.token || null;
  if (!token) return res.json(null);
  try {
    const data = jwt.verify(token, JWT_SECRET);
    res.json(data);
  } catch (e) {
    res.json(null);
  }
});

// helper middlewares
function authenticateToken(req, res, next) {
  const token = req.cookies?.token || null;
  if (!token) return res.status(401).json({ error: 'auth required' });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (e) {
    res.status(401).json({ error: 'invalid token' });
  }
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'auth required' });
    if (req.user.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = {
  router,
  authenticateToken,
  authorizeRole
};