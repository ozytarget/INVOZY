# Deploy GitHub -> Railway

## 1) Safety first (secrets)

Do NOT commit real secrets in `.env`.
Use `.env.example` only as template.

## 2) Commit and push to GitHub

Run:

```bash
git rm --cached .env
git add .
git commit -m "prepare app for github and railway deploy"
git push origin main
```

## 3) Create Railway project

1. Open Railway dashboard.
2. New Project -> Deploy from GitHub repo.
3. Select `ozytarget/INVOZY`.

## 4) Set required Railway variables

In Railway project variables, set at least:

- `DATABASE_URL` (from Railway PostgreSQL service)
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` (Railway public URL, after first deploy)

## 4.1) Add Railway PostgreSQL

1. In Railway project, click **New** -> **Database** -> **PostgreSQL**.
2. Open PostgreSQL service -> Variables.
3. Copy `DATABASE_URL` into your web service variables.

The app auto-creates required tables on first request.

## 5) Deploy

Railway will run build and use start command from `railway.json`.

## 6) Post-deploy checks

1. Open `/dashboard`
2. Create Estimate
3. Sign & Approve -> verify conversion to Invoice
4. Record payment -> verify dashboard metrics update
5. Share -> open public link and verify notification entry
