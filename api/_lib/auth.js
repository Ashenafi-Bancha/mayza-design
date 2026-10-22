// Staff sign-in: bcrypt password hashes, a signed session cookie, optional
// two-factor codes (optional; can be made compulsory for the owner), and a CSRF token for every change.
//
// Cookies
//   mz_session  httpOnly, SameSite=Strict, path /api: who is signed in (7 days)
//   mz_mfa      httpOnly, 5 minutes: password accepted, waiting for the 6-digit code
//   mz_csrf     readable by the admin page: echoed back in the X-CSRF-Token header
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const SESSION = "mz_session";
const MFA = "mz_mfa";
const CSRF = "mz_csrf";
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
// Two-step sign-in is optional for everyone; set REQUIRE_OWNER_2FA=true to make it compulsory for the owner.
const ownerNeeds2fa = () => process.env.REQUIRE_OWNER_2FA === "true";
const cookieBase = () => ({ secure: secure(), sameSite: "strict" });

function setSession(res, admin) {
  const token = jwt.sign({ sub: admin.id, v: admin.token_version }, secret(), { expiresIn: "7d" });
  res.cookie(SESSION, token, { ...cookieBase(), httpOnly: true, path: "/api", maxAge: WEEK });
  res.cookie(CSRF, crypto.randomBytes(24).toString("base64url"), { ...cookieBase(), httpOnly: false, path: "/", maxAge: WEEK });
  res.clearCookie(MFA, { ...cookieBase(), httpOnly: true, path: "/api" });
}

function clearSession(res) {
  res.clearCookie(SESSION, { ...cookieBase(), httpOnly: true, path: "/api" });
  res.clearCookie(CSRF, { ...cookieBase(), httpOnly: false, path: "/" });
  res.clearCookie(MFA, { ...cookieBase(), httpOnly: true, path: "/api" });
}

// Step 1 of a two-factor sign-in: remember that the password was right, for 5 minutes.
function setPendingMfa(res, admin) {
  const token = jwt.sign({ sub: admin.id, v: admin.token_version, purpose: "mfa" }, secret(), { expiresIn: "5m" });
  res.cookie(MFA, token, { ...cookieBase(), httpOnly: true, path: "/api", maxAge: 5 * 60 * 1000 });
}

async function pendingMfaAdmin(req) {
  const token = req.cookies && req.cookies[MFA];
  if (!token) return null;
  try {
    const p = jwt.verify(token, secret());
    if (p.purpose !== "mfa") return null;
    const { rows } = await db.q("select * from admins where id = $1 and active", [p.sub]);
    return rows[0] && rows[0].token_version === p.v ? rows[0] : null;
  } catch (e) {
    return null;
  }
}

async function verifyLogin(email, password) {
  const { rows } = await db.q("select * from admins where email = $1", [String(email).trim().toLowerCase()]);
  const admin = rows[0];
  const ok = await bcrypt.compare(String(password), admin ? admin.password_hash : dummy());
  return ok && admin && admin.active ? admin : null;
}

// What the admin page may know about the signed-in person.
const publicUser = (a) => ({
  id: a.id, email: a.email, name: a.name, role: a.role,
  totp_enabled: a.totp_enabled, must_keep_2fa: a.role === "owner" && ownerNeeds2fa(), needs_2fa_setup: a.role === "owner" && ownerNeeds2fa() && !a.totp_enabled,
});

// Loads the signed-in staff member. Owners who still have to set up two-factor
// sign-in can only reach the /auth routes until they do.
function requireAdmin({ allowSetup = false } = {}) {
  return async (req, res, next) => {
    const ended = () => res.status(401).json({ error: "Your session has ended. Please sign in again." });
    try {
      const token = req.cookies && req.cookies[SESSION];
      if (!token) return res.status(401).json({ error: "Please sign in." });
      const payload = jwt.verify(token, secret());
      const { rows } = await db.q("select * from admins where id = $1", [payload.sub]);
      const admin = rows[0];
      if (!admin || !admin.active || admin.token_version !== payload.v) return ended();
      req.admin = admin;
      if (!allowSetup && publicUser(admin).needs_2fa_setup) {
        return res.status(403).json({ error: "Set up two-step sign-in first.", code: "2fa_setup_required" });
      }
      next();
    } catch (err) {
      if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") return ended();
      next(err);
    }
  };
}

// Double-submit CSRF check for every change made while signed in.
function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const cookie = req.cookies && req.cookies[CSRF];
  const header = req.get("x-csrf-token");
  if (cookie && header && cookie.length === header.length && crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) return next();
  res.status(403).json({ error: "This page is out of date. Reload it and try again.", code: "csrf" });
}

const hash = (password) => bcrypt.hash(String(password), 12);
const compare = (password, h) => bcrypt.compare(String(password), h);

module.exports = {
  setSession, clearSession, setPendingMfa, pendingMfaAdmin, verifyLogin, requireAdmin, requireCsrf,
  publicUser, ownerNeeds2fa, hash, compare,
};
