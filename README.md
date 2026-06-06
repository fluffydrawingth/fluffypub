# 🐰 Fluffy Pub

A kawaii coloring book marketplace. Buy and download adorable digital coloring books.

## Stack

- **Frontend**: React 18 + TypeScript, built with Vite
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel

## Features

- 🛍️ Product catalog with categories and search
- 🛒 Cart + checkout (guest and authenticated)
- 💳 Digital + physical product order flows
- 👤 Customer accounts with order history and favorites
- 🎨 Artist dashboard — manage products and view sales
- ⚙️ Admin panel — orders, analytics, users, Theme CMS
- 🖼️ Image crop editor for logo, hero, banner, background

## Quick Start

See [DEPLOY.md](./DEPLOY.md) for the full GitHub → Vercel → Supabase deployment guide.

```bash
npm install
cp .env.example .env   # fill in Supabase credentials
npm run dev            # http://localhost:3000
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fluffypub.com | fluffyadmin2026 |
| Artist | artist@mochi.art | mochiartist |
| Customer | customer@test.com | customer123 |
