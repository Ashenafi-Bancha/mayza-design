// Sign-in, two-step codes, password changes.
const express = require("express");
const QRCode = require("qrcode");
const db = require("../db");
const auth = require("../auth");
const totp = require("../totp");
const activity = require("../activity");
const { z, h, limit } = require("../validate");

const r = express.Router();
const loginLimit = limit(15, 10, "Too many sign-in attempts. Wait 15 minutes and try again.", { skipSuccessfulRequests: true });
const codeLimit = limit(15, 10, "Too many codes tried. Wait 15 minutes and try again.", { skipSuccessfulRequests: true });
const code = z.string().trim().regex(/^\d{6}$/, "Type the 6-digit code from your authenticator app.");

async function finishLogin(req, res, admin) {
  await db.q("update admins set last_login_at = now() where id = $1", [admin.id]);
  auth.setSession(res, admin);
  req.admin = admin;
  await activity.log(req, { action: "auth.login", entity: "staff", id: admin.id, summary: "Signed in" });
  res.json({ user: auth.publicUser(admin) });
}

r.post("/auth/login", loginLimit, h(async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().min(3).max(200), password: z.string().min(1).max(200) }).parse(req.body);
  const admin = await auth.verifyLogin(email, password);
  if (!admin) return res.status(401).json({ error: "The email or password is not correct." });
  if (admin.totp_enabled) {
    auth.setPendingMfa(res, admin);
    return res.json({ mfa: true });
  }
  await finishLogin(req, res, admin);
}));

// Step 2 when two-step sign-in is on.
r.post("/auth/totp", codeLimit, h(async (req, res) => {
  const admin = await auth.pendingMfaAdmin(req);
  if (!admin) return res.status(401).json({ error: "Your sign-in timed out. Enter your email and password again.", code: "mfa_expired" });
  const { code: c } = z.object({ code }).parse(req.body);
  if (!totp.verify(admin.totp_secret, c)) return res.status(401).json({ error: "That code is not correct. Check the time on your phone and try again." });
  await finishLogin(req, res, admin);
}));

r.post("/auth/logout", (req, res) => { auth.clearSession(res); res.json({ ok: true }); });

const signedIn = auth.requireAdmin({ allowSetup: true });

r.get("/auth/me", signedIn, (req, res) => res.json({ user: auth.publicUser(req.admin) }));

// Start setting up two-step sign-in: a new secret, shown as a QR code.
r.post("/auth/2fa/setup", signedIn, auth.requireCsrf, h(async (req, res) => {
  if (req.admin.totp_enabled) return res.status(400).json({ error: "Two-step sign-in is already on." });
  const secret = totp.newSecret();
  await db.q("update admins set totp_secret = $1, updated_at = now() where id = $2", [secret, req.admin.id]);
  const url = totp.otpauthUrl(secret, req.admin.email);
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#1a1210", light: "#ffffff" } });
  res.json({ secret, url, qr });
}));

r.post("/auth/2fa/enable", signedIn, auth.requireCsrf, codeLimit, h(async (req, res) => {
  const { code: c } = z.object({ code }).parse(req.body);
  if (!req.admin.totp_secret || !totp.verify(req.admin.totp_secret, c)) {
    return res.status(400).json({ error: "That code is not correct. Scan the QR code again and type the newest code." });
  }
  const { rows } = await db.q("update admins set totp_enabled = true, updated_at = now() where id = $1 returning *", [req.admin.id]);
  await activity.log(req, { action: "auth.2fa_on", entity: "staff", id: req.admin.id, summary: "Turned on two-step sign-in" });
  res.json({ user: auth.publicUser(rows[0]) });
}));

r.post("/auth/2fa/disable", signedIn, auth.requireCsrf, h(async (req, res) => {
  const { password } = z.object({ password: z.string().min(1, "Type your password.").max(200) }).parse(req.body);
  if (!(await auth.compare(password, req.admin.password_hash))) return res.status(400).json({ error: "Your password is not correct." });
  if (req.admin.role === "owner" && auth.ownerNeeds2fa()) return res.status(400).json({ error: "The owner account must keep two-step sign-in on." });
  const { rows } = await db.q("update admins set totp_enabled = false, totp_secret = null, updated_at = now() where id = $1 returning *", [req.admin.id]);
  await activity.log(req, { action: "auth.2fa_off", entity: "staff", id: req.admin.id, summary: "Turned off two-step sign-in" });
  res.json({ user: auth.publicUser(rows[0]) });
}));

r.post("/auth/password", signedIn, auth.requireCsrf, h(async (req, res) => {
  const { current, next } = z.object({
    current: z.string().min(1, "Type your current password.").max(200),
    next: z.string().min(8, "Use at least 8 characters.").max(200),
  }).parse(req.body);
  if (!(await auth.compare(current, req.admin.password_hash))) return res.status(400).json({ error: "Your current password is not correct." });
  const { rows } = await db.q(
    "update admins set password_hash = $1, token_version = token_version + 1, updated_at = now() where id = $2 returning *",
    [await auth.hash(next), req.admin.id]);
  auth.setSession(res, rows[0]); // keep this device signed in, sign out the others
  await activity.log(req, { action: "auth.password", entity: "staff", id: req.admin.id, summary: "Changed password" });
  res.json({ ok: true });
}));

module.exports = r;
