// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
const app = require("./_lib/app");

module.exports = (req, res) => {
  // make sure the routes always see the /api prefix, however the rewrite passes the path
  if (!req.url.startsWith("/api")) req.url = "/api" + (req.url.startsWith("/") ? "" : "/") + req.url;
  return app(req, res);
};
