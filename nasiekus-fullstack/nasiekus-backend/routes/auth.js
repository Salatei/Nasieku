// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db/connection");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

function publicUser(u){
  return { id: u.id, fullName: u.full_name, email: u.email, phone: u.phone, role: u.role };
}

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { fullName, email, phone, password } = req.body;
  if (!fullName || !email || !password){
    return res.status(400).json({ error: "Full name, email, and password are required." });
  }
  if (password.length < 6){
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing){
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, 'customer')
  `).run(fullName.trim(), normalizedEmail, phone || null, hash);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password){
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)){
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

// POST /api/auth/change-password — rotate the signed-in account's own password
router.post("/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword){
    return res.status(400).json({ error: "Current and new passwords are required." });
  }
  if (String(newPassword).length < 6){
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (!bcrypt.compareSync(currentPassword, user.password_hash)){
    // 400, not 401: the token is valid, so this is a form error rather than an
    // auth failure — 401 would trip the client's "session expired" handler.
    return res.status(400).json({ error: "Your current password is incorrect." });
  }
  if (currentPassword === newPassword){
    return res.status(400).json({ error: "New password must be different from the current one." });
  }

  const hash = bcrypt.hashSync(String(newPassword), 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);

  // Re-issue the token so the caller stays signed in without a re-login
  res.json({ token: signToken(user), user: publicUser(user) });
});

module.exports = router;
