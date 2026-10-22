// Shared request helpers: validation pieces, async handler wrapper, rate limits.
const rateLimit = require("express-rate-limit");
const { z } = require("zod");

const blankToNull = (schema) => z.preprocess((v) => (v === "" || v === undefined ? null : v), schema.nullable());
const text = (max) => blankToNull(z.string().trim().max(max));
const money = blankToNull(z.coerce.number().min(0).max(100000000));
const day = blankToNull(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-12-31."));
const uuid = blankToNull(z.string().uuid());
const id = z.string().uuid("That item does not exist.");
const IMAGE_PATH = /^(images\/[\w.-]+|\/api\/images\/[0-9a-f-]{36})$/;
const SLUG = /^[a-z0-9-]{1,60}$/;

// Phone numbers in international digits so "0911 22 33 44" and "+251911223344" match.
function normPhone(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "251" + d.slice(1);
  else if (d.length === 9) d = "251" + d;
  return d || null;
}

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const limit = (windowMinutes, max, message, extra = {}) => rateLimit({
  windowMs: windowMinutes * 60 * 1000, limit: max, standardHeaders: "draft-7", legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: message }),
  ...extra,
});

const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });

module.exports = { z, blankToNull, text, money, day, uuid, id, IMAGE_PATH, SLUG, normPhone, h, limit, httpError };
