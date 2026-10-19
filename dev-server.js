// Local development: serves the website and the API together on one port.
//   npm run dev   ->  http://localhost:3000  (admin at /admin)
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const app = require("./api/_lib/app");

const root = __dirname;
const site = express();
site.disable("x-powered-by");
site.use(app);

// Only the website's own folders and pages are served, never the server code or .env.
["css", "js", "images", "admin"].forEach((dir) => site.use(`/${dir}`, express.static(path.join(root, dir), { dotfiles: "deny" })));
site.get(["/", "/:page.html"], (req, res, next) => {
  const file = path.join(root, `${req.params.page || "index"}.html`);
  if (path.dirname(file) !== root || !fs.existsSync(file)) return next();
  res.sendFile(file);
});
site.use((_req, res) => res.status(404).send("Not found"));

const port = Number(process.env.PORT || 3000);
site.listen(port, () => {
  console.log(`Mayza Design running at http://localhost:${port}`);
  if (!require("./api/_lib/db").configured()) console.log("No database set up in .env yet: the admin runs in demo mode.");
});
