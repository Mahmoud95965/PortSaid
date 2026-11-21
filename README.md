# Port Said Hub

**Live:** https://port-said-psi.vercel.app

A city-services web platform for Port Said, Egypt: an official places directory with an interactive map, an admin dashboard, and an AI assistant that answers questions about the city.

## Features

- Places directory with official data and interactive map (MapLibre GL)
- AI assistant for city questions (API route `/api/assistant`)
- Admin dashboard with authentication (register, login, change password)
- QR code support and PWA manifest

## Tech stack

- Next.js (App Router) + React + TypeScript
- Supabase (database + auth)
- MapLibre GL, Tailwind CSS, Framer Motion
- Hosted on Vercel

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add your Supabase keys.
