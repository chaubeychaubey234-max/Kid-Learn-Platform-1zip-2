# Deploying with Neon on Vercel

## 1) Create a Neon database
1. Create a project in Neon.
2. Copy the connection string from Neon dashboard.
3. Ensure the URL includes `sslmode=require`.

Example:

```bash
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/<database>?sslmode=require
```

## 2) Configure environment variables in Vercel
In Vercel project settings, add:

- `DATABASE_URL` (Neon connection string with `sslmode=require`)
- `NODE_ENV=production`
- `TAVILY_API_KEY` (if you use safe search)
- `CEREBRAS_API_KEY` (if you use chatbot)
- `YOUTUBE_API_KEY` (if you use YouTube features)

## 3) Run migrations against Neon (required)
From your local machine (or CI) with `DATABASE_URL` pointing to Neon:

```bash
npm run db:push
```

This applies the existing schema from `shared/schema.ts` to Neon without changing the schema source.

## 4) Build and deploy
Vercel should run your standard build command:

```bash
npm run build
```

## 5) Local development with Neon
Before `npm run dev`, make sure the Neon database has the tables created:

```bash
npm run db:push
npm run dev
```

## 6) Troubleshooting
If you see errors like `relation "users" does not exist` or `relation "badges" does not exist`, the database schema has not been pushed yet. Run:

```bash
npm run db:push
```

## 7) Connection failure behavior
- The app fails fast on startup if `DATABASE_URL` is missing.
- The app verifies DB connectivity and checks required tables (`users`, `content`, `badges`) at startup.
- Startup exits with a clear error if the schema is missing or the connection is unavailable.
- Pool-level database errors are logged for easier diagnosis in Vercel logs.
