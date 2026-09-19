# WeatherScope — Production Weather App (Next.js + Vercel)

Real-time meteorological metrics with an automated **Weather Mood** engine, dual-view developer JSON inspector, and secure server proxy for WeatherAPI.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

## Features
- 🔍 **Search + 10 City Chips**: New York, London, Tokyo, Paris, Sydney, Dubai, Singapore, Mumbai, Toronto, Berlin — instant fetch & active highlight.
- 🌡️ **Weather Card**: Location/region/country, local time, °C/°F toggle, condition icon+text, humidity, wind (km/h & mph), feels-like, UV, pressure, visibility.
- 🎭 **Weather Mood Engine** (strict priority):
  1. Cold `<12°C` → blue
  2. Hot `>32°C` → amber
  3. Windy `>25 km/h` → slate
  4. Uncomfortable `(humidity>75 & temp>28) || humidity>85` → rose
  5. Pleasant `18–26°C & humidity≤65% & wind≤20` → emerald
  6. Mild/Moderate fallback → zinc
- 👩‍💻 **JSON Inspector**: Formatted (collapsible nodes, line numbers, color tokens) + Raw (monospaced scroll), Copy to clipboard + size/latency.
- 🔒 **Secure Proxy**: Client never sees `WEATHER_API_KEY`; all fetches go through `/api/weather?city=...` reading `process.env.WEATHER_API_KEY`.
- ♿ **UX States**: Welcome, skeleton loaders (no CLS), inline “City not found” (400/404), retry banner (401/429/500).

## Quick Start

```bash
git clone <repo>
cd weather-app
npm install
cp .env.example .env.local
# add your key from https://www.weatherapi.com/
# WEATHER_API_KEY=your_key_here
npm run dev
# http://localhost:3000
```

Get a free key: https://www.weatherapi.com/my/ → sign up → copy key.

## Env

`.env.example`:
```
WEATHER_API_KEY=your_weatherapi_key_here
```

Never commit `.env.local`. `src/app/api/weather/route.ts` proxies `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${city}`.

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

### Option 1 — Web Dashboard (recommended)
1. Push to GitHub.
2. [vercel.com/new](https://vercel.com/new) → Import repo → Framework: Next.js (auto).
3. **Environment Variables** → Add `WEATHER_API_KEY` = your key (Production, Preview, Development).
4. Deploy → `https://your-app.vercel.app`.

### Option 2 — Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
# or link existing:
vercel link
vercel env add WEATHER_API_KEY production   # paste key, or:
# vercel env add WEATHER_API_KEY < value.txt
vercel --prod
```

Secrets are encrypted at rest and never exposed to client — verified via Network tab: only `/api/weather` is visible.

## API Route

`GET /api/weather?city=Paris`

- Success: `200` + WeatherAPI JSON, header `x-response-time`.
- Errors: `400` missing city, `400/404` city not found, `401/429/500` upstream → JSON `{ error, code }`.

## Project Structure

```
src/app/page.tsx            # Main UI (search, chips, card, mood, inspector)
src/app/api/weather/route.ts # Secure proxy
src/lib/weatherMood.ts      # Mood engine + styles
src/app/globals.css         # Tailwind v4 + theme
vercel.json                 # Vercel framework config
.env.example
```

## Tech

Next.js 16 App Router, TypeScript, Tailwind CSS 4, lucide-react, WeatherAPI.

---

MIT — built for Vercel deployment.
