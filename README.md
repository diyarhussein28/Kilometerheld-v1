# Kilometerheld 🚗 — Digitales Fahrtenbuch (German passive-income SaaS)

**A complete, production-ready MVP of a monthly-subscription product for the German market — built with zero dependencies, zero backend, and zero running costs.**

Fahrtenbuch = legally required mileage log for German company-car drivers choosing the *Fahrtenbuchmethode* instead of the *1-%-Regelung*. Competitors charge €14–25/month; Kilometerheld charges **€4.99/month** with a simpler, privacy-first product.

## What's inside

| Path | What it is |
|---|---|
| `index.html` | German landing page (full conversion copy, pricing, FAQ) |
| `app.html` | The Fahrtenbuch web app (dashboard, trips, vehicles, settings) |
| `assets/app.js` | All app logic incl. a **hand-rolled raw-PDF generator** (no libraries) |
| `assets/styles.css` | Shared design system |
| `impressum.html` · `datenschutz.html` · `agb.html` · `widerruf.html` | German legal pages (templates with placeholders) |
| `docs/PRODUCT_DESIGN.md` | **Full product design**: market analysis, features, user flow, pricing, monetization, maintenance plan, launch checklist |

## Run it

No build step, no install:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
# → http://localhost:8080/index.html
```

Or deploy the folder as-is to Cloudflare Pages / Netlify / GitHub Pages (free tier) — that is the entire production architecture.

## Features (MVP)

- ⚡ Trip logging in ~10 seconds (odometer prefill, place suggestions, live km calc)
- 📊 Dashboard: business/private split, business share %, tax-savings estimate, 14-day chart
- 📄 **Monthly PDF export** generated 100% in the browser — all Pflichtangaben nach § 6 Abs. 1 Nr. 4 EStG, paginated, per-vehicle sections
- 💾 CSV export (German semicolon format), JSON backup/restore
- 🔒 100% client-side storage — no account, no server, no tracking (DSGVO-friendly by design)
- 💶 Freemium gating: Free (1 vehicle, 15 trips/month, CSV) → Pro €4.99/mo / €49/yr (unlimited + PDFs). Demo-mode checkout simulation; production wiring = Paddle/Lemon Squeezy checkout link (Merchant of Record handles EU VAT).

## Status & next steps

The upgrade flow is simulated (one line to swap for a real checkout URL). Before real launch: lawyer review of legal templates, real operator data in Impressum, and checkout wiring — see `docs/PRODUCT_DESIGN.md` §8 for the full launch checklist.
