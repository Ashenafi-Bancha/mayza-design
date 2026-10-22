// Mayza Design API (Express).
//   /api/*        public: settings, products, photos, website orders, visitor tracker
//   /api/auth/*   staff sign-in and two-step codes
//   /api/admin/*  signed-in staff; every change needs the CSRF token, and each
//                 route checks the staff member's role (see perms.js)
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { z } = require("zod");
const auth = require("./auth");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const api = express.Router();
app.use("/api", api);

api.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: "same-origin" },
}));
api.use(cookieParser());
api.use(express.json({ limit: "200kb" }));
api.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

// Block cross-site form posts and scripts on other sites from changing anything.
api.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();
  const host = req.get("x-forwarded-host") || req.get("host");
  try {
    if (new URL(origin).host === host) return next();
  } catch (e) { /* malformed origin: blocked below */ }
  res.status(403).json({ error: "This request came from another website and was blocked." });
});

api.use(require("./routes/public"));
api.use(require("./routes/auth"));

const admin = express.Router();
api.use("/admin", auth.requireAdmin(), auth.requireCsrf, admin);
admin.use(require("./routes/dashboard"));
admin.use(require("./routes/orders"));
admin.use(require("./routes/clients"));
admin.use(require("./routes/catalog"));
admin.use(require("./routes/staff"));

api.use((_req, res) => res.status(404).json({ error: "Not found." }));

app.use((err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    const issue = err.issues[0];
    return res.status(400).json({ error: issue.message, field: issue.path.join(".") });
  }
  if (err.type === "entity.too.large") return res.status(413).json({ error: "That file is too large. Use a photo under 4 MB." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "The request could not be read." });
  if (err.code === "23503") return res.status(400).json({ error: "Something this refers to no longer exists. Reload and try again." });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? "Something went wrong on the server. Please try again." : err.message, ...(err.code && typeof err.code === "string" && status < 500 ? { code: err.code } : {}) });
});

module.exports = app;
