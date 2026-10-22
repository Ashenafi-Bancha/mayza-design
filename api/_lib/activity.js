// Activity log: who changed what, and when. Viewable by the owner.
const db = require("./db");

// `q` lets a caller log inside its own transaction (pass the transaction client).
async function log(req, { action, entity, id, summary, details = {} }, q = db) {
  const user = req && req.admin;
  await q.query(
    `insert into activity_log (user_id, user_label, action, entity_type, entity_id, summary, details, ip)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [user ? user.id : null, user ? user.name || user.email : "Website", action, entity || null, id ? String(id) : null,
      summary || null, details, req ? String(req.ip || "").slice(0, 64) : null]);
}

module.exports = { log };
