// Uploaded photos live in the database and are served from /api/images/:id.
const db = require("./db");

const imageId = (url) => { const m = /^\/api\/images\/([0-9a-f-]{36})$/.exec(url || ""); return m ? m[1] : null; };

// Removes an uploaded photo once nothing uses it any more
// (a duplicated product, a page section or an order may share the same photo).
async function dropImage(url, q = db) {
  const id = imageId(url);
  if (!id) return;
  const { rows } = await q.query(
    `select 1 from products where image_url = $1
     union all select 1 from collections where image_url = $1
     union all select 1 from content where data->>'img' = $1
     union all select 1 from order_images where image_id = $2 limit 1`, [url, id]);
  if (!rows.length) await q.query("delete from images where id = $1", [id]);
}

const MAGIC = { "image/jpeg": [0xff, 0xd8, 0xff], "image/png": [0x89, 0x50, 0x4e, 0x47], "image/webp": [0x52, 0x49, 0x46, 0x46] };
const isImage = (mime, buf) => {
  const sig = MAGIC[mime];
  if (!Buffer.isBuffer(buf) || !sig || !sig.every((b, i) => buf[i] === b)) return false;
  return mime !== "image/webp" || buf.slice(8, 12).toString("ascii") === "WEBP";
};

module.exports = { imageId, dropImage, isImage, MIMES: Object.keys(MAGIC) };
