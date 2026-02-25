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

## 3) Run migrations against Neon
From your local machine (or CI) with `DATABASE_URL` pointing to Neon:

```bash
npm run db:push
```

This keeps the existing schema definitions in `shared/schema.ts` and applies them to Neon.

## 4) Build and deploy
Vercel should run your standard build command:

```bash
npm run build
```

## 5) Connection failure behavior
- The app fails fast on startup if `DATABASE_URL` is missing.
- The app verifies database connectivity at startup.
- Pool-level database errors are logged for easier diagnosis in Vercel logs.
