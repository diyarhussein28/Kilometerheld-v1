# Kilometerheld — Product Design Document

**A passive-income SaaS for the German market**

| | |
|---|---|
| **Product** | Kilometerheld — digitales Fahrtenbuch (digital mileage log for the German tax office) |
| **Market** | Germany (DACH expansion possible) |
| **Price** | Free tier · **Pro €4.99/month** · **Pro Yearly €49/year** |
| **Cost to build** | **€0** (static site + client-side app, no backend, no dependencies) |
| **Cost to run** | ≈ **€15/year** (domain) + payment fees (~5–7% of revenue) |
| **Maintenance** | < 1 hour/month after launch |
| **Repo state** | Working MVP: landing page, full app, PDF generator, legal pages |

---

## 1. The idea: why a Fahrtenbuch?

### 1.1 The problem

In Germany, anyone who drives a company car (*Dienstwagen*) privately must pay tax on that private use. There are exactly two legal methods:

1. **1-%-Regelung (flat-rate rule):** 1% of the car's gross list price per month is treated as taxable income — **regardless of how little you actually drive privately**.
2. **Fahrtenbuchmethode (logbook method):** you document every trip; only your *actual* private share is taxed. It is legally required to be **lückenlos, zeitnah und in sich geschlossen** (complete, timely, self-consistent) — or the tax office rejects it and falls back to the 1% rule.

For anyone whose private share is under ~20–25% of kilometres, the logbook method saves hundreds to thousands of euros per year. **But the bookkeeping is painful and compliance is unforgiving** — which creates the willingness to pay.

### 1.2 Why people will pay **every month**

- The logbook is a **legal obligation, not a nice-to-have**: once you choose the Fahrtenbuchmethode, you must keep logging *every* trip, all year. The method cannot even be switched mid-year.
- **Monthly PDF export** is the product's natural recurring ritual: every month the user downloads the report for their tax advisor (Steuerberater). The subscription mirrors the legal rhythm.
- Existing solutions prove demand: **Vimcar charges €19.90–24.90/month** per vehicle (plus hardware/OBD box), **Driversnote charges €14/month or €150/year**. Kilometerheld deliberately undercuts them at **€4.99/month** with a simpler manual-entry product.

### 1.3 Why this beats the alternatives for a solo maker

| Criterion | Fahrtenbuch | USt-Voranmeldung tool | Invoicing tool | Generic habit tracker |
|---|---|---|---|---|
| Existing monthly payers | ✅ €14–25/month | ❌ accountants bundle it | ⚠ crowded (sevDesk, Lexware…) | ❌ churn-prone |
| Forced recurring usage | ✅ daily logging + monthly PDF | ⚠ 12×/year | ✅ | ❌ motivation dies |
| Buildable free | ✅ 100% client-side | ❌ needs ELSTER API (complex, certified) | ⚠ needs storage, PDFs, sync | ✅ but no moat |
| German-specific moat | ✅ tax law specific | ✅ | ⚠ | ❌ |
| Maintenance | ✅ ~0 | ⚠ API changes | ⚠ heavy | ✅ |

---

## 2. Market & competition

### 2.1 Market size (bottom-up)

- ~**5.9 million company cars** are registered in Germany; every one of them needs *either* the 1% rule *or* a logbook.
- A meaningful share of solo users (Selbstständige, Freiberufler, Handelsvertreter, consultants, doctors, craftspeople with a company car) find the 1% rule too expensive and need a logbook.
- **Conservative TAM:** 200,000–500,000 active logbook keepers in DE.
- **Realistic first-year target:** 250–500 paying subscribers (0.1–0.2% of TAM) → **€1,000–2,000 MRR**, which is fully passive income at near-zero cost.

### 2.2 Competitors & positioning

| Competitor | Price | Approach | Gap Kilometerheld exploits |
|---|---|---|---|
| Vimcar | €19.90–24.90/mo + OBD box | GPS/OBD automatic, fleet-focused, sales-driven | Overkill + pricey for solo drivers; hardware friction |
| Driversnote | €14/mo or €150/yr | Mobile app, GPS auto-tracking | Still €10/month more expensive; app-store dependency |
| mydrivelog, MileageWise, misc. | €5–15/mo | Manual/import hybrid | Weak German-language positioning, dated UX |
| Paper notebook | €0 | Manual | Painful, error-prone, rejected at audits |

**Positioning:** *"Das Fahrtenbuch für alle, die keine Flotten-Software brauchen"* — cheapest serious option, simplest UX, zero hardware, works everywhere in the browser. German-only product with German support.

### 2.3 Legal validation (why it's safe to build)

