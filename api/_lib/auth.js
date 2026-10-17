// Admin sign-in: bcrypt password hashes and a signed session cookie.
// The cookie is httpOnly (scripts cannot read it) and SameSite=Strict, and it
// carries a token version so changing the password signs out other devices.
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const COOKIE = "mz_session";
const WEEK = 7 * 24 * 60 * 60 * 1000;
// compared against when the email is unknown, so both cases take the same time
let dummyHash;
const dummy = () => (dummyHash = dummyHash || bcrypt.hashSync("no-such-admin", 12));

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    const err = new Error("The server is missing JWT_SECRET (use at least 32 random characters).");
    err.status = 500;
    throw err;
  }
  return s;
}

const secure = () => process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

function setSession(res, admin) {
  const token = jwt.sign({ sub: admin.id, v: admin.token_version }, secret(), { expiresIn: "7d" });
  res.cookie(COOKIE, token, { httpOnly: true, secure: secure(), sameSite: "strict", path: "/api", maxAge: WEEK });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { httpOnly: true, secure: secure(), sameSite: "strict", path: "/api" });
}

async function verifyLogin(email, password) {
  const { rows } = await db.q("select id, email, name, password_hash, token_version from admins where email = $1", [String(email).trim().toLowerCase()]);
  const admin = rows[0];
  const ok = await bcrypt.compare(String(password), admin ? admin.password_hash : dummy());
  return ok && admin ? admin : null;
}

async function requireAdmin(req, res, next) {
  const ended = () => res.status(401).json({ error: "Your session has ended. Please sign in again." });
  try {
    const token = req.cookies && req.cookies[COOKIE];
    if (!token) return res.status(401).json({ error: "Please sign in." });
    const payload = jwt.verify(token, secret());
    const { rows } = await db.q("select id, email, name, token_version, password_hash from admins where id = $1", [payload.sub]);
    if (!rows[0] || rows[0].token_version !== payload.v) return ended();
    req.admin = rows[0];
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") return ended();
    next(err);
  }
}

const hash = (password) => bcrypt.hash(String(password), 12);
const compare = (password, h) => bcrypt.compare(String(password), h);

module.exports = { setSession, clearSession, verifyLogin, requireAdmin, hash, compare };
