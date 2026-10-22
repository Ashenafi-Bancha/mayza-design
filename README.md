# Mayza Design

Website and admin panel for Mayza Design, a cultural fashion house in Addis Ababa.

- **Website**: static HTML, CSS and JavaScript (`index.html`, `collections.html`, `custom.html`, `about.html`, `contact.html`).
- **Admin**: `admin/`, plain JavaScript modules, no build step. How to use it: [ADMIN_GUIDE.md](ADMIN_GUIDE.md).
- **API**: Node.js, Express and PostgreSQL in `api/`. On Vercel it runs as one serverless function at `/api`.

## Setup

Needs Node.js 18+ and PostgreSQL 13+.

1. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL`, for example `postgres://postgres:PASSWORD@localhost:5432/mayza`
   - `JWT_SECRET`: at least 32 random characters. Make one with
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - optional: `ADMIN_EMAIL`, `ADMIN_PASSWORD` for `create-admin`; `SEED_STAFF_PASSWORD` for `seed`
2. Install and prepare the database:

   ```bash
   npm install
   npm run migrate        # creates the database if needed, then applies api/_lib/migrations in order
   npm run create-admin   # the owner's account
   npm run seed           # optional: sample clients, orders, visits and one account per role
   ```

3. `npm run dev` and open http://localhost:3000 (admin at http://localhost:3000/admin). Two-step sign-in can be turned on later in Settings.

## Checks

```bash
npm run lint
TEST_DATABASE_URL=postgres://user@localhost:5432/mayza_test npm test
npm run content:verify
```

The tests wipe and rebuild the database in `TEST_DATABASE_URL`, so point it at a throwaway database. They cover sign-in and two-step codes, CSRF, every role's permissions, manual orders, status changes, payments, website orders and upgrading an older database.

## Security notes

- Passwords are hashed with bcrypt; sessions are httpOnly, SameSite=Strict cookies that can be revoked.
- Every change needs a CSRF token, and requests from other websites are refused.
- Sign-in and code entry are rate limited. Two-step sign-in (authenticator app) is optional and can be turned on in Settings; set `REQUIRE_OWNER_2FA=true` to make it compulsory for the owner.
- Roles are checked on the server for every request (`api/_lib/perms.js`). Changes are recorded in the activity log.
- Uploads are checked to be real JPG, PNG or WebP files and capped at 4 MB.

## Deploy (Vercel)

Set `DATABASE_URL` and `JWT_SECRET` in the Vercel project, run `npm run migrate` once against the production database, then `npm run create-admin`. Don't run `npm run seed` on production (it refuses to).
