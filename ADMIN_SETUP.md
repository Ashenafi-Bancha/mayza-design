# Mayza Design admin: setup

The site has two parts in one repository:

- **Website and admin pages**: plain HTML, CSS and JavaScript (`index.html`, `collections.html`, …, and `admin/`).
- **API**: Node.js + Express + PostgreSQL in `api/`. On Vercel it runs as one serverless function at `/api`; locally `npm run dev` serves the site and the API together.

The admin lives at `/admin`. It needs the database: until `DATABASE_URL` is set, the admin shows the setup commands instead of a sign-in. The website's order sheet still works without it (orders stay in the visitor's browser). For using the admin, see [ADMIN_GUIDE.md](ADMIN_GUIDE.md).

## Run it on your computer

Needs Node.js 18+ and PostgreSQL 13+.

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `JWT_SECRET`. Generate a secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

2. Install, create the database and tables, and create the owner's login (`ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` are used if set):

   ```bash
   npm install
   npm run migrate
   npm run create-admin
   ```

3. Start it with `npm run dev` and open http://localhost:3000 (admin at http://localhost:3000/admin).

`npm run migrate` is safe to run again after updates. It adds the 12 starting products only when the products table is empty.

## Put it live on Vercel

1. **Database:** in the Vercel project, open **Storage → Create Database → Neon (Postgres)** and connect it to the project. Vercel adds `DATABASE_URL` to the project's environment variables. Any hosted PostgreSQL works; just set `DATABASE_URL` yourself.
2. **Secret:** in **Settings → Environment Variables**, add `JWT_SECRET` with a long random value (same command as above).
3. **Tables and login:** from your computer, put the production `DATABASE_URL` in `.env` (or set it in the terminal) and run:

   ```bash
   npm run migrate
   npm run create-admin
   ```

4. **Deploy:** push to GitHub. Vercel installs the packages, serves the site as before, and runs `api/index.js` for every `/api/*` request (see `vercel.json`).

Check that it worked: `https://your-site/api/health` should show `{"ok":true,"configured":true}`, and `/admin` should show the email and password form instead of the demo.

If the Vercel project's **Framework Preset** ever changes, keep it on **Other** with no build command.

## Managing logins

- **Add a team member or reset a forgotten password:** run `npm run create-admin` with the production `DATABASE_URL` and enter their email. An existing email gets the new password, and that person is signed out on every device.
- **Change your own password:** Admin → Settings → Account. This signs out your other devices.
- There is no public sign-up. Only accounts created with `create-admin` can enter.

## What the owner can do

| Area | What it does |
|---|---|
| **Overview** | New orders, orders in the workshop, orders ready for pickup, value of open orders, deposits received and money still to collect. A "needs attention" list shows new orders and anything due within 3 days, and a list ranks the most requested pieces. |
| **Orders** | Orders sent from the website's order sheet arrive here, and each can be printed as a workshop slip; an open admin checks every 15 seconds and alerts with a sound and a notice. Filter by status, search by name, phone or reference, and export to Excel (CSV). Each order has one-tap Call and WhatsApp buttons, a status (New, Confirmed, In progress, Ready, Delivered, Cancelled), agreed price, deposit, balance and private notes. Phone and walk-in orders can be added by hand. |
| **Collections** | Add, edit, hide, reorder or delete the collections shown on the Collections page and the home page tiles: names, small line, home-page summary, description and tags in English and Amharic, plus a cover photo. Deleting a collection that still has products asks where to move them. |
| **Website** | A content editor for the main text and photos of every page (home banner, sections, About story and promises, order steps, page headers), side by side in English and Amharic. Empty boxes keep the original wording, each edited field can be restored, and unsaved changes are kept until saved or discarded. |
| **Products** | Add, edit, duplicate, search, hide or delete pieces with a photo, English and Amharic names and descriptions, collection, price (or "price on request"), featured flag and position. Visible products fill "The pieces" grid on Collections, each with an "Order this" button that carries the piece into the order sheet. |
| **Settings** | Phone numbers, WhatsApp and Telegram, address and hours (English and Amharic), social links, follower numbers, and an announcement bar across the top of every page. |

The whole admin works on a phone and switches between English and Amharic.

## API overview

| Method and path | Who | Purpose |
|---|---|---|
| `GET /api/health` | anyone | Reports whether a database is configured |
| `GET /api/settings`, `GET /api/products`, `GET /api/products/:id` | anyone | Website content (visible products only) |
| `GET /api/images/:id` | anyone | Uploaded product photos, cached for a year |
| `POST /api/orders` | anyone | Place an order from the website (rate-limited, spam trap) |
| `POST /api/auth/login`, `/logout`, `GET /api/auth/me`, `POST /api/auth/password` | admin | Sign-in and password change |
| `GET /api/collections`, `GET /api/content` | anyone | Visible collections and edited page text |
| `/api/admin/orders`, `/api/admin/products`, `/api/admin/collections`, `/api/admin/content`, `/api/admin/images`, `/api/admin/settings` | admin | Manage everything above |

## Security notes

- Passwords are stored as bcrypt hashes. Sessions are signed cookies (`httpOnly`, `Secure` on Vercel, `SameSite=Strict`) that expire after 7 days.
- Requests that change data are refused when they come from another website, every input is validated, and photo uploads are checked to be real JPG, PNG or WebP files.
- Sign-in allows 10 failed attempts per 15 minutes and website orders 8 per 10 minutes per connection. On Vercel each function instance keeps its own count, so these limits slow abuse down rather than stop it completely.
- Product photos are resized in the browser (longest side 1400px) and stored in PostgreSQL, so no separate file service is needed. Deleting or replacing a product's photo removes the old file.
- `.env` is never committed or deployed (it is in `.gitignore` and `.vercelignore`). Secrets live only in Vercel's environment variables, and the local dev server serves only the website's own folders.