- Electronic logbooks are **explicitly equivalent to paper logbooks** when they contain the same mandatory information (BMF guidance; manual and electronic treated equally).
- Required per trip (§ 6 Abs. 1 Nr. 4 S. 3 EStG): **date, destination (with address/purpose of trip), purpose, odometer reading, business/private classification** — exactly the fields Kilometerheld collects and prints.
- Products like this cannot guarantee tax acceptance, so the marketing copy says *"mit allen Pflichtangaben"* instead of promising acceptance, and disclaims tax advice (see §6 AGB).

---

## 3. Product specification (v1 — built in this repo)

### 3.1 Core features

**App (`app.html`) — 100% client-side, zero backend:**

1. **10-second trip logging** — date, start, destination, purpose, odometer start/end, business/private toggle. Odometer start is prefilled from the last trip; suggestions (datalist) for frequent places and purposes. Total km computed live.
2. **Dashboard** — monthly KPIs: total km, business km, private km, **business share %**, estimated deductible share of vehicle costs, usage meter (free plan), 14-day business/private chart.
3. **Finanzamt-conforming monthly PDF** — generated entirely in the browser (custom ~200-line raw PDF writer, no libraries): header with driver/vehicle, monthly summary, full trip table with all mandatory fields, per-vehicle sections, page numbers, and the § 6 EStG reference line. Multi-page with proper pagination.
4. **Vehicle management** — multiple vehicles with plate + odometer, monthly stats per vehicle.
5. **CSV export** — semicolon-separated with BOM (German Excel convention) — free tier feature.
6. **Backup** — JSON export/import (all data is in localStorage; the app actively nudges users to back up).
7. **Lapse reminder** — banner when the last entry is > 3 days old ("Das Finanzamt liebt lückenlose Bücher").
8. **Free-plan gating** — 1 vehicle, 15 trips/month, CSV only. Pro unlocks unlimited everything + PDFs.

**Landing page (`index.html`)** — German copy, sections: hero with app mockup, "1%-Regelung vs. Fahrtenbuch" comparison, 3-step flow, 6-feature grid, PDF showcase, pricing, testimonials, FAQ, final CTA. Full copy in section 6.

**Legal pages** — Impressum, Datenschutz, AGB, Widerrufsbelehrung (template quality with clear placeholders — mandatory for German B2C, and a trust signal).

### 3.2 Non-goals for v1 (deliberately)

- GPS auto-tracking (complexity, battery, permissions — also *manual logs are legally fine*)
- Native iOS/Android apps (browser + PWA later)
- ELSTER/Datev integrations (accountant export is a v2 hook)
- User accounts (v1 key-based licensing — see §7)

### 3.3 User flow

```
Landing page → "Kostenlos starten" → App (no signup, instant value)
   │
   ├─ First run: demo data loaded → "Willkommen"-toast → profile wizard lite (settings form)
   ├─ Daily loop (10 s): "+ Fahrt erfassen" → date prefilled, odometer prefilled, place suggestions → save
   ├─ Weekly touchpoint: reminder banner if last entry > 3 days ago
   ├─ Monthly ritual: month view → "Monats-PDF" → blocked on Free → upgrade modal → pay → download PDF → forward to Steuerberater
   ├─ Upgrade triggers (contextual): PDF button · 16th trip of the month · 2nd vehicle · settings page
   └─ Kündigung: settings → downgrade → data kept → reactivation anytime
```

### 3.4 Conversion & retention mechanics built in

| Mechanic | Trigger | Why it works |
|---|---|---|
| Demo data | First visit | Instant "aha" — the dashboard looks alive in 0 seconds |
| PDF paywall | Monthly export moment | The moment of highest willingness to pay |
| Usage meter | Free plan | Visible scarcity ("12/15 Fahrten") without nagging |
| Reminder banner | >3 days no entry | Legal anxiety = engagement = retention |
| Tax savings estimate | Every dashboard visit | Continuous value proof ("€468/Monat absetzbar") |
| Data ownership | Settings + backup prompts | Honest differentiator vs. cloud competitors |

---

## 4. Pricing

| Plan | Price | Includes | Role |
|---|---|---|---|
| **Start** | €0 | 1 vehicle, 15 trips/month, CSV export, all core logging | Top-of-funnel, SEO magnet, word of mouth |
| **Pro (monthly)** | **€4.99/month** | Unlimited trips & vehicles, monthly PDF, backup, reminders, e-mail support | Main monetization (anchor plan) |
| **Pro (yearly)** | **€49/year** (= €4.08/mo) | All Pro features, ~17% discount | Cash-flow + lower churn; "2 Monate geschenkt" framing |

All prices incl. VAT (German law requires final prices incl. MwSt.). 14-day free trial on Pro. No credit card required to start free.

