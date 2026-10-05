// middleware/auth.js
const jwt = require("jsonwebtoken");

function signToken(user){
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// Requires a valid token; rejects the request if missing/invalid.
function requireAuth(req, res, next){
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token){
    return res.status(401).json({ error: "Not authenticated." });
  }
  try{
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  }catch(err){
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

// Attaches req.user if a valid token is present, but doesn't block the
// request otherwise — used for routes like "create order" that work for
// both guests and logged-in customers.
function attachUserIfPresent(req, res, next){
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token){
    try{ req.user = jwt.verify(token, process.env.JWT_SECRET); }
    catch(err){ /* ignore invalid token for optional auth */ }
  }
  next();
}

function requireAdmin(req, res, next){
  if (!req.user || req.user.role !== "admin"){
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

module.exports = { signToken, requireAuth, attachUserIfPresent, requireAdmin };
