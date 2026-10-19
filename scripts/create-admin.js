// Creates an admin login, or resets the password of an existing one.
//   npm run create-admin                       (asks for email and password)
//   npm run create-admin -- owner@example.com  (asks only for the password)
// Resetting a password also signs that admin out on every device.
require("dotenv").config();
const readline = require("readline");
const db = require("../api/_lib/db");
const auth = require("../api/_lib/auth");

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write("*"); };
    }
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(answer.trim()); });
  });
}

(async () => {
  if (!db.configured()) {
    console.error("Set DATABASE_URL first, for example in a .env file (see .env.example).");
    process.exit(1);
  }
  try {
    const email = (process.argv[2] || process.env.ADMIN_EMAIL || (await ask("Email: "))).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("That does not look like an email address.");
    const name = process.argv[3] || (process.env.ADMIN_EMAIL ? "" : await ask("Name (optional): "));
    const password = process.env.ADMIN_PASSWORD || (await ask("Password (8+ characters): ", true));
    if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
    const { rows } = await db.q(
      `insert into admins (email, name, password_hash) values ($1, $2, $3)
       on conflict (email) do update set password_hash = excluded.password_hash, name = coalesce(nullif(excluded.name, ''), admins.name),
         token_version = admins.token_version + 1
       returning (xmax = 0) as created`,
      [email, name || null, await auth.hash(password)]);
    console.log(rows[0].created ? `Admin ${email} created.` : `Password reset for ${email}.`);
  } catch (err) {
    console.error(err.code === "42P01" ? "Run  npm run migrate  first." : err.message);
    process.exitCode = 1;
  } finally {
    await db.getPool().end();
  }
})();