**Pricing logic:**
- Anchor against Vimcar (€24.90) and Driversnote (€14): we are 70–80% cheaper → impulse-purchase territory for a compliance tool.
- €4.99 under the psychological €5 line; yearly = "2 months free" is instantly understandable.
- One-person businesses can also deduct the subscription itself as business expense — worth mentioning in FAQ/support.

---

## 5. Monetization strategy (the passive-income engine)

### 5.1 Payment stack — zero backend, EU-VAT solved

- **Merchant of Record (recommended): Paddle or Lemon Squeezy.** They handle EU VAT (MOSS/OSS), invoicing, SEPA/cards/PayPal, and dunning — the painful parts of German B2C billing — for ~5% + €0.50 per transaction. No need to register for foreign VAT yourself.
- Implementation: static "Upgrade" button → hosted checkout URL (Paddle/Lemon Squeezy) → success page issues a **license key** → user pastes it in settings → Pro unlocked locally. The MVP in this repo simulates this flow (`confirmUpgrade`), with the live redirect being a one-line change.
- Alternative if you already have a GmbH/UG with USt-IdNr: Stripe Payment Links + Stripe Billing (1.5% + €0.25 for EU cards) — cheaper fees but *you* must file USt-Voranmeldungen yourself.

### 5.2 Revenue model scenarios (Paddle MoR fees ~6% incl. VAT handling)

| Pro subscribers | MRR (mix 70/30 monthly/yearly) | Net after fees | Annual |
|---|---|---|---|
| 100 | ~€455 | ~€428 | ~€5,100 |
| 250 | ~€1,140 | ~€1,070 | ~€12,800 |
| 500 | ~€2,275 | ~€2,140 | ~€25,700 |
| 1,000 | ~€4,550 | ~€4,280 | ~€51,300 |

Costs at 250 subs: domain €12/yr, hosting €0 (Cloudflare Pages/Netlify free tier), support time < 1 h/month. **> 90% contribution margin at any scale.**

### 5.3 Acquisition channels (in order of ROI for a solo maker)

1. **SEO (free, compounding):** The German SERPs are full of Steuerberater blogs that *link out* — target terms: "Fahrtenbuch App", "Fahrtenbuch PDF Vorlage", "Fahrtenbuch führen Anleitung", "1 Prozent Regelung oder Fahrtenbuch", "Fahrtenbuch kostenlos". Publish a German blog with calculator pages (e.g. "1%-Regelung vs. Fahrtenbuch Rechner" — link-bait with high intent).
2. **Content + YouTube:** "Fahrtenbuch richtig führen (Anleitung 2026)" — search volume is high every January when employees switch methods.
3. **Comparison/listings:** OMR Reviews, Appsumo (DE deals), Capterra, Trusted Shops, fahrtenbuch-specific blogs; Reddit r/selbststaendig and r/Finanzen (helpful answers, no spam).
4. **Paid (optional, late):** Google Ads on "fahrtenbuch app" (~€0.30–1 CPC, niche) with a €49 LTV-positive payback.
5. **Referral:** "Empfiehl Kilometerheld – du und dein Freund bekommen 1 Monat Pro" (manual coupon codes at v1 scale).

### 5.4 Passive-income mechanics checklist

- ✅ **No server to patch** — static hosting, generated PDFs client-side.
- ✅ **Self-serve onboarding** — no account creation, demo data, FAQ answers 90% of questions (support template for the rest).
- ✅ **Automated billing & dunning** via MoR (Paddle/Lemon Squeezy handle failed cards, expiries, VAT).
- ✅ **Monthly product ritual** (PDF export) drives organic re-engagement — minimal re-marketing needed.
- ✅ **One-time legal setup** (Impressum, AGB, DSGVO) — updates only when laws change.
- ⚠ **Yearly churn peak:** users sometimes drop the logbook when they sell the car or switch to 1% rule — counter with the yearly plan and a "pausieren" (pause) option in v1.1.

---

## 6. Landing page copy (implemented, in German)

The full German copy is live in `index.html`. Key copy decisions:

- **Headline:** *"Dein Fahrtenbuch. In 10 Sekunden pro Fahrt."* — the core promise (effort) + the trigger word.
- **Problem framing:** *"Die 1-%-Regelung frisst dein Geld. Das Fahrtenbuch rettet es."* — reframes a boring compliance tool as a money-saving device.
- **Concrete example** (60.000-€-Wagen → 600 € geldwerter Vorteil/Monat) — German buyers respond to exact numbers.
- **Price anchoring:** *"4,99 €/Monat statt 14–25 € bei den Großen"* — names competitors' prices (legal: comparative claims must be verifiable; cite sources in a footnote at launch).
- **Trust anchors:** "Made in Germany", "Keine Kreditkarte nötig", "Monatlich kündbar", "Daten bleiben bei dir" (privacy = DSGVO-friendly = German selling point).
- **Risk reversal:** 14 days free, data retained after downgrade, no-installation.
- **Legal safety:** copy says *"mit allen Pflichtangaben nach § 6 Abs. 1 Nr. 4 EStG"* — never promises tax acceptance; footer disclaims tax advice.

