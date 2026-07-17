# Figmas AI Cloudflare Setup

This site now uses Cloudflare Pages Functions plus D1 for real signup, signin, sessions, and purchase records.

## 1. Create the D1 Database

Run in PowerShell from `F:\figmas.ai`:

```powershell
npx wrangler d1 create figmas-ai-db
```

Copy the `database_id` from the output.

## 2. Bind D1 to the Pages Project

Option A, dashboard:

1. Cloudflare Dashboard
2. Workers & Pages
3. Open your `figmas.ai` Pages project
4. Settings
5. Functions
6. D1 database bindings
7. Add binding:
   - Variable name: `DB`
   - D1 database: `figmas-ai-db`

Option B, repo config:

Uncomment the `[[d1_databases]]` block in `wrangler.toml` and replace `database_id`.

## 3. Apply the Database Schema

```powershell
npx wrangler d1 execute figmas-ai-db --remote --file=.\migrations\0001_initial_schema.sql
```

## 4. Add Owner Admin Passcode

In Cloudflare Pages project settings, add an environment variable:

```text
ADMIN_PASSCODE
```

Set it to a strong private passcode. The frontend sends your typed passcode to the admin API, but the real value is checked server-side.

## 5. Optional: Enable Real Email Confirmation

The code requires email verification. If Cloudflare Email Sending is not configured yet, signup will show a temporary verification link for testing.

To send real confirmation emails:

1. Enable Cloudflare Email Sending for `figmas.ai`.
2. Add a Pages email sending binding named:

```text
EMAIL
```

3. Add this optional variable:

```text
EMAIL_FROM=contact@figmas.ai
```

The sender domain must be approved in Cloudflare Email Sending before production email will send.

## 6. Push and Redeploy

```powershell
git add .
git commit -m "Add account auth and D1 purchase records"
git push
```

Cloudflare Pages should redeploy from GitHub.

## Notes

- User passwords are hashed with PBKDF2 before storage.
- Sessions are stored in D1 and sent with an HttpOnly secure cookie.
- Approved token balances are calculated from approved purchase records.
- This is now suitable for account records, but token sales still need legal/compliance review and production transaction verification before accepting funds.
