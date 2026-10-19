// Makes modern, smaller copies of every photo in /images:
//   images/name.avif, images/name.webp           (up to 1600px wide)
//   images/name-800.avif, images/name-800.webp   (800px wide, for phones)
//   images/name-480.avif, images/name-480.webp   (480px wide, for thumbnails and the lookbook)
// The original JPGs stay as the fallback for old browsers and for the admin.
//   npm run images
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const dir = path.join(__dirname, "..", "images");
const SKIP = new Set(["logo.jpg"]); // the logo is tiny and used with blend modes

(async () => {
  const files = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f) && !SKIP.has(f));
  const sizes = {};
  for (const file of files) {
    const base = file.replace(/\.jpe?g$/i, "");
    const input = path.join(dir, file);
    const meta = await sharp(input).metadata();
    sizes[base] = { width: meta.width, height: meta.height };
    for (const [suffix, width] of [["", 1600], ["-800", 800], ["-480", 480]]) {
      const pipeline = () => sharp(input).rotate().resize({ width: Math.min(width, meta.width), withoutEnlargement: true });
      await pipeline().avif({ quality: 44, effort: 6 }).toFile(path.join(dir, `${base}${suffix}.avif`));
      await pipeline().webp({ quality: 74 }).toFile(path.join(dir, `${base}${suffix}.webp`));
    }
    console.log(`  ${file}  ${meta.width}x${meta.height}`);
  }
  fs.writeFileSync(path.join(dir, "sizes.json"), JSON.stringify(sizes, null, 1));
  console.log(`Optimized ${files.length} photos. Sizes saved to images/sizes.json.`);
})();
