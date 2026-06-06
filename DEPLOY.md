# Fluffy Pub — Deployment Guide
## GitHub → Vercel → Supabase

---

## Step 1: Supabase — set up the database

1. Go to **https://supabase.com** → Sign Up / Log In
2. Click **New project** → choose a name (e.g. `fluffy-pub`) → set a database password → pick a region closest to your users → **Create project** (takes ~2 min)
3. Once ready, go to **Settings → API** and copy:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** key
   - **service_role** key (keep this secret — never expose in frontend)

4. Go to **SQL Editor** (left sidebar) → **New query**
5. Open `scripts/schema.sql` from this project, paste the entire contents, and click **Run**
   - This creates all tables, RLS policies, and the trigger for auto-creating profiles

---

## Step 2: GitHub — push the code

```bash
# In the fluffy-pub-deploy folder:
git init
git add .
git commit -m "Initial commit — Fluffy Pub marketplace"

# Create a new repo on github.com (name: fluffy-pub), then:
git remote add origin https://github.com/YOUR_USERNAME/fluffy-pub.git
git branch -M main
git push -u origin main
```

---

## Step 3: Vercel — deploy

1. Go to **https://vercel.com** → Sign Up with GitHub
2. Click **Add New → Project** → Import your `fluffy-pub` repository
3. Framework preset: **Vite** (Vercel detects it automatically)
4. **Environment Variables** — add these in the Vercel dashboard:

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | your anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service role key ⚠️ keep secret |
   | `VITE_SUPABASE_URL` | same as SUPABASE_URL |
   | `VITE_SUPABASE_ANON_KEY` | same as anon key |

5. Click **Deploy** — Vercel builds the Vite frontend and deploys the `/api/*` serverless functions automatically

6. Your app will be live at: `https://fluffy-pub.vercel.app` (or your custom domain)

---

## Step 4: Seed the database

After deploying, run the seed script locally to create demo accounts and products:

```bash
# Install dependencies first
npm install

# Set your env vars (create .env from the example)
cp .env.example .env
# Edit .env and fill in your Supabase URL and service role key

# Run the seed
npm run seed
```

This creates:
- **Admin**: admin@fluffypub.com / fluffyadmin2026
- **Artist**: artist@mochi.art / mochiartist
- **Customer**: customer@test.com / customer123
- 8 sample products

---

## Step 5: Set admin role (important!)

Supabase Auth doesn't let users self-assign the `admin` role, so after the seed runs:

1. Go to **Supabase Dashboard → Table Editor → profiles**
2. Find `admin@fluffypub.com` → set `role` to `admin`
3. Find `artist@mochi.art` → confirm `role` is `artist`

Or run in SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'admin@fluffypub.com';
update public.profiles set role = 'artist', artist_slug = 'mochi-arts' where email = 'artist@mochi.art';
```

---

## Step 6: Local development

```bash
npm install
cp .env.example .env   # fill in your Supabase values

# Start Vite + Vercel dev server together
npm run dev
# Frontend: http://localhost:3000
# API functions: http://localhost:3001
```

---

## Architecture

```
GitHub (source)
    ↓  push to main → auto-deploy
Vercel
  ├── /dist/          ← Vite-built React SPA (static)
  └── /api/*          ← Serverless functions (Node.js)
        ↓  uses service role key
    Supabase (PostgreSQL)
      ├── profiles     (users + roles)
      ├── products
      ├── orders
      └── theme
```

---

## Environment Variables Reference

| Variable | Where used | Description |
|----------|-----------|-------------|
| `SUPABASE_URL` | API functions | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | API functions only | Bypasses RLS — keep secret |
| `SUPABASE_ANON_KEY` | API functions | Public key |
| `VITE_SUPABASE_URL` | Frontend build | Exposed to browser |
| `VITE_SUPABASE_ANON_KEY` | Frontend build | Exposed to browser |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` must **never** appear in frontend code or be committed to git.

---

## Custom Domain (optional)

In Vercel dashboard → your project → **Settings → Domains** → add your domain.
Update DNS with the CNAME Vercel provides.