---

## 7. Technical architecture (why it costs €0 and stays up forever)

```
[Static host: Cloudflare Pages / Netlify / GitHub Pages — free tier]
    ├── index.html, app.html, legal pages        (plain HTML/CSS)
    ├── assets/app.js                            (vanilla JS, ~0 deps)
    │      ├── localStorage = the database       (user's own browser)
    │      ├── PDF writer = hand-rolled raw PDF  (no lib to maintain)
    │      └── license check = local flag/key    (set after checkout)
    └── [Payment: Paddle/Lemon Squeezy checkout] (only external system)
```

- **No backend, no database, no auth server** → nothing to hack, nothing to patch, no server costs, no data-protection exposure (the app literally never sees user data — a unique DSGVO story).
- **Trade-off (accepted):** data lives in the browser; users must back up. Mitigations: prominent backup exports, reminder to back up, v2 = optional encrypted sync as a Pro feature.
- **Risk:** localStorage data loss on browser reset. This is *also* the product's biggest privacy selling point — handled honestly in the FAQ.

### v2 roadmap (only if MRR justifies)

1. **PWA + offline** (installable, offline logging — low effort, high perceived value)
2. **License-key gating** (Paddle webhooks → key) — replaces demo simulation
3. **Optional encrypted cloud sync** (€1/mo add-on or Pro+) — retention + monetization
4. **Steuerberater-Export** (DATEV-friendly CSV/XLSX) — B2B2C distribution channel
5. **GPS auto-suggest** (browser geolocation, opt-in) — bridges to Driversnote users
6. **iBeacon/GPS lite hardware** — only if hardware margins ever make sense (likely never)

---

## 8. Launch checklist (≈ 2 weeks of evenings)

| # | Task | Effort |
|---|---|---|
| 1 | Register domain (kilometerheld.de or fallback: fahrtenheld.de, km-held.de) | 1 h |
| 2 | Deploy repo to Cloudflare Pages (free, EU data centers) | 1 h |
| 3 | Paddle/Lemon Squeezy account + products (€4.99/m, €49/y, 14-day trial) + tax settings | 3 h |
| 4 | Wire real checkout URLs into `confirmUpgrade` + license-key paste field | 2 h |
| 5 | Lawyer review: AGB, Widerruf, Datenschutz, Impressum (one-time ~€150–400 — the only real launch cost) | 1 h + fee |
| 6 | Ummeldung/Kleingewerbe beim Gewerbeamt (~€30) if operating as natural person | 1 h |
| 7 | Publish 3 SEO articles + calculator page; submit to directories | 6 h |
| 8 | Seed social proof: 10 beta users (Reddit/Facebook-Gruppen „Selbstständige") free for feedback + testimonials | 4 h |
| 9 | Set up support inbox + canned German answers | 2 h |
| 10 | Google Search Console + simple rank tracking | 1 h |

**Post-launch routine (the whole "maintenance"):** monthly — skim support inbox (canned answers), check MRR dashboard, update footer year in January, verify payment provider emails. That's it. ~1 hour/month.

---

## 9. Risks & mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Tax acceptance of electronic logbooks changes | Low | High | Copy disclaims advice; feature-complete logs already satisfy BMF requirements; monitor BMF letters |
| Competitor drops price | Medium | Medium | Our cost structure allows €0 floor (freemium); differentiators = privacy + simplicity |
| Browser data loss complaints | Medium | Low | Honest onboarding, backup exports, v2 cloud sync upsell |
| Churn when car is sold / year-end method switch | Medium | Medium | Yearly plan, pause option, "private car tracker" use case, reminders to renew in January |
| Germany consumer-law complexity | Medium | Medium | MoR handles VAT; lawyer-checked templates; support language = German |
| SEO takes 6+ months | High | Medium | Diversify: directories, YouTube, communities; paid ads optional |

---

## 10. Repository guide

| File | Purpose |
|---|---|
| `index.html` | German landing page (full conversion copy) |
| `app.html` | The Fahrtenbuch app shell (views, modals) |
| `assets/app.js` | All app logic + raw PDF generator + plan gating |
| `assets/styles.css` | Shared design system (landing + app) |
| `impressum.html`, `datenschutz.html`, `agb.html`, `widerruf.html` | German legal pages (templates with placeholders) |
| `docs/PRODUCT_DESIGN.md` | This document |

Run locally: any static server, e.g. `python3 -m http.server 8080` → open `/index.html`. There is no build step, no npm install, no environment config — deploy the folder as-is.
